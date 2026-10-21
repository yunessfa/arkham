from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from PIL import Image, UnidentifiedImageError
from io import BytesIO
import uuid
from .models import *


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt", "position"]


class VariantSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(
        max_digits=14, decimal_places=0, read_only=True
    )
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = Variant
        fields = ["id", "sku", "weight_g", "price", "current_price", "available"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description"]


class ProductSerializer(serializers.ModelSerializer):
    variants = serializers.SerializerMethodField()
    images = ImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)

    @extend_schema_field(VariantSerializer(many=True))
    def get_variants(self, obj):
        return VariantSerializer(
            [v for v in obj.variants.all() if v.active], many=True
        ).data

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "description",
            "storage",
            "specifications",
            "featured",
            "seo_title",
            "meta_description",
            "variants",
            "images",
        ]


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        exclude = ["user"]


class ShippingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ["id", "name", "cost", "provinces"]


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["name", "sku", "weight_g", "quantity", "unit_price", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment_state = serializers.CharField(source="payment.state", read_only=True)
    payment_provider = serializers.CharField(source="payment.provider", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "address",
            "subtotal",
            "discount",
            "shipping",
            "total",
            "shipping_name",
            "tracking_code",
            "created_at",
            "expires_at",
            "paid_at",
            "items",
            "payment_state",
            "payment_provider",
        ]


class CheckoutSerializer(serializers.Serializer):
    address = serializers.IntegerField(min_value=1)
    shipping = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.UUIDField()
    coupon = serializers.CharField(max_length=40, required=False, allow_blank=True)


class CartInput(serializers.Serializer):
    variant = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=0, max_value=99)


class ReviewSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    def get_author(self, obj) -> str:
        return obj.user.first_name or "خریدار"

    class Meta:
        model = Review
        fields = ["id", "product", "rating", "text", "author", "created_at"]
        read_only_fields = ["author", "created_at"]

    def validate(self, data):
        user = self.context["request"].user
        p = data["product"]
        if (
            not p.active
            or not OrderItem.objects.filter(
                order__user=user,
                order__paid_at__isnull=False,
                order__status__in=["paid", "processing", "shipped", "delivered"],
                variant__product=p,
            ).exists()
        ):
            raise serializers.ValidationError(
                "ثبت نظر فقط پس از خرید این محصول امکان‌پذیر است."
            )
        if Review.objects.filter(user=user, product=p).exists():
            raise serializers.ValidationError("برای این محصول قبلاً نظر ثبت کرده‌اید.")
        return data


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["title", "slug", "excerpt", "body", "updated_at"]


class SiteContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteContent
        fields = ["key", "title", "body", "settings"]


class SupportSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportMessage
        fields = ["name", "email", "message"]


class NewsletterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    consent = serializers.BooleanField()

    def validate_consent(self, v):
        if not v:
            raise serializers.ValidationError("رضایت صریح الزامی است.")
        return v


class RegisterSerializer(serializers.Serializer):
    username = serializers.RegexField(r"^[a-zA-Z0-9_.@+-]{3,150}$")
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    password = serializers.CharField(write_only=True, max_length=128)

    def validate(self, d):
        from django.contrib.auth.password_validation import validate_password

        if get_user_model().objects.filter(username__iexact=d["username"]).exists():
            raise serializers.ValidationError("این نام کاربری قابل استفاده نیست.")
        if get_user_model().objects.filter(email__iexact=d["email"]).exists():
            raise serializers.ValidationError("این ایمیل قابل استفاده نیست.")
        u = get_user_model()(
            username=d["username"], email=d["email"], first_name=d["first_name"]
        )
        validate_password(d["password"], u)
        return d


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)


def admin_serializer(model, readonly=()):
    class S(serializers.ModelSerializer):
        class Meta:
            fields = "__all__"
            read_only_fields = readonly

        def validate(self, data):
            if model == Variant:
                price = data.get("price", getattr(self.instance, "price", 0))
                sale = data.get(
                    "sale_price", getattr(self.instance, "sale_price", None)
                )
                start = data.get(
                    "sale_start", getattr(self.instance, "sale_start", None)
                )
                end = data.get("sale_end", getattr(self.instance, "sale_end", None))
                if price <= 0 or (
                    sale is not None
                    and (
                        sale <= 0
                        or sale >= price
                        or not start
                        or not end
                        or start >= end
                    )
                ):
                    raise serializers.ValidationError("قیمت یا بازه تخفیف معتبر نیست.")
            if model == Coupon:
                kind = data.get("kind", getattr(self.instance, "kind", ""))
                value = data.get("value", getattr(self.instance, "value", 0))
                start = data.get("starts_at", getattr(self.instance, "starts_at", None))
                end = data.get("ends_at", getattr(self.instance, "ends_at", None))
                if (
                    value <= 0
                    or (kind == "percent" and value > 100)
                    or not start
                    or not end
                    or start >= end
                ):
                    raise serializers.ValidationError("تنظیمات تخفیف معتبر نیست.")
                if "code" in data:
                    data["code"] = data["code"].strip().upper()
            if (
                model == Product
                and "specifications" in data
                and not isinstance(data["specifications"], dict)
            ):
                raise serializers.ValidationError("مشخصات باید یک شیء JSON باشد.")
            if (
                model == ShippingMethod
                and "provinces" in data
                and (
                    not isinstance(data["provinces"], list)
                    or not all(isinstance(s, str) for s in data["provinces"])
                )
            ):
                raise serializers.ValidationError(
                    "استان‌ها باید آرایه‌ای از نام استان‌ها باشند."
                )
            if (
                model == SiteContent
                and "settings" in data
                and not isinstance(data["settings"], dict)
            ):
                raise serializers.ValidationError("تنظیمات باید یک شیء JSON باشد.")
            if model == SiteContent:
                from .design import DESIGN_KEY, validate_design
                old_key = getattr(self.instance, "key", None)
                key = data.get("key", old_key)
                if old_key == DESIGN_KEY and key != DESIGN_KEY:
                    raise serializers.ValidationError("کلید تنظیمات طراحی قابل تغییر نیست.")
                if key == DESIGN_KEY:
                    validate_design(data.get("settings", getattr(self.instance, "settings", {})))
            return data

        def validate_image(self, f):
            if f.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("حداکثر حجم تصویر ۵ مگابایت است.")
            try:
                im = Image.open(f)
                if (
                    im.format not in ("JPEG", "PNG", "WEBP")
                    or im.width * im.height > 20000000
                ):
                    raise ValueError()
                im.load()
                im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
                im.thumbnail((2400, 2400))
                out = BytesIO()
                im.save(out, "WEBP", quality=88)
                return ContentFile(out.getvalue(), name=uuid.uuid4().hex + ".webp")
            except (
                UnidentifiedImageError,
                ValueError,
                OSError,
                Image.DecompressionBombError,
            ):
                raise serializers.ValidationError("تصویر معتبر نیست.")

    S.__name__ = model.__name__ + "ManagementSerializer"
    S.__qualname__ = S.__name__
    S.Meta.model = model
    return S


class SiteAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteAsset
        fields = ["id", "key", "image", "alt"]
