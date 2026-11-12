from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from store.catalog import HONEYS
from store.models import Category, CustomerProfile, Product, SiteContent, Variant


class CatalogTests(TestCase):
    def test_load_catalog_once_and_retire_demo(self):
        cat = Category.objects.create(name="demo", slug="demo-floral", active=True)
        Product.objects.create(name="demo", slug="demo-thyme", category=cat, active=True)
        SiteContent.objects.create(key="demo-notice", title="x", published=True)
        call_command("load_catalog", verbosity=0)
        self.assertEqual(Product.objects.filter(active=True).count(), len(HONEYS))
        self.assertFalse(Product.objects.get(slug="demo-thyme").active)
        self.assertFalse(SiteContent.objects.get(key="demo-notice").published)
        thyme = Product.objects.get(slug="thyme")
        self.assertEqual(thyme.specifications["_honey"]["flower"], "آویشن")
        self.assertEqual(SiteContent.objects.get(key="contact").settings["email"], "info@arkham.ir")
        # Owner edits survive the next deploy.
        Variant.objects.filter(product=thyme).update(price=999000)
        call_command("load_catalog", verbosity=0)
        self.assertTrue(Variant.objects.filter(product=thyme, price=999000).exists())

    def test_recommended_sort_puts_stock_first(self):
        call_command("load_catalog", verbosity=0)
        res = APIClient().get("/api/v1/products/")
        first = res.json()["results"][0]
        self.assertTrue(any(v["available"] > 0 for v in first["variants"]))
        self.assertTrue(first["specifications"]["_honey"]["hex"])

    def test_finder_page_is_served(self):
        self.assertEqual(self.client.get("/honey-finder").status_code, 200)
        self.assertEqual(self.client.get("/welcome").status_code, 200)


class ProfileTests(TestCase):
    def setUp(self):
        self.c = APIClient(enforce_csrf_checks=False)

    def test_register_with_mobile_and_no_email(self):
        r = self.c.post("/api/v1/accounts/register/", {"username": "۰۹۱۲۳۴۵۶۷۸۹", "first_name": "مریم", "password": "Golden-Hive-2026!"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(get_user_model().objects.filter(username="09123456789").exists())
        p = self.c.get("/api/v1/accounts/profile/").json()
        self.assertEqual(p["phone"], "09123456789")
        self.assertFalse(p["completed"])

    def test_profile_update_and_validation(self):
        u = get_user_model().objects.create_user("09120000000", password="x" * 14)
        self.c.force_authenticate(u)
        ok = self.c.post("/api/v1/accounts/profile/", {
            "first_name": "علی", "last_name": "رضایی", "birthday": "03-05", "marketing": True,
            "preferences": {"purposes": ["gift"], "tastes": ["floral"], "needs": ["sleep"], "weight": "500", "budget": "mid"},
            "complete": True,
        }, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        prof = CustomerProfile.objects.get(user=u)
        self.assertEqual(prof.birthday, "03-05")
        self.assertIsNotNone(prof.completed_at)
        self.assertEqual(prof.preferences["needs"], ["sleep"])
        self.assertTrue(self.c.get("/api/v1/session/").json()["profile_complete"])
        bad = self.c.post("/api/v1/accounts/profile/", {"preferences": {"needs": ["magic"]}}, format="json")
        self.assertEqual(bad.status_code, 400)
        bad = self.c.post("/api/v1/accounts/profile/", {"birthday": "08-31"}, format="json")
        self.assertEqual(bad.status_code, 400)
        bad = self.c.post("/api/v1/accounts/profile/", {"phone": "12345"}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_profile_requires_login(self):
        self.assertIn(self.c.get("/api/v1/accounts/profile/").status_code, (401, 403))
