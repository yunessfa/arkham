import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.db.models import Q, F
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.utils import timezone

money = {"max_digits": 14, "decimal_places": 0, "validators": [MinValueValidator(0)]}


class Category(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=180)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products"
    )
    description = models.TextField(blank=True)
    storage = models.TextField(blank=True)
    specifications = models.JSONField(default=dict, blank=True)
    active = models.BooleanField(default=False)
    featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    seo_title = models.CharField(max_length=180, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.name


class Variant(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="variants"
    )
    sku = models.CharField(max_length=64, unique=True)
    weight_g = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(**money)
    sale_price = models.DecimalField(**money, null=True, blank=True)
    sale_start = models.DateTimeField(null=True, blank=True)
    sale_end = models.DateTimeField(null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    reserved = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(reserved__lte=F("stock")), name="reservation_within_stock"
            ),
            models.CheckConstraint(condition=Q(price__gt=0), name="price_positive"),
            models.CheckConstraint(
                condition=Q(sale_price__isnull=True)
                | Q(sale_price__gt=0, sale_price__lt=F("price")),
                name="valid_sale_price",
            ),
        ]

    @property
    def current_price(self):
        n = timezone.now()
        return (
            self.sale_price
            if self.sale_price is not None
            and self.sale_start
            and self.sale_end
            and self.sale_start <= n < self.sale_end
            else self.price
        )

    @property
    def available(self):
        return self.stock - self.reserved

    def __str__(self):
        return self.sku


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="products/%Y/%m/")
    alt = models.CharField(max_length=180)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]


class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses"
    )
    recipient = models.CharField(max_length=120)
    phone = models.CharField(
        max_length=11, validators=[RegexValidator(r"^09[0-9]{9}$")]
    )
    province = models.CharField(max_length=80)
    city = models.CharField(max_length=80)
    street = models.CharField(max_length=600)
    postal_code = models.CharField(
        max_length=10, validators=[RegexValidator(r"^[0-9]{10}$")]
    )


class ShippingMethod(models.Model):
    name = models.CharField(max_length=120)
    cost = models.DecimalField(**money)
    active = models.BooleanField(default=True)
    provinces = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.name


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE
    )
    session_key = models.CharField(max_length=40, unique=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
    quantity = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(99)]
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "variant"], name="one_variant_per_cart"
            )
        ]


class Coupon(models.Model):
    code = models.CharField(max_length=40, unique=True)
    kind = models.CharField(
        max_length=10, choices=[("percent", "درصدی"), ("fixed", "مبلغ ثابت")]
    )
    value = models.DecimalField(**money)
    minimum = models.DecimalField(**money, default=0)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    usage_limit = models.PositiveIntegerField(default=1)
    per_user_limit = models.PositiveIntegerField(default=1)
    active = models.BooleanField(default=True)


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار پرداخت"
        PAID = "paid", "پرداخت‌شده"
        PROCESSING = "processing", "در حال آماده‌سازی"
        SHIPPED = "shipped", "ارسال‌شده"
        DELIVERED = "delivered", "تحویل‌شده"
        CANCELLED = "cancelled", "لغوشده"
        REVIEW = "review", "نیازمند بررسی مالی"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders"
    )
    idempotency_key = models.UUIDField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    address = models.JSONField()
    subtotal = models.DecimalField(**money)
    discount = models.DecimalField(**money, default=0)
    shipping = models.DecimalField(**money)
    total = models.DecimalField(**money)
    shipping_name = models.CharField(max_length=120)
    coupon = models.ForeignKey(Coupon, on_delete=models.PROTECT, null=True, blank=True)
    tracking_code = models.CharField(max_length=120, blank=True)
    internal_note = models.TextField(blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    inventory_reserved = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "idempotency_key"], name="order_idempotency"
            )
        ]


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(Variant, on_delete=models.PROTECT)
    name = models.CharField(max_length=180)
    sku = models.CharField(max_length=64)
    weight_g = models.PositiveIntegerField()
    quantity = models.PositiveSmallIntegerField()
    unit_price = models.DecimalField(**money)
    line_total = models.DecimalField(**money)


class Payment(models.Model):
    order = models.OneToOneField(
        Order, on_delete=models.PROTECT, related_name="payment"
    )
    provider = models.CharField(max_length=20)
    authority = models.CharField(max_length=100, unique=True, null=True, blank=True)
    reference = models.CharField(max_length=100, unique=True, null=True, blank=True)
    state = models.CharField(max_length=20, default="new")
    amount_toman = models.DecimalField(**money)
    created_at = models.DateTimeField(auto_now_add=True)


class InventoryMovement(models.Model):
    variant = models.ForeignKey(Variant, on_delete=models.PROTECT)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, null=True)
    delta = models.IntegerField()
    reason = models.CharField(max_length=200)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)


class Review(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    text = models.TextField(max_length=2000)
    approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "user"], name="one_review_per_product"
            )
        ]


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "product"], name="one_favorite")
        ]


class Article(models.Model):
    title = models.CharField(max_length=180)
    slug = models.SlugField(unique=True)
    excerpt = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    published = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class SiteContent(models.Model):
    key = models.SlugField(unique=True)
    title = models.CharField(max_length=180)
    body = models.TextField(blank=True)
    settings = models.JSONField(default=dict, blank=True)
    published = models.BooleanField(default=False)

    def __str__(self):
        return self.key


class Newsletter(models.Model):
    email = models.EmailField(unique=True)
    consent_at = models.DateTimeField(default=timezone.now)
    active = models.BooleanField(default=True)


class SupportMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    message = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.CharField(max_length=300)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    action = models.CharField(max_length=100)
    object_type = models.CharField(max_length=80)
    object_id = models.CharField(max_length=100)
    detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class SiteAsset(models.Model):
    key = models.SlugField(unique=True)
    image = models.ImageField(upload_to="brand/%Y/%m/")
    alt = models.CharField(max_length=180)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.key
