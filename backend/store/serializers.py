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
        fields = [
            "id",
            "sku",
            "weight_g",
            "price",
            "current_price",
            "available",
            "discount_percent",
        ]

    discount_percent = serializers.SerializerMethodField()

    def get_discount_percent(self, v) -> int:
        current = v.current_price
        if not v.price or current >= v.price:
            return 0
        return int(round((v.price - current) * 100 / v.price))


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
            "rating",
        ]

    rating = serializers.SerializerMethodField()

    def get_rating(self, obj) -> dict:
        avg = getattr(obj, "rating_avg", None)
        return {
            "average": round(avg, 1) if avg else None,
            "count": getattr(obj, "rating_count", None) or 0,
        }


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        exclude = ["user"]

    def to_internal_value(self, data):
        from .text import latin_digits, normalize_fa, normalize_phone

        if hasattr(data, "copy"):
            data = data.copy()
        for key in ("recipient", "province", "city", "street"):
            if key in data and isinstance(data[key], str):
                data[key] = normalize_fa(data[key])
        if isinstance(data.get("phone"), str):
            data["phone"] = normalize_phone(data["phone"]) or latin_digits(data["phone"])
        if isinstance(data.get("postal_code"), str):
            data["postal_code"] = "".join(
                c for c in latin_digits(data["postal_code"]) if c.isdigit()
            )
        return super().to_internal_value(data)

    def validate_province(self, value):
        from .iran import PROVINCES

        if value not in PROVINCES:
            raise serializers.ValidationError("استان را از فهرست انتخاب کنید.")
        return value


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


class QuoteSerializer(serializers.Serializer):
    shipping = serializers.IntegerField(min_value=1, required=False)
    address = serializers.IntegerField(min_value=1, required=False)
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
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    first_name = serializers.CharField(max_length=100)
    password = serializers.CharField(write_only=True, max_length=128)

    def to_internal_value(self, data):
        # Mobile numbers typed with Persian digits become the username as-is.
        if hasattr(data, "copy"):
            data = data.copy()
            data["username"] = str(data.get("username", "")).translate(
                str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
            ).strip()
        return super().to_internal_value(data)

    def validate(self, d):
        from django.contrib.auth.password_validation import validate_password

        d["email"] = (d.get("email") or "").strip().lower()
        if get_user_model().objects.filter(username__iexact=d["username"]).exists():
            raise serializers.ValidationError("این نام کاربری قابل استفاده نیست.")
        if d["email"] and get_user_model().objects.filter(email__iexact=d["email"]).exists():
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


import re as _re

PHONE_RE = _re.compile(r"^09[0-9]{9}$")
_PREF_CHOICES = {
    "purposes": {"daily", "gift", "wellness", "kids", "tea"},
    "tastes": {"mild", "floral", "herbal", "bold", "fruity"},
    "colors": {"light", "amber", "dark"},
}


def _latin(value):
    return str(value or "").translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))


class ProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, min_length=2, trim_whitespace=True)
    last_name = serializers.CharField(max_length=150, allow_blank=True, trim_whitespace=True)
    email = serializers.EmailField(allow_blank=True)
    phone = serializers.CharField(max_length=16, allow_blank=True)
    birthday = serializers.CharField(max_length=5, allow_blank=True)
    preferences = serializers.DictField()
    marketing = serializers.BooleanField()
    complete = serializers.BooleanField()

    def validate_email(self, v):
        v = v.strip().lower()
        if v and get_user_model().objects.filter(email__iexact=v).exclude(pk=self.context["user"].pk).exists():
            raise serializers.ValidationError("این ایمیل برای حساب دیگری ثبت شده است.")
        return v

    def validate_phone(self, v):
        v = _latin(v).replace(" ", "").replace("-", "")
        if v.startswith("+98"):
            v = "0" + v[3:]
        if v and not PHONE_RE.match(v):
            raise serializers.ValidationError("شمارهٔ موبایل را به شکل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.")
        return v

    def validate_birthday(self, v):
        v = _latin(v)
        if v and not _re.match(r"^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$", v):
            raise serializers.ValidationError("روز و ماه تولد معتبر نیست.")
        if v and int(v[:2]) > 6 and int(v[3:]) > 30:
            raise serializers.ValidationError("ماه‌های دوم سال ۳۰ روزه‌اند.")
        return v

    def validate_preferences(self, v):
        from .catalog import NEEDS

        allowed = dict(_PREF_CHOICES, needs=set(NEEDS))
        clean = {}
        for key, values in v.items():
            if key in allowed:
                if not isinstance(values, list) or not set(values) <= allowed[key] or len(values) > 12:
                    raise serializers.ValidationError("گزینه‌های سلیقه معتبر نیستند.")
                clean[key] = sorted(set(values))
            elif key == "weight":
                if str(values) not in {"", "500", "650", "1000"}:
                    raise serializers.ValidationError("وزن انتخابی معتبر نیست.")
                clean[key] = str(values)
            elif key == "budget":
                if values not in {"", "low", "mid", "high"}:
                    raise serializers.ValidationError("بودجه انتخابی معتبر نیست.")
                clean[key] = values
            elif key == "favorites":
                if not isinstance(values, list) or len(values) > 12 or not all(isinstance(x, str) and len(x) <= 60 for x in values):
                    raise serializers.ValidationError("فهرست عسل‌های محبوب معتبر نیست.")
                clean[key] = values
        return clean
