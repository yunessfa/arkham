import uuid
from decimal import Decimal
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.utils import timezone
from django.db import transaction, connection
from django.db.models import Q, F, Min, Case, When, DecimalField, Sum, Count
from django.shortcuts import redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, status, permissions, serializers
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from drf_spectacular.types import OpenApiTypes
from rest_framework.views import APIView, exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.throttling import ScopedRateThrottle
from django.core.cache import cache
from .models import *
from .serializers import *
from .services import *
from .payments import GatewayUnavailable, GatewayRejected


def exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        exc = serializers.ValidationError(exc.messages)
    if isinstance(exc, (GatewayUnavailable, GatewayRejected)):
        return Response({"error": {"message": str(exc)}}, status=503)
    response = drf_exception_handler(exc, context)
    if response is not None:
        response.data = {"error": response.data}
    return response


class PublicRead(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]


class ProductView(PublicRead):
    serializer_class = ProductSerializer
    lookup_field = "slug"

    def get_queryset(self):
        now = timezone.now()
        p = self.request.query_params
        qs = (
            Product.objects.filter(active=True, category__active=True)
            .select_related("category")
            .prefetch_related("variants", "images")
        )
        effective = Case(
            When(
                variants__active=True,
                variants__sale_start__lte=now,
                variants__sale_end__gt=now,
                variants__sale_price__isnull=False,
                then=F("variants__sale_price"),
            ),
            default=F("variants__price"),
            output_field=DecimalField(),
        )
        qs = qs.annotate(min_price=Min(effective, filter=Q(variants__active=True)))
        if p.get("q"):
            qs = qs.filter(
                Q(name__icontains=p["q"][:180]) | Q(description__icontains=p["q"][:180])
            )
        if p.get("category"):
            qs = qs.filter(category__slug=p["category"])
        for name, op in [("min_price", "gte"), ("max_price", "lte")]:
            if p.get(name):
                try:
                    val = Decimal(p[name])
                    assert val.is_finite() and 0 <= val <= 10**14
                except Exception:
                    raise serializers.ValidationError("بازه قیمت معتبر نیست.")
                qs = qs.filter(**{"min_price__" + op: val})
        if p.get("weight"):
            try:
                weight = int(p["weight"])
            except ValueError:
                raise serializers.ValidationError("وزن معتبر نیست.")
            qs = qs.filter(variants__weight_g=weight, variants__active=True)
        if p.get("available") == "1":
            qs = qs.filter(
                variants__stock__gt=F("variants__reserved"), variants__active=True
            )
        if p.get("sale") == "1":
            qs = qs.filter(
                variants__sale_start__lte=now,
                variants__sale_end__gt=now,
                variants__sale_price__isnull=False,
                variants__active=True,
            )
        if p.get("featured") == "1":
            qs = qs.filter(featured=True)
        sort = p.get("sort", "newest")
        if sort == "bestselling":
            from django.db.models import OuterRef, Subquery

            sales = (
                OrderItem.objects.filter(
                    variant__product=OuterRef("pk"),
                    order__paid_at__isnull=False,
                    order__status__in=["paid", "processing", "shipped", "delivered"],
                )
                .values("variant__product")
                .annotate(qty=Sum("quantity"))
                .values("qty")
            )
            qs = qs.annotate(sold=Subquery(sales)).order_by(
                F("sold").desc(nulls_last=True), "-id"
            )
        else:
            qs = qs.order_by(
                {
                    "price": "min_price",
                    "-price": "-min_price",
                    "newest": "-created_at",
                }.get(sort, "-created_at"),
                "-id",
            )
        return qs.distinct()


class AssetView(PublicRead):
    queryset = SiteAsset.objects.filter(active=True).order_by("key")
    serializer_class = SiteAssetSerializer
    pagination_class = None


class CategoryView(PublicRead):
    queryset = Category.objects.filter(active=True)
    serializer_class = CategorySerializer
    pagination_class = None


class ContentView(PublicRead):
    queryset = SiteContent.objects.filter(published=True)
    serializer_class = SiteContentSerializer
    lookup_field = "key"
    pagination_class = None


class ArticleView(PublicRead):
    queryset = Article.objects.filter(published=True).order_by("-updated_at")
    serializer_class = ArticleSerializer
    lookup_field = "slug"


class ShippingView(PublicRead):
    queryset = ShippingMethod.objects.filter(active=True)
    serializer_class = ShippingSerializer
    pagination_class = None


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, r):
        u = r.user
        return Response(
            {
                "authenticated": u.is_authenticated,
                "user": (
                    {
                        "id": u.pk,
                        "username": u.username,
                        "first_name": u.first_name,
                        "is_staff": u.is_staff,
                        "permissions": sorted(u.get_all_permissions()),
                    }
                    if u.is_authenticated
                    else None
                ),
                "payment_provider": settings.PAYMENT_PROVIDER,
                "development": settings.DEBUG,
                "demo_mode": settings.DEMO_MODE or SiteContent.objects.filter(key="demo-notice", published=True).exists(),
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class AuthView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "sensitive"

    def post(self, r, kind):
        if kind == "logout":
            logout(r)
            return Response({"ok": True})
        old = r.session.session_key
        if kind == "register":
            s = RegisterSerializer(data=r.data)
            s.is_valid(raise_exception=True)
            with transaction.atomic():
                user = get_user_model().objects.create_user(**s.validated_data)
        elif kind == "login":
            s = LoginSerializer(data=r.data)
            s.is_valid(raise_exception=True)
            # Account-keyed limiter in addition to the remote-IP throttle.
            import hashlib

            k = (
                "login:"
                + hashlib.sha256(
                    s.validated_data["username"].lower().encode()
                ).hexdigest()
            )
            if cache.get(k, 0) >= 10:
                return Response(
                    {"error": "تلاش‌های ورود بیش از حد مجاز است؛ بعداً تلاش کنید."},
                    status=429,
                )
            user = authenticate(r, **s.validated_data)
            if not user:
                cache.add(k, 0, 900)
                cache.incr(k)
                return Response(
                    {"error": "نام کاربری یا رمز عبور درست نیست."}, status=400
                )
            cache.delete(k)
        else:
            return Response(status=404)
        merge_cart(user, old)
        login(r, user)
        return Response({"ok": True})


class AddressView(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Address.objects.none()
        return Address.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, s):
        s.save(user=self.request.user)


class CartView(APIView):
    permission_classes = [permissions.AllowAny]

    def payload(self, r):
        c = cart_for(r)
        data = []
        total = Decimal(0)
        for i in c.items.select_related("variant__product").order_by("id"):
            v = i.variant
            price = v.current_price
            total += price * i.quantity
            data.append(
                {
                    "variant": v.pk,
                    "product": v.product.name,
                    "slug": v.product.slug,
                    "weight_g": v.weight_g,
                    "quantity": i.quantity,
                    "price": str(price),
                    "available": v.available,
                    "line_total": str(price * i.quantity),
                    "active": v.active and v.product.active,
                }
            )
        return {"items": data, "subtotal": str(total), "currency": "IRT"}

    def get(self, r):
        return Response(self.payload(r))

    @method_decorator(csrf_protect)
    def post(self, r):
        s = CartInput(data=r.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        with transaction.atomic():
            c = cart_for(r)
            Cart.objects.select_for_update().get(pk=c.pk)
            if d["quantity"] == 0:
                # Removing an item must also work after its product was unpublished.
                c.items.filter(variant_id=d["variant"]).delete()
            else:
                v = Variant.objects.filter(
                    pk=d["variant"],
                    active=True,
                    product__active=True,
                    product__category__active=True,
                ).first()
                if not v:
                    raise serializers.ValidationError("محصول قابل خرید نیست.")
                if v.available < d["quantity"]:
                    raise serializers.ValidationError("موجودی کافی نیست.")
                CartItem.objects.update_or_create(
                    cart=c, variant=v, defaults={"quantity": d["quantity"]}
                )
        return Response(self.payload(r))


class OrderView(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Order.objects.none()
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("items")
            .select_related("payment")
        )

    def create(self, r):
        s = CheckoutSerializer(data=r.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        o = create_order(
            r.user,
            cart_for(r),
            d["address"],
            d["shipping"],
            d["idempotency_key"],
            d.get("coupon", ""),
        )
        return Response(OrderSerializer(o).data, status=201)

    @action(detail=True, methods=["post"])
    def pay(self, r, pk=None):
        self.get_object()
        url = start_payment(pk, r.user)
        if not url:
            return Response(
                {
                    "error": "پاسخ درگاه نامشخص است؛ پرداخت دوباره آغاز نشد. با پشتیبانی تماس بگیرید."
                },
                status=503,
            )
        return Response({"url": url})

    @action(detail=True, methods=["post"])
    def simulate(self, r, pk=None):
        o = self.get_object()
        if not settings.DEBUG or o.payment.provider != "mock":
            return Response(status=404)
        if not o.payment.authority:
            raise serializers.ValidationError("ابتدا پرداخت را آغاز کنید.")
        return Response(
            OrderSerializer(settle_payment(o.payment.authority, r.user)).data
        )

    @action(detail=True, methods=["post"])
    def cancel(self, r, pk=None):
        self.get_object()
        return Response(OrderSerializer(cancel_unstarted(pk, r.user)).data)

    @action(detail=True, methods=["get"])
    def invoice(self, r, pk=None):
        return invoice_response(self.get_object())


def invoice_response(o):
    from django.template.loader import render_to_string

    return HttpResponse(
        render_to_string("invoice.html", {"order": o, "items": o.items.all()})
    )


class Callback(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, r):
        a = r.query_params.get("Authority", "")
        p = Payment.objects.filter(authority=a, provider="zarinpal").first()
        if not p:
            return Response({"error": "تراکنش معتبر نیست."}, status=400)
        # Status in the browser is deliberately not trusted. Remote verification is authoritative.
        try:
            o = settle_payment(a)
        except (GatewayUnavailable, GatewayRejected):
            return redirect("/account?payment=unverified")
        return redirect("/orders/" + str(o.pk))


class ReviewView(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        q = Review.objects.filter(approved=True, product__active=True).select_related(
            "user"
        )
        if self.request.query_params.get("product"):
            q = q.filter(product_id=self.request.query_params["product"])
        return q.order_by("-created_at")

    def perform_create(self, s):
        s.save(user=self.request.user, approved=False)


class FavoriteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, r):
        return Response(
            ProductSerializer(
                Product.objects.filter(active=True, favorite__user=r.user)
                .prefetch_related("variants", "images")
                .select_related("category"),
                many=True,
            ).data
        )

    def post(self, r):
        s = serializers.IntegerField(min_value=1)
        pk = s.run_validation(r.data.get("product"))
        if not Product.objects.filter(pk=pk, active=True).exists():
            return Response(status=404)
        Favorite.objects.get_or_create(user=r.user, product_id=pk)
        return Response({"ok": True})

    def delete(self, r):
        pk = serializers.IntegerField(min_value=1).run_validation(r.data.get("product"))
        Favorite.objects.filter(user=r.user, product_id=pk).delete()
        return Response(status=204)


class NewsletterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "sensitive"

    @method_decorator(csrf_protect)
    def post(self, r):
        s = NewsletterSerializer(data=r.data)
        s.is_valid(raise_exception=True)
        Newsletter.objects.update_or_create(
            email=s.validated_data["email"].lower(),
            defaults={"active": True, "consent_at": timezone.now()},
        )
        return Response({"ok": True})

    def delete(self, r):
        if not r.user.is_authenticated:
            return Response(status=403)
        Newsletter.objects.filter(email__iexact=r.user.email).update(active=False)
        return Response(status=204)


class SupportView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "sensitive"

    @method_decorator(csrf_protect)
    def post(self, r):
        s = SupportSerializer(data=r.data)
        s.is_valid(raise_exception=True)
        s.save()
        return Response({"ok": True}, status=201)


class NotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, r):
        return Response(
            list(
                Notification.objects.filter(user=r.user)
                .order_by("-created_at")
                .values("id", "text", "read", "created_at")[:100]
            )
        )

    def post(self, r):
        pk = serializers.IntegerField(min_value=1).run_validation(r.data.get("id"))
        Notification.objects.filter(user=r.user, pk=pk).update(read=True)
        return Response({"ok": True})


class ModelPermissions(permissions.DjangoModelPermissions):
    perms_map = {
        **permissions.DjangoModelPermissions.perms_map,
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": ["%(app_label)s.view_%(model_name)s"],
    }

    def has_permission(self, r, v):
        return (
            r.user.is_authenticated and r.user.is_staff and super().has_permission(r, v)
        )


class AdminModelView(viewsets.ModelViewSet):
    permission_classes = [ModelPermissions]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def create(self, r, *args, **kwargs):
        if self.get_queryset().model in [Review, SupportMessage]:
            return Response(status=405)
        return super().create(r, *args, **kwargs)

    def perform_create(self, s):
        with transaction.atomic():
            obj = s.save()
            audit(self.request.user, "admin.created", obj)

    def perform_update(self, s):
        with transaction.atomic():
            # Serialize edits with stock reservation paths, not stale serializer instances.
            current = self.get_queryset().select_for_update().get(pk=s.instance.pk)
            s.instance = current
            obj = s.save()
            audit(self.request.user, "admin.updated", obj)


ADMIN_MODELS = {
    "assets": (SiteAsset, ()),
    "products": (Product, ()),
    "categories": (Category, ()),
    "variants": (Variant, ("stock", "reserved")),
    "images": (ProductImage, ()),
    "shipping": (ShippingMethod, ()),
    "coupons": (Coupon, ()),
    "articles": (Article, ()),
    "content": (SiteContent, ()),
    "reviews": (Review, ("product", "user", "rating", "text", "created_at")),
    "support": (SupportMessage, ("name", "email", "message", "created_at")),
}


class StockAdjust(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, r, pk):
        if not r.user.has_perm("store.change_variant"):
            return Response(status=403)
        delta = serializers.IntegerField(
            min_value=-100000, max_value=100000
        ).run_validation(r.data.get("delta"))
        reason = serializers.CharField(max_length=200, min_length=3).run_validation(
            r.data.get("reason")
        )
        with transaction.atomic():
            v = get_object_or_404(Variant.objects.select_for_update(), pk=pk)
            if v.stock + delta < v.reserved:
                raise serializers.ValidationError(
                    "موجودی از رزروهای فعال کمتر خواهد شد."
                )
            v.stock += delta
            v.save(update_fields=["stock"])
            InventoryMovement.objects.create(
                variant=v, delta=delta, reason=reason, actor=r.user
            )
            audit(r.user, "inventory.adjusted", v, {"delta": delta, "reason": reason})
        return Response({"stock": v.stock, "reserved": v.reserved})


class AdminOrderView(viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.all().select_related("payment").prefetch_related("items")
    serializer_class = OrderSerializer
    permission_classes = [ModelPermissions]

    def get_queryset(self):
        q = super().get_queryset()
        st = self.request.query_params.get("status")
        term = self.request.query_params.get("q")
        if st:
            q = q.filter(status=st)
        if term:
            try:
                q = q.filter(pk=uuid.UUID(term))
            except ValueError:
                q = q.filter(user__username__icontains=term[:150])
        return q

    @action(detail=True, methods=["post"])
    def transition(self, r, pk=None):
        self.get_object()
        if not r.user.has_perm("store.change_order"):
            return Response(status=403)
        s = serializers.CharField(max_length=20).run_validation(r.data.get("status"))
        tracking = serializers.CharField(
            max_length=120, allow_blank=True
        ).run_validation(r.data.get("tracking_code", ""))
        note = serializers.CharField(max_length=5000, allow_blank=True).run_validation(
            r.data.get("note", "")
        )
        return Response(OrderSerializer(transition(pk, r.user, s, tracking, note)).data)

    @action(detail=True, methods=["get"])
    def invoice(self, r, pk=None):
        return invoice_response(self.get_object())


class AdminAudit(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = admin_serializer(AuditLog)
    permission_classes = [ModelPermissions]


class AdminCustomers(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, r):
        if not r.user.has_perm("auth.view_user"):
            return Response(status=403)
        users = get_user_model().objects.filter(is_staff=False)
        if r.query_params.get("q"):
            users = users.filter(username__icontains=r.query_params["q"][:150])
        return Response(
            list(
                users.order_by("-date_joined").values(
                    "id", "username", "first_name", "email", "date_joined", "is_active"
                )[:100]
            )
        )


class Dashboard(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, r):
        if not r.user.has_perms(
            ["store.view_order", "store.view_variant", "auth.view_user"]
        ):
            return Response(status=403)
        paid = Order.objects.filter(paid_at__isnull=False).exclude(
            status__in=["review", "cancelled"]
        )
        today = timezone.localdate()
        return Response(
            {
                "paid_revenue": str(paid.aggregate(total=Sum("total"))["total"] or 0),
                "today_revenue": str(
                    paid.filter(paid_at__date=today).aggregate(total=Sum("total"))[
                        "total"
                    ]
                    or 0
                ),
                "orders": Order.objects.count(),
                "pending": Order.objects.filter(status="pending").count(),
                "shipped": Order.objects.filter(status="shipped").count(),
                "customers": get_user_model().objects.filter(is_staff=False).count(),
                "low_stock": list(
                    Variant.objects.filter(
                        active=True, stock__lte=F("reserved") + 5
                    ).values("id", "sku", "stock", "reserved")[:20]
                ),
                "daily_sales": list(
                    paid.extra(
                        select={"day": "date(paid_at AT TIME ZONE 'Asia/Tehran')"}
                    )
                    .values("day")
                    .annotate(revenue=Sum("total"))
                    .order_by("-day")[:30]
                ),
                "recent_orders": OrderSerializer(
                    Order.objects.all()[:8], many=True
                ).data,
            }
        )


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(r):
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
            c.fetchone()
        cache.set("health", "ok", 10)
        if cache.get("health") != "ok":
            raise RuntimeError()
    except Exception:
        return Response({"status": "unavailable"}, status=503)
    return Response({"status": "ok"})


# Explicit schemas for endpoints not backed by generic serializer views.
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from drf_spectacular.types import OpenApiTypes

SessionView = extend_schema_view(
    get=extend_schema(
        responses=OpenApiTypes.OBJECT,
        description="Current session, permissions and payment availability. Also sets the CSRF cookie.",
    )
)(SessionView)
AuthRequest = inline_serializer(
    "AuthRequest",
    fields={
        "username": serializers.CharField(required=False),
        "password": serializers.CharField(required=False, write_only=True),
        "email": serializers.EmailField(required=False),
        "first_name": serializers.CharField(required=False),
    },
)
AuthView = extend_schema_view(
    post=extend_schema(
        request=AuthRequest,
        responses=OpenApiTypes.OBJECT,
        description="kind: login, register or logout. All requests require a CSRF cookie/header, including anonymous login. Registration requires all four fields.",
    )
)(AuthView)
CartView = extend_schema_view(
    get=extend_schema(responses=OpenApiTypes.OBJECT),
    post=extend_schema(
        request=CartInput,
        responses=OpenApiTypes.OBJECT,
        description="Sets absolute quantity. A quantity of zero removes the item. Prices are never accepted from the browser.",
    ),
)(CartView)
OrderView = extend_schema_view(
    create=extend_schema(request=CheckoutSerializer, responses={201: OrderSerializer}),
    pay=extend_schema(request=None, responses=OpenApiTypes.OBJECT),
    simulate=extend_schema(
        request=None,
        responses=OrderSerializer,
        description="Development-only mock confirmation. Returns 404 in production.",
    ),
    cancel=extend_schema(request=None, responses=OrderSerializer),
    invoice=extend_schema(responses={(200, "text/html"): OpenApiTypes.STR}),
)(OrderView)
Callback = extend_schema_view(
    get=extend_schema(
        responses=OpenApiTypes.OBJECT,
        description="Gateway callback. Authority is matched to a persisted payment; status from the browser is ignored and the gateway is verified directly.",
    )
)(Callback)
FavoriteInput = inline_serializer(
    "FavoriteInput", fields={"product": serializers.IntegerField()}
)
FavoriteView = extend_schema_view(
    get=extend_schema(responses=ProductSerializer(many=True)),
    post=extend_schema(request=FavoriteInput, responses=OpenApiTypes.OBJECT),
    delete=extend_schema(request=FavoriteInput, responses={204: None}),
)(FavoriteView)
NewsletterView = extend_schema_view(
    post=extend_schema(request=NewsletterSerializer, responses=OpenApiTypes.OBJECT),
    delete=extend_schema(request=None, responses={204: None}),
)(NewsletterView)
SupportView = extend_schema_view(
    post=extend_schema(request=SupportSerializer, responses={201: OpenApiTypes.OBJECT})
)(SupportView)
NotificationInput = inline_serializer(
    "NotificationInput", fields={"id": serializers.IntegerField()}
)
NotificationView = extend_schema_view(
    get=extend_schema(responses=OpenApiTypes.OBJECT),
    post=extend_schema(request=NotificationInput, responses=OpenApiTypes.OBJECT),
)(NotificationView)
StockInput = inline_serializer(
    "StockInput",
    fields={"delta": serializers.IntegerField(), "reason": serializers.CharField()},
)
StockAdjust = extend_schema_view(
    post=extend_schema(request=StockInput, responses=OpenApiTypes.OBJECT)
)(StockAdjust)
TransitionInput = inline_serializer(
    "TransitionInput",
    fields={
        "status": serializers.ChoiceField(
            choices=["processing", "shipped", "delivered"]
        ),
        "tracking_code": serializers.CharField(required=False),
        "note": serializers.CharField(required=False),
    },
)
AdminOrderView = extend_schema_view(
    transition=extend_schema(request=TransitionInput, responses=OrderSerializer),
    invoice=extend_schema(responses={(200, "text/html"): OpenApiTypes.STR}),
)(AdminOrderView)
AdminCustomers = extend_schema_view(get=extend_schema(responses=OpenApiTypes.OBJECT))(
    AdminCustomers
)
Dashboard = extend_schema_view(get=extend_schema(responses=OpenApiTypes.OBJECT))(
    Dashboard
)
