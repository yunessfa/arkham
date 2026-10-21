import uuid, threading
from decimal import Decimal
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from django.test import TestCase, TransactionTestCase, override_settings
from django.contrib.auth.models import User, Group, Permission
from django.utils import timezone
from django.db import (
    connection,
    connections,
    close_old_connections,
    IntegrityError,
    transaction,
)
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError
from store.models import *
from store.services import *
from store.payments import GatewayUnavailable


def fixtures():
    u = User.objects.create_user(
        "test-buyer", "buyer@example.test", "A-long-secret-928!"
    )
    c = Category.objects.create(name="دسته تست", slug="test")
    p = Product.objects.create(
        name="محصول صرفاً تست", slug="test-honey", category=c, active=True
    )
    v = Variant.objects.create(
        product=p, sku="TEST-500", weight_g=500, price=Decimal("100000"), stock=10
    )
    a = Address.objects.create(
        user=u,
        recipient="آزمایش",
        phone="09123456789",
        province="تهران",
        city="تهران",
        street="نشانی آزمایشی",
        postal_code="1234567890",
    )
    s = ShippingMethod.objects.create(name="ارسال آزمایشی", cost=20000)
    cart = Cart.objects.create(user=u)
    CartItem.objects.create(cart=cart, variant=v, quantity=2)
    return u, p, v, a, s, cart


@override_settings(PAYMENT_PROVIDER="mock", DEBUG=True)
class StoreTests(TestCase):
    def setUp(self):
        self.u, self.p, self.v, self.a, self.s, self.cart = fixtures()
        self.client = APIClient()
        self.client.force_login(self.u)

    def order(self, key=None, code=""):
        return create_order(
            self.u, self.cart, self.a.pk, self.s.pk, key or uuid.uuid4(), code
        )

    def test_server_price_ignores_client_price(self):
        r = self.client.post(
            "/api/v1/orders/",
            {
                "address": self.a.pk,
                "shipping": self.s.pk,
                "idempotency_key": str(uuid.uuid4()),
                "total": 1,
                "price": 1,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["total"], "220000")

    def test_order_snapshots(self):
        o = self.order()
        self.v.price = 900000
        self.v.save()
        self.p.name = "ویرایش"
        self.p.save()
        i = o.items.get()
        self.assertEqual(i.unit_price, 100000)
        self.assertEqual(i.name, "محصول صرفاً تست")

    def test_order_idempotency(self):
        k = uuid.uuid4()
        o = self.order(k)
        again = self.order(k)
        self.assertEqual(o.pk, again.pk)
        self.v.refresh_from_db()
        self.assertEqual(self.v.reserved, 2)

    def test_insufficient_stock_rolls_back(self):
        self.v.stock = 1
        self.v.save()
        with self.assertRaises(ValidationError):
            self.order()
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(self.cart.items.count(), 1)

    def test_reservation_not_yet_sale(self):
        o = self.order()
        self.v.refresh_from_db()
        self.assertEqual(self.v.stock, 10)
        self.assertEqual(self.v.reserved, 2)
        self.assertIsNone(o.paid_at)

    def test_callback_idempotent(self):
        o = self.order()
        start_payment(o.pk, self.u)
        o.refresh_from_db()
        a = o.payment.authority
        settle_payment(a, self.u)
        settle_payment(a, self.u)
        self.v.refresh_from_db()
        self.assertEqual(self.v.stock, 8)
        self.assertEqual(self.v.reserved, 0)
        self.assertEqual(InventoryMovement.objects.count(), 1)
        self.assertEqual(Notification.objects.count(), 1)

    def test_cancel_releases(self):
        o = self.order()
        cancel_unstarted(o.pk, self.u)
        self.v.refresh_from_db()
        self.assertEqual(self.v.reserved, 0)
        self.assertEqual(self.v.stock, 10)

    def test_cannot_cancel_gateway_pending(self):
        o = self.order()
        start_payment(o.pk, self.u)
        with self.assertRaises(ValidationError):
            cancel_unstarted(o.pk, self.u)

    def test_payment_request_timeout_does_not_retry(self):
        from unittest.mock import patch

        o = self.order()
        with patch(
            "store.payments.MockGateway.request",
            side_effect=GatewayUnavailable("timeout"),
        ) as req:
            self.assertIsNone(start_payment(o.pk, self.u))
            with self.assertRaises(ValidationError):
                start_payment(o.pk, self.u)
            self.assertEqual(req.call_count, 1)
        o.payment.refresh_from_db()
        self.assertEqual(o.payment.state, "unknown")

    def test_forged_callback_mock_rejected(self):
        o = self.order()
        self.assertEqual(
            self.client.get(
                "/api/v1/payments/callback/?Authority=fake&Status=OK"
            ).status_code,
            400,
        )
        o.refresh_from_db()
        self.assertEqual(o.status, "pending")

    def test_cross_customer_order_denied(self):
        o = self.order()
        u = User.objects.create_user("other")
        self.client.force_login(u)
        self.assertEqual(
            self.client.get("/api/v1/orders/" + str(o.pk) + "/").status_code, 404
        )
        self.assertEqual(
            self.client.post("/api/v1/orders/" + str(o.pk) + "/pay/").status_code, 404
        )

    def test_cross_customer_address_denied(self):
        u = User.objects.create_user("other")
        self.a.user = u
        self.a.save()
        with self.assertRaises(ValidationError):
            self.order()

    def test_order_status_fsm(self):
        o = self.order()
        with self.assertRaises(ValidationError):
            transition(o.pk, self.u, "shipped", "CODE")
        start_payment(o.pk, self.u)
        o.refresh_from_db()
        settle_payment(o.payment.authority, self.u)
        transition(o.pk, self.u, "processing")
        with self.assertRaises(ValidationError):
            transition(o.pk, self.u, "shipped")
        transition(o.pk, self.u, "shipped", "TRACK123")
        o.refresh_from_db()
        self.assertEqual(o.tracking_code, "TRACK123")

    def coupon(self, **kw):
        now = timezone.now()
        params = dict(
            code="TEST",
            kind="percent",
            value=10,
            minimum=0,
            starts_at=now - timedelta(days=1),
            ends_at=now + timedelta(days=1),
            usage_limit=1,
            per_user_limit=1,
        )
        params.update(kw)
        return Coupon.objects.create(**params)

    def test_coupon_server_calculation(self):
        self.coupon()
        o = self.order(code="test")
        self.assertEqual(o.discount, 20000)
        self.assertEqual(o.total, 200000)

    def test_expired_coupon(self):
        self.coupon(ends_at=timezone.now() - timedelta(seconds=1))
        with self.assertRaises(ValidationError):
            self.order(code="TEST")

    def test_coupon_limit_counts_pending_reservations(self):
        self.coupon()
        self.order(code="TEST")
        CartItem.objects.create(cart=self.cart, variant=self.v, quantity=1)
        with self.assertRaises(ValidationError):
            self.order(code="TEST")

    def test_sale_window(self):
        self.v.sale_price = 80000
        self.v.sale_start = timezone.now() - timedelta(days=1)
        self.v.sale_end = timezone.now() + timedelta(days=1)
        self.v.save()
        self.assertEqual(self.order().subtotal, 160000)

    def test_expired_sale_not_used(self):
        self.v.sale_price = 80000
        self.v.sale_start = timezone.now() - timedelta(days=2)
        self.v.sale_end = timezone.now() - timedelta(days=1)
        self.v.save()
        self.assertEqual(self.order().subtotal, 200000)

    def test_cart_server_available(self):
        r = self.client.post(
            "/api/v1/cart/", {"variant": self.v.pk, "quantity": 11}, format="json"
        )
        self.assertEqual(r.status_code, 400)

    def test_cart_guest_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(
            client.post(
                "/api/v1/cart/", {"variant": self.v.pk, "quantity": 1}
            ).status_code,
            403,
        )
        r = client.get("/api/v1/session/")
        token = client.cookies["csrftoken"].value
        self.assertEqual(
            client.post(
                "/api/v1/cart/",
                {"variant": self.v.pk, "quantity": 1},
                HTTP_X_CSRFTOKEN=token,
            ).status_code,
            200,
        )

    def test_auth_csrf(self):
        c = APIClient(enforce_csrf_checks=True)
        self.assertEqual(
            c.post(
                "/api/v1/accounts/login/",
                {"username": "test-buyer", "password": "A-long-secret-928!"},
            ).status_code,
            403,
        )

    def test_anonymous_order_denied(self):
        self.client.logout()
        self.assertEqual(self.client.post("/api/v1/orders/", {}).status_code, 403)

    def test_admin_regular_user_denied(self):
        for url in [
            "/api/v1/admin/products/",
            "/api/v1/admin/orders/",
            "/api/v1/admin/dashboard/",
            "/api/v1/admin/customers/",
        ]:
            self.assertEqual(self.client.get(url).status_code, 403)

    def test_staff_requires_model_permission(self):
        self.u.is_staff = True
        self.u.save()
        self.assertEqual(self.client.get("/api/v1/admin/products/").status_code, 403)
        self.u.user_permissions.add(Permission.objects.get(codename="view_product"))
        self.assertEqual(self.client.get("/api/v1/admin/products/").status_code, 200)
        self.assertEqual(
            self.client.post("/api/v1/admin/products/", {"name": "x"}).status_code, 403
        )

    def test_admin_stock_change_audited(self):
        self.u.is_staff = True
        self.u.save()
        self.u.user_permissions.add(Permission.objects.get(codename="change_variant"))
        r = self.client.post(
            "/api/v1/admin/stock/" + str(self.v.pk) + "/",
            {"delta": 5, "reason": "تست"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.v.refresh_from_db()
        self.assertEqual(self.v.stock, 15)
        self.assertTrue(AuditLog.objects.filter(action="inventory.adjusted").exists())

    def test_stock_cannot_go_below_reserved(self):
        self.order()
        self.u.is_staff = True
        self.u.save()
        self.u.user_permissions.add(Permission.objects.get(codename="change_variant"))
        r = self.client.post(
            "/api/v1/admin/stock/" + str(self.v.pk) + "/",
            {"delta": -9, "reason": "تست"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)

    def test_unapproved_review_private(self):
        Review.objects.create(
            product=self.p, user=self.u, rating=5, text="تست", approved=False
        )
        self.assertEqual(self.client.get("/api/v1/reviews/").data["count"], 0)

    def test_review_requires_purchase(self):
        self.assertEqual(
            self.client.post(
                "/api/v1/reviews/",
                {"product": self.p.pk, "rating": 5, "text": "تست"},
                format="json",
            ).status_code,
            400,
        )

    def test_purchaser_review_waits_moderation(self):
        o = self.order()
        start_payment(o.pk, self.u)
        o.refresh_from_db()
        settle_payment(o.payment.authority, self.u)
        self.assertEqual(
            self.client.post(
                "/api/v1/reviews/",
                {"product": self.p.pk, "rating": 5, "text": "تست"},
                format="json",
            ).status_code,
            201,
        )
        self.assertFalse(Review.objects.get().approved)

    def test_newsletter_consent(self):
        self.assertEqual(
            self.client.post(
                "/api/v1/newsletter/",
                {"email": "x@example.test", "consent": False},
                format="json",
            ).status_code,
            400,
        )
        self.assertEqual(Newsletter.objects.count(), 0)

    def test_price_filters_and_search(self):
        self.assertEqual(
            self.client.get("/api/v1/products/?min_price=200000").data["count"], 0
        )
        self.assertEqual(self.client.get("/api/v1/products/?q=محصول").data["count"], 1)
        self.assertEqual(
            self.client.get("/api/v1/products/?min_price=NaN").status_code, 400
        )

    def test_hidden_products(self):
        self.p.active = False
        self.p.save()
        self.assertEqual(self.client.get("/api/v1/products/").data["count"], 0)

    def test_shipping_zone(self):
        self.s.provinces = ["فارس"]
        self.s.save()
        with self.assertRaises(ValidationError):
            self.order()

    def test_invalid_address(self):
        self.assertEqual(
            self.client.post(
                "/api/v1/addresses/",
                {
                    "recipient": "x",
                    "phone": "123",
                    "province": "x",
                    "city": "x",
                    "street": "x",
                    "postal_code": "123",
                },
            ).status_code,
            400,
        )

    def test_health(self):
        self.assertEqual(self.client.get("/api/v1/health/").status_code, 200)

    def test_decimal_not_float(self):
        self.assertIsInstance(self.v.current_price, Decimal)

    def test_db_rejects_invalid_inventory(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Variant.objects.filter(pk=self.v.pk).update(reserved=11)

    def test_production_mock_blocked(self):
        with override_settings(DEBUG=False):
            with self.assertRaises(GatewayUnavailable):
                gateway("mock")

    def test_production_simulation_hidden(self):
        o = self.order()
        with override_settings(DEBUG=False):
            self.assertEqual(
                self.client.post(
                    "/api/v1/orders/" + str(o.pk) + "/simulate/"
                ).status_code,
                404,
            )

    def test_dashboard_excludes_unpaid(self):
        self.order()
        self.u.is_staff = True
        self.u.is_superuser = True
        self.u.save()
        r = self.client.get("/api/v1/admin/dashboard/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["paid_revenue"], "0")

    def test_image_upload_rejects_nonimage(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.u.is_staff = True
        self.u.is_superuser = True
        self.u.save()
        r = self.client.post(
            "/api/v1/admin/images/",
            {
                "product": self.p.pk,
                "alt": "bad",
                "image": SimpleUploadedFile(
                    "x.jpg", b"<script>alert(1)</script>", content_type="image/jpeg"
                ),
            },
            format="multipart",
        )
        self.assertEqual(r.status_code, 400)

    def test_login_merges_guest_cart(self):
        c = APIClient()
        c.get("/api/v1/session/")
        c.post("/api/v1/cart/", {"variant": self.v.pk, "quantity": 1}, format="json")
        self.assertEqual(
            c.post(
                "/api/v1/accounts/login/",
                {"username": "test-buyer", "password": "A-long-secret-928!"},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(Cart.objects.get(user=self.u).items.get().quantity, 3)

    def test_gateway_rial_boundary(self):
        from unittest.mock import patch
        from store.payments import ZarinpalGateway

        o = self.order()
        with patch.object(
            ZarinpalGateway,
            "rpc",
            return_value={"code": 100, "authority": "test-authority"},
        ) as rpc:
            ZarinpalGateway().request(o.payment)
            self.assertEqual(rpc.call_args.args[1]["amount"], 2200000)

    def test_failed_verification_keeps_reservation(self):
        from unittest.mock import patch

        o = self.order()
        start_payment(o.pk, self.u)
        o.refresh_from_db()
        with patch(
            "store.payments.MockGateway.verify", side_effect=GatewayRejected("failed")
        ):
            with self.assertRaises(GatewayRejected):
                settle_payment(o.payment.authority, self.u)
        self.v.refresh_from_db()
        self.assertEqual(self.v.stock, 10)
        self.assertEqual(self.v.reserved, 2)


@override_settings(PAYMENT_PROVIDER="mock", DEBUG=True)
class ConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.u, self.p, self.v, self.a, self.s, self.cart = fixtures()
        self.v.stock = 1
        self.v.save()
        self.cart.items.update(quantity=1)
        self.u2 = User.objects.create_user("buyer2")
        self.a2 = Address.objects.create(
            user=self.u2,
            recipient="Test",
            phone="09123456789",
            province="تهران",
            city="تهران",
            street="test",
            postal_code="1234567890",
        )
        self.c2 = Cart.objects.create(user=self.u2)
        CartItem.objects.create(cart=self.c2, variant=self.v, quantity=1)

    def test_two_buyers_last_unit(self):
        self.assertEqual(
            connection.vendor, "postgresql", "Concurrency test must use PostgreSQL"
        )
        barrier = threading.Barrier(2)

        def buy(args):
            close_old_connections()
            u, c, a = args
            try:
                barrier.wait(timeout=10)
                return str(create_order(u, c, a.pk, self.s.pk, uuid.uuid4()).pk)
            except ValidationError:
                return "unavailable"
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(
                pool.map(
                    buy, [(self.u, self.cart, self.a), (self.u2, self.c2, self.a2)]
                )
            )
        self.assertEqual(results.count("unavailable"), 1)
        self.assertEqual(Order.objects.count(), 1)
        self.v.refresh_from_db()
        self.assertEqual(self.v.reserved, 1)

    def test_two_parallel_callbacks_deduct_once(self):
        o = create_order(self.u, self.cart, self.a.pk, self.s.pk, uuid.uuid4())
        start_payment(o.pk, self.u)
        o.refresh_from_db()
        a = o.payment.authority
        barrier = threading.Barrier(2)

        def settle(_):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                settle_payment(a)
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(settle, range(2)))
        self.v.refresh_from_db()
        self.assertEqual(self.v.stock, 0)
        self.assertEqual(InventoryMovement.objects.count(), 1)


@override_settings(PAYMENT_PROVIDER="mock", DEBUG=True)
class BrandAndSeoTests(TestCase):
    def setUp(self):
        self.u, self.p, self.v, self.a, self.s, self.cart = fixtures()
        self.client = APIClient()

    def test_brand_assets_only_publish_active(self):
        SiteAsset.objects.create(
            key="logo-dark",
            image="brand/private.webp",
            alt="لوگوی منتشرنشده",
            active=False,
        )
        self.assertEqual(self.client.get("/api/v1/assets/").data, [])

    def test_logo_upload_reencoded_with_transparency(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image
        from io import BytesIO
        import tempfile

        u = User.objects.create_superuser(
            "test-admin", "admin@example.test", "Secret-Tests-3847!"
        )
        self.client.force_login(u)
        b = BytesIO()
        Image.new("RGBA", (32, 32), (255, 180, 0, 120)).save(b, "PNG")
        with tempfile.TemporaryDirectory() as root, override_settings(MEDIA_ROOT=root):
            r = self.client.post(
                "/api/v1/admin/assets/",
                {
                    "key": "logo-dark",
                    "alt": "لوگوی صرفاً تست",
                    "active": True,
                    "image": SimpleUploadedFile(
                        "logo.png", b.getvalue(), content_type="image/png"
                    ),
                },
                format="multipart",
            )
            self.assertEqual(r.status_code, 201)
            obj = SiteAsset.objects.get()
            im = Image.open(obj.image.path)
            self.assertEqual(im.format, "WEBP")
            self.assertIn("A", im.getbands())

    def test_product_metadata_uses_real_price_rial(self):
        r = self.client.get("/products/test-honey")
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, '"priceCurrency": "IRR"')
        self.assertContains(r, '"price": "1000000"')
        self.assertNotContains(r, "aggregateRating")

    def test_private_pages_noindex_and_missing_page_404(self):
        self.assertContains(self.client.get("/account"), "noindex,nofollow")
        self.assertEqual(self.client.get("/unknown-route").status_code, 404)
        self.assertEqual(self.client.get("/pages/privacy").status_code, 404)

    def test_unknown_variant_adjustment_returns_404(self):
        u = User.objects.create_superuser(
            "test-admin", "admin@example.test", "Secret-Tests-3847!"
        )
        self.client.force_login(u)
        self.assertEqual(
            self.client.post(
                "/api/v1/admin/stock/999999/", {"delta": 1, "reason": "test"}
            ).status_code,
            404,
        )


@override_settings(PAYMENT_PROVIDER="mock", DEBUG=True)
class EdgeCaseTests(TestCase):
    def setUp(self):
        self.u, self.p, self.v, self.a, self.s, self.cart = fixtures()

    def test_unpublished_product_can_be_removed_from_cart(self):
        c = APIClient()
        c.force_login(self.u)
        self.p.active = False
        self.p.save()
        r = c.post(
            "/api/v1/cart/", {"variant": self.v.pk, "quantity": 0}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["items"], [])

    def test_gateway_rejects_malformed_reference(self):
        from unittest.mock import patch
        from store.payments import ZarinpalGateway

        o = create_order(self.u, self.cart, self.a.pk, self.s.pk, uuid.uuid4())
        with patch.object(
            ZarinpalGateway,
            "rpc",
            return_value={"code": 100, "ref_id": {"unexpected": "object"}},
        ):
            with self.assertRaises(GatewayUnavailable):
                ZarinpalGateway().verify(o.payment)

    def test_gateway_rejects_malformed_authority(self):
        from unittest.mock import patch
        from store.payments import ZarinpalGateway

        o = create_order(self.u, self.cart, self.a.pk, self.s.pk, uuid.uuid4())
        with patch.object(
            ZarinpalGateway, "rpc", return_value={"code": 100, "authority": 123}
        ):
            with self.assertRaises(GatewayUnavailable):
                ZarinpalGateway().request(o.payment)
