"""V8: phone login, checkout quote, Persian search, provinces, ratings, dashboard."""

from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from store.models import *
from store.text import normalize_fa, normalize_phone, search_variants


class TextHelpers(TestCase):
    def test_phone_spellings(self):
        for raw in ["09121234567", "۰۹۱۲۱۲۳۴۵۶۷", "+989121234567", "00989121234567", "9121234567", "0912 123 4567"]:
            self.assertEqual(normalize_phone(raw), "09121234567", raw)
        for raw in ["", "0812345678", "abc", "091212345678"]:
            self.assertEqual(normalize_phone(raw), "")

    def test_persian_normalization(self):
        self.assertEqual(normalize_fa("عسل  كوهي ۵۰۰"), "عسل کوهی 500")
        self.assertEqual(search_variants("کوهی"), ["کوهی", "كوهي"])
        self.assertEqual(search_variants("   "), [])


class Base(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()  # throttle counters live in the shared local cache
        self.addCleanup(cache.clear)
        self.c = APIClient(enforce_csrf_checks=False)
        self.cat = Category.objects.create(name="عسل‌های کوهستانی", slug="mountain")
        self.p = Product.objects.create(name="عسل كوهي", slug="kuhi", category=self.cat, active=True, description="آویشن")
        self.v = Variant.objects.create(product=self.p, sku="K-500", weight_g=500, price=Decimal("400000"), stock=10)
        self.ship = ShippingMethod.objects.create(name="پست", cost=Decimal("50000"), provinces=["تهران"])
        now = timezone.now()
        self.coupon = Coupon.objects.create(code="HONEY10", kind="percent", value=10, minimum=Decimal("100000"),
                                            starts_at=now - timedelta(days=1), ends_at=now + timedelta(days=1), usage_limit=5)


@override_settings(SMS_PROVIDER="console", DEBUG=True)
class PhoneLogin(Base):
    def code(self, phone="09121234567"):
        r = self.c.post("/api/v1/accounts/phone/code/", {"phone": phone}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()["debug_code"]

    def test_session_flag_and_login_creates_user_and_merges_cart(self):
        self.assertTrue(self.c.get("/api/v1/session/").json()["phone_login"])
        self.c.post("/api/v1/cart/", {"variant": self.v.pk, "quantity": 2}, format="json")
        code = self.code("۰۹۱۲۱۲۳۴۵۶۷")
        r = self.c.post("/api/v1/accounts/phone/verify/", {"phone": "09121234567", "code": code}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()["created"])
        self.assertTrue(r.json()["needs_name"])
        u = get_user_model().objects.get(username="09121234567")
        self.assertFalse(u.has_usable_password())
        self.assertEqual(self.c.get("/api/v1/cart/").json()["items"][0]["quantity"], 2)
        self.c.post("/api/v1/accounts/profile/", {"first_name": "مریم"}, format="json")
        u.refresh_from_db()
        self.assertEqual(u.first_name, "مریم")

    def test_codes_are_hashed_single_use_and_rate_limited(self):
        code = self.code()
        otp = PhoneOTP.objects.get()
        self.assertNotIn(code, otp.code_hash)
        r = self.c.post("/api/v1/accounts/phone/code/", {"phone": "09121234567"}, format="json")
        self.assertEqual(r.status_code, 400)  # resend cooldown
        ok = self.c.post("/api/v1/accounts/phone/verify/", {"phone": "09121234567", "code": code}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.c.post("/api/v1/accounts/logout/")
        again = APIClient().post("/api/v1/accounts/phone/verify/", {"phone": "09121234567", "code": code}, format="json")
        self.assertEqual(again.status_code, 400)

    def test_wrong_attempts_are_counted_and_lock_the_code(self):
        code = self.code()
        wrong = "00000" if code != "00000" else "11111"
        for _ in range(5):
            r = self.c.post("/api/v1/accounts/phone/verify/", {"phone": "09121234567", "code": wrong}, format="json")
            self.assertEqual(r.status_code, 400)
        self.assertEqual(PhoneOTP.objects.get().attempts, 5)
        r = self.c.post("/api/v1/accounts/phone/verify/", {"phone": "09121234567", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(get_user_model().objects.filter(username="09121234567").exists())

    def test_expired_code_and_invalid_phone(self):
        code = self.code()
        PhoneOTP.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        r = self.c.post("/api/v1/accounts/phone/verify/", {"phone": "09121234567", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.c.post("/api/v1/accounts/phone/code/", {"phone": "12345"}, format="json")
        self.assertEqual(r.status_code, 400)

    @override_settings(SMS_PROVIDER="disabled")
    def test_disabled_provider_refuses(self):
        r = self.c.post("/api/v1/accounts/phone/code/", {"phone": "09121234567"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(self.c.get("/api/v1/session/").json()["phone_login"])


class QuoteAndCatalog(Base):
    def test_quote_previews_coupon_shipping_without_reserving(self):
        self.c.post("/api/v1/cart/", {"variant": self.v.pk, "quantity": 2}, format="json")
        r = self.c.post("/api/v1/checkout/quote/", {"shipping": self.ship.pk, "coupon": "honey10"}, format="json").json()
        self.assertEqual(r["subtotal"], "800000")
        self.assertEqual(r["discount"], "80000")
        self.assertEqual(r["shipping"], "50000")
        self.assertEqual(r["total"], "770000")
        self.assertTrue(r["coupon"]["valid"])
        self.assertTrue(r["ready"])
        self.v.refresh_from_db()
        self.assertEqual(self.v.reserved, 0)
        bad = self.c.post("/api/v1/checkout/quote/", {"coupon": "NOPE"}, format="json").json()
        self.assertFalse(bad["coupon"]["valid"])
        self.assertEqual(bad["total"], "800000")
        self.assertFalse(bad["ready"])

    def test_quote_reports_stock_problems_and_minimum(self):
        self.c.post("/api/v1/cart/", {"variant": self.v.pk, "quantity": 2}, format="json")
        Variant.objects.filter(pk=self.v.pk).update(stock=1)
        r = self.c.post("/api/v1/checkout/quote/", {"shipping": self.ship.pk}, format="json").json()
        self.assertTrue(r["problems"])
        self.assertFalse(r["ready"])
        Coupon.objects.filter(pk=self.coupon.pk).update(minimum=Decimal("9000000"))
        r = self.c.post("/api/v1/checkout/quote/", {"coupon": "HONEY10"}, format="json").json()
        self.assertIn("تومان", r["coupon"]["message"])

    def test_search_matches_arabic_spelling_and_category(self):
        names = lambda q: [p["slug"] for p in self.c.get("/api/v1/products/", {"q": q}).json()["results"]]
        self.assertEqual(names("کوهی"), ["kuhi"])
        self.assertEqual(names("كوهي"), ["kuhi"])
        self.assertEqual(names("کوهستانی"), ["kuhi"])
        self.assertEqual(names("زعفران"), [])

    def test_rating_and_discount_fields(self):
        u1 = get_user_model().objects.create_user("a1", password="x" * 14)
        u2 = get_user_model().objects.create_user("a2", password="x" * 14)
        Review.objects.create(product=self.p, user=u1, rating=5, text="عالی", approved=True)
        Review.objects.create(product=self.p, user=u2, rating=4, text="خوب", approved=True)
        Variant.objects.create(product=self.p, sku="K-1000", weight_g=1000, price=Decimal("800000"), stock=3)
        now = timezone.now()
        Variant.objects.filter(sku="K-500").update(sale_price=Decimal("300000"), sale_start=now - timedelta(hours=1), sale_end=now + timedelta(hours=1))
        p = self.c.get("/api/v1/products/kuhi/").json()
        self.assertEqual(p["rating"], {"average": 4.5, "count": 2})
        self.assertEqual({v["sku"]: v["discount_percent"] for v in p["variants"]}, {"K-500": 25, "K-1000": 0})
        listed = self.c.get("/api/v1/products/").json()["results"][0]
        self.assertEqual(listed["rating"]["count"], 2)

    def test_province_validation_and_digit_normalization(self):
        u = get_user_model().objects.create_user("buyer", password="x" * 14)
        self.c.force_authenticate(u)
        self.assertIn("تهران", self.c.get("/api/v1/provinces/").json())
        base = {"recipient": "علی", "phone": "۰۹۱۲۱۲۳۴۵۶۷", "city": "تهران", "street": "خیابان ولیعصر", "postal_code": "۱۲۳۴۵۶۷۸۹۰"}
        bad = self.c.post("/api/v1/addresses/", {**base, "province": "تهرون"}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = self.c.post("/api/v1/addresses/", {**base, "province": "تهران"}, format="json")
        self.assertEqual(ok.status_code, 201, ok.content)
        self.assertEqual(ok.json()["phone"], "09121234567")
        self.assertEqual(ok.json()["postal_code"], "1234567890")

    def test_cart_includes_image_field(self):
        r = self.c.post("/api/v1/cart/", {"variant": self.v.pk, "quantity": 1}, format="json").json()
        self.assertIn("image", r["items"][0])


class DashboardPortable(Base):
    def test_daily_sales_groups_by_local_day(self):
        admin = get_user_model().objects.create_superuser("boss", "b@example.com", "x" * 14)
        buyer = get_user_model().objects.create_user("b", password="x" * 14)
        import uuid
        Order.objects.create(user=buyer, idempotency_key=uuid.uuid4(), status="paid", address={}, subtotal=100, shipping=0, total=100,
                             shipping_name="x", paid_at=timezone.now(), expires_at=timezone.now())
        self.c.force_authenticate(admin)
        r = self.c.get("/api/v1/admin/dashboard/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(len(r.json()["daily_sales"]), 1)
