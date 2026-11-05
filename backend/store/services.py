import uuid
from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.conf import settings
from .models import *
from .payments import gateway, GatewayUnavailable, GatewayRejected
from .text import latin_digits, normalize_phone


def audit(actor, action, obj, detail=None):
    AuditLog.objects.create(
        actor=actor if actor and actor.is_authenticated else None,
        action=action,
        object_type=obj.__class__.__name__,
        object_id=str(obj.pk),
        detail=detail or {},
    )


def cart_for(request):
    if request.user.is_authenticated:
        return Cart.objects.get_or_create(user=request.user)[0]
    if not request.session.session_key:
        request.session.create()
    return Cart.objects.get_or_create(session_key=request.session.session_key)[0]


@transaction.atomic
def merge_cart(user, session_key):
    if not session_key:
        return
    guest = Cart.objects.select_for_update().filter(session_key=session_key).first()
    if not guest:
        return
    target, _ = Cart.objects.get_or_create(user=user)
    Cart.objects.select_for_update().get(pk=target.pk)
    for item in guest.items.all():
        existing = target.items.filter(variant=item.variant).first()
        if existing:
            existing.quantity = min(99, existing.quantity + item.quantity)
            existing.save()
        else:
            item.cart = target
            item.save()
    guest.delete()


def find_coupon(code, lock=False):
    code = latin_digits(code).strip()
    if not code:
        return None
    now = timezone.now()
    qs = Coupon.objects.select_for_update() if lock else Coupon.objects
    # Codes are stored upper-case by the panel; iexact also covers django-admin rows.
    return qs.filter(
        code__iexact=code, active=True, starts_at__lte=now, ends_at__gt=now
    ).first()


def apply_coupon(user, code, subtotal, lock=False):
    """Return (coupon, discount). Raises ValidationError with a customer message."""
    if not (code or "").strip():
        return None, Decimal(0)
    coupon = find_coupon(code, lock=lock)
    if not coupon:
        raise ValidationError("کد تخفیف معتبر نیست.")
    if coupon.minimum > subtotal:
        raise ValidationError(
            "این کد برای خرید از "
            + f"{int(coupon.minimum):,}"
            + " تومان به بالا فعال می‌شود."
        )
    used = Order.objects.filter(coupon=coupon).exclude(status=Order.Status.CANCELLED)
    if used.count() >= coupon.usage_limit or (
        user is not None
        and user.is_authenticated
        and used.filter(user=user).count() >= coupon.per_user_limit
    ):
        raise ValidationError("سقف استفاده از تخفیف تکمیل شده است.")
    if coupon.kind == "percent":
        if coupon.value > 100:
            raise ValidationError("تنظیمات تخفیف نامعتبر است.")
        return coupon, (subtotal * coupon.value / 100).quantize(Decimal("1"))
    return coupon, min(subtotal, coupon.value)


def quote_cart(user, cart, shipping_id=None, address_id=None, code=""):
    """Read-only price preview for checkout. Never reserves stock or uses a coupon.

    The final amount is still recomputed under row locks by create_order.
    """
    items = list(
        cart.items.select_related("variant__product__category").order_by("variant_id")
    )
    subtotal = Decimal(0)
    problems = []
    for i in items:
        v = i.variant
        if not (v.active and v.product.active and v.product.category.active):
            problems.append(v.product.name + " دیگر قابل خرید نیست.")
        elif v.available < i.quantity:
            problems.append(
                "از " + v.product.name + " فقط " + str(max(0, v.available)) + " عدد موجود است."
            )
        subtotal += v.current_price * i.quantity
    shipping_cost = None
    shipping_error = ""
    if shipping_id:
        method = ShippingMethod.objects.filter(pk=shipping_id, active=True).first()
        if not method:
            shipping_error = "روش ارسال معتبر نیست."
        else:
            shipping_cost = method.cost
            if address_id and method.provinces and user and user.is_authenticated:
                a = Address.objects.filter(pk=address_id, user=user).first()
                if a and a.province not in method.provinces:
                    shipping_error = "این روش ارسال به استان " + a.province + " نمی‌رسد."
    coupon_state = {"code": "", "valid": False, "message": ""}
    discount = Decimal(0)
    if (code or "").strip():
        try:
            coupon, discount = apply_coupon(user, code, subtotal)
            coupon_state = {
                "code": coupon.code,
                "valid": True,
                "message": "کد تخفیف اعمال شد.",
            }
        except ValidationError as exc:
            detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
            coupon_state = {"code": code.strip(), "valid": False, "message": str(detail)}
    total = subtotal - discount + (shipping_cost or 0)
    return {
        "count": sum(i.quantity for i in items),
        "subtotal": str(subtotal),
        "discount": str(discount),
        "shipping": None if shipping_cost is None else str(shipping_cost),
        "total": str(max(Decimal(0), total)),
        "coupon": coupon_state,
        "shipping_error": shipping_error,
        "problems": problems,
        "ready": bool(items) and not problems and shipping_cost is not None and not shipping_error,
        "currency": "IRT",
    }


@transaction.atomic
def create_order(user, cart, address_id, shipping_id, key, code=""):
    # Serializing per-customer eliminates duplicate orders for one idempotency key.
    from django.contrib.auth import get_user_model

    get_user_model().objects.select_for_update().get(pk=user.pk)
    old = Order.objects.filter(user=user, idempotency_key=key).first()
    if old:
        return old
    gateway(
        settings.PAYMENT_PROVIDER
    )  # Fail closed before reserving if payments disabled.
    cart = Cart.objects.select_for_update().get(pk=cart.pk)
    items = list(cart.items.select_related("variant__product").order_by("variant_id"))
    if not items:
        raise ValidationError("سبد خرید خالی است.")
    address = Address.objects.filter(pk=address_id, user=user).first()
    shipping = ShippingMethod.objects.filter(pk=shipping_id, active=True).first()
    if not address or not shipping:
        raise ValidationError("آدرس یا روش ارسال معتبر نیست.")
    if shipping.provinces and address.province not in shipping.provinces:
        raise ValidationError("ارسال به این استان پشتیبانی نمی‌شود.")
    variants = {
        v.pk: v
        for v in Variant.objects.select_for_update()
        .filter(pk__in=[i.variant_id for i in items])
        .select_related("product__category")
        .order_by("pk")
    }
    subtotal = Decimal(0)
    for i in items:
        v = variants[i.variant_id]
        if (
            not v.active
            or not v.product.active
            or not v.product.category.active
            or v.available < i.quantity
        ):
            raise ValidationError(
                "موجودی محصول کافی نیست یا محصول غیرفعال است: " + v.product.name
            )
        subtotal += v.current_price * i.quantity
    now = timezone.now()
    coupon, discount = apply_coupon(user, code, subtotal, lock=True)
    snapshot = {
        k: getattr(address, k)
        for k in ["recipient", "phone", "province", "city", "street", "postal_code"]
    }
    order = Order.objects.create(
        user=user,
        idempotency_key=key,
        address=snapshot,
        subtotal=subtotal,
        discount=discount,
        shipping=shipping.cost,
        total=subtotal - discount + shipping.cost,
        shipping_name=shipping.name,
        coupon=coupon,
        expires_at=now + timedelta(minutes=20),
    )
    if order.total <= 0:
        raise ValidationError("مبلغ پرداخت باید مثبت باشد.")
    for i in items:
        v = variants[i.variant_id]
        price = v.current_price
        OrderItem.objects.create(
            order=order,
            variant=v,
            name=v.product.name,
            sku=v.sku,
            weight_g=v.weight_g,
            quantity=i.quantity,
            unit_price=price,
            line_total=price * i.quantity,
        )
        v.reserved += i.quantity
        v.save(update_fields=["reserved"])
    Payment.objects.create(
        order=order, provider=settings.PAYMENT_PROVIDER, amount_toman=order.total
    )
    cart.items.all().delete()
    audit(user, "order.created", order)
    return order


@transaction.atomic
def start_payment(order_id, user):
    o = Order.objects.select_for_update().get(pk=order_id, user=user)
    p = Payment.objects.select_for_update().get(order=o)
    if p.provider != "mock" and o.items.filter(sku__startswith="DEMO-").exists():
        raise ValidationError("پرداخت واقعی برای محصولات دمو مجاز نیست.")
    if (
        o.status != "pending"
        or not o.inventory_reserved
        or o.expires_at <= timezone.now()
    ):
        raise ValidationError("این سفارش قابل پرداخت نیست؛ با پشتیبانی تماس بگیرید.")
    if p.authority:
        return (
            "/checkout?order=" + str(o.pk)
            if p.provider == "mock"
            else "https://payment.zarinpal.com/pg/StartPay/" + p.authority
        )
    if p.state not in ["new"]:
        raise ValidationError("وضعیت پرداخت نیازمند بررسی است؛ درخواست جدید ارسال نشد.")
    # Persist ambiguous state even on a remote timeout; never retry blindly.
    p.state = "requesting"
    p.save(update_fields=["state"])
    try:
        a, url = gateway(p.provider).request(p)
    except (GatewayUnavailable, GatewayRejected) as exc:
        p.state = "unknown"
        p.save(update_fields=["state"])
        return None
    p.authority = a
    p.state = "pending"
    p.save()
    audit(user, "payment.started", o)
    return url


@transaction.atomic
def settle_payment(authority, actor=None):
    # All payment paths acquire locks in the same order: order -> payment -> variants.
    payment = Payment.objects.get(authority=authority)
    o = Order.objects.select_for_update().get(pk=payment.order_id)
    p = Payment.objects.select_for_update().get(pk=payment.pk)
    if p.state == "succeeded":
        return o
    if not p.authority:
        raise ValidationError("تراکنش شروع نشده است.")
    if p.amount_toman != o.total:
        raise ValidationError("مغایرت مبلغ سفارش و تراکنش؛ بررسی مالی لازم است.")
    ref = gateway(p.provider).verify(p)
    p.reference = ref
    p.state = "succeeded"
    p.save()
    if not o.inventory_reserved or o.status != "pending":
        o.status = "review"
        o.save(update_fields=["status"])
        audit(actor, "payment.review_required", o)
        return o
    for i in o.items.order_by("variant_id"):
        v = Variant.objects.select_for_update().get(pk=i.variant_id)
        if v.stock < i.quantity or v.reserved < i.quantity:
            raise ValidationError("مغایرت موجودی؛ بررسی مالی لازم است.")
        v.stock -= i.quantity
        v.reserved -= i.quantity
        v.save(update_fields=["stock", "reserved"])
        InventoryMovement.objects.create(
            variant=v,
            order=o,
            delta=-i.quantity,
            reason="paid order",
            actor=actor if actor and actor.is_authenticated else None,
        )
    o.status = "paid"
    o.paid_at = timezone.now()
    o.inventory_reserved = False
    o.save()
    Notification.objects.create(
        user=o.user, text="پرداخت سفارش " + str(o.pk) + " تأیید شد."
    )
    audit(actor, "payment.verified", o)
    return o


@transaction.atomic
def cancel_unstarted(order_id, user):
    o = Order.objects.select_for_update().get(pk=order_id, user=user)
    p = Payment.objects.select_for_update().get(order=o)
    if o.status != "pending" or p.state != "new":
        raise ValidationError(
            "پرداخت شروع‌شده یا نامشخص فقط پس از تطبیق با درگاه قابل لغو است."
        )
    for i in o.items.order_by("variant_id"):
        v = Variant.objects.select_for_update().get(pk=i.variant_id)
        v.reserved -= i.quantity
        v.save(update_fields=["reserved"])
    o.inventory_reserved = False
    o.status = "cancelled"
    o.save()
    audit(user, "order.cancelled", o)
    return o


@transaction.atomic
def transition(order_id, actor, status, tracking="", note=""):
    o = Order.objects.select_for_update().get(pk=order_id)
    allowed = {
        "paid": ["processing"],
        "processing": ["shipped"],
        "shipped": ["delivered"],
    }
    if status not in allowed.get(o.status, []):
        raise ValidationError("تغییر وضعیت مجاز نیست.")
    if status == "shipped" and not tracking.strip():
        raise ValidationError("کد رهگیری الزامی است.")
    previous = o.status
    o.status = status
    o.tracking_code = tracking
    o.internal_note = note
    o.save()
    audit(actor, "order.transition", o, {"from": previous, "to": status})
    Notification.objects.create(
        user=o.user, text="وضعیت سفارش: " + o.get_status_display()
    )
    return o


# ---------------------------------------------------------------- phone login
import hmac
import hashlib
import secrets


def _otp_hash(phone, code):
    return hmac.new(
        settings.SECRET_KEY.encode(), (phone + ":" + code).encode(), hashlib.sha256
    ).hexdigest()


def issue_login_code(raw_phone):
    """Create and send a 5-digit code. Returns (phone, code, wait_seconds)."""
    from . import sms

    phone = normalize_phone(raw_phone)
    if not phone:
        raise ValidationError("شمارهٔ موبایل را به شکل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.")
    if not sms.enabled():
        raise ValidationError("ورود با موبایل هنوز فعال نشده است.")
    now = timezone.now()
    recent = PhoneOTP.objects.filter(phone=phone, created_at__gte=now - timedelta(hours=1))
    last = recent.first()
    if last and (now - last.created_at).total_seconds() < settings.OTP_RESEND_SECONDS:
        wait = settings.OTP_RESEND_SECONDS - int((now - last.created_at).total_seconds())
        raise ValidationError("برای ارسال دوبارهٔ کد " + str(wait) + " ثانیه صبر کنید.")
    if recent.count() >= settings.OTP_MAX_PER_HOUR:
        raise ValidationError("تعداد درخواست کد زیاد است؛ کمی بعد دوباره تلاش کنید.")
    code = "".join(secrets.choice("0123456789") for _ in range(5))
    PhoneOTP.objects.filter(phone=phone, consumed=False).update(consumed=True)
    PhoneOTP.objects.create(
        phone=phone,
        code_hash=_otp_hash(phone, code),
        expires_at=now + timedelta(seconds=settings.OTP_TTL_SECONDS),
    )
    try:
        sms.send_login_code(phone, code)
    except sms.SmsUnavailable:
        PhoneOTP.objects.filter(phone=phone, consumed=False).update(consumed=True)
        raise ValidationError("ارسال پیامک ممکن نشد؛ چند دقیقهٔ دیگر تلاش کنید.")
    return phone, code, settings.OTP_RESEND_SECONDS


def verify_login_code(raw_phone, raw_code, first_name=""):
    """Return (user, created). Wrong codes count against the latest active code.

    The attempt counter is committed before the error is raised, so a failed
    guess is never rolled back by the surrounding request transaction.
    """
    from django.contrib.auth import get_user_model

    phone = normalize_phone(raw_phone)
    code = "".join(ch for ch in latin_digits(raw_code) if ch.isdigit())
    if not phone or len(code) != 5:
        raise ValidationError("کد ۵ رقمی را کامل وارد کنید.")
    error = ""
    with transaction.atomic():
        otp = (
            PhoneOTP.objects.select_for_update()
            .filter(phone=phone, consumed=False, expires_at__gt=timezone.now())
            .first()
        )
        if not otp or otp.attempts >= settings.OTP_MAX_ATTEMPTS:
            error = "کد منقضی شده است؛ کد جدید بگیرید."
        elif not hmac.compare_digest(otp.code_hash, _otp_hash(phone, code)):
            otp.attempts += 1
            otp.consumed = otp.attempts >= settings.OTP_MAX_ATTEMPTS
            otp.save(update_fields=["attempts", "consumed"])
            error = "کد واردشده درست نیست."
        else:
            otp.consumed = True
            otp.save(update_fields=["consumed"])
    if error:
        raise ValidationError(error)
    with transaction.atomic():
        User = get_user_model()
        user = User.objects.select_for_update().filter(username=phone).first()
        created = False
        if user is None:
            user = User(username=phone, first_name=(first_name or "").strip()[:100])
            user.set_unusable_password()
            user.save()
            created = True
        elif not user.is_active:
            raise ValidationError("این حساب غیرفعال است؛ با پشتیبانی تماس بگیرید.")
        elif first_name and not user.first_name:
            user.first_name = first_name.strip()[:100]
            user.save(update_fields=["first_name"])
        audit(user, "auth.phone_login", user, {"created": created})
    return user, created
