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
    coupon = None
    discount = Decimal(0)
    now = timezone.now()
    if code:
        coupon = (
            Coupon.objects.select_for_update()
            .filter(
                code=code.strip().upper(),
                active=True,
                starts_at__lte=now,
                ends_at__gt=now,
            )
            .first()
        )
        if not coupon or coupon.minimum > subtotal:
            raise ValidationError("کد تخفیف معتبر نیست.")
        used = Order.objects.filter(coupon=coupon).exclude(
            status=Order.Status.CANCELLED
        )
        if (
            used.count() >= coupon.usage_limit
            or used.filter(user=user).count() >= coupon.per_user_limit
        ):
            raise ValidationError("سقف استفاده از تخفیف تکمیل شده است.")
        if coupon.kind == "percent":
            if coupon.value > 100:
                raise ValidationError("تنظیمات تخفیف نامعتبر است.")
            discount = (subtotal * coupon.value / 100).quantize(Decimal("1"))
        else:
            discount = min(subtotal, coupon.value)
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
