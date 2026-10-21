from django.test import TestCase
from django.contrib.auth.models import User, Permission
from rest_framework.test import APIClient
from store.models import SiteContent
from store.design import PALETTES


class DesignTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("design-admin", "design@example.test", "Test-only-long-phrase-2026")
        self.client = APIClient()
        self.client.force_login(self.admin)

    def create(self, settings=None, published=True):
        return self.client.post("/api/v1/admin/content/", {"key": "site-design", "title": "طراحی", "settings": settings or {"schemaVersion": 1, "styleId": "golden_gallery"}, "published": published}, format="json")

    def test_all_curated_palettes_are_valid(self):
        r = self.create()
        self.assertEqual(r.status_code, 201)
        for palette in PALETTES:
            response = self.client.patch(f"/api/v1/admin/content/{r.data['id']}/", {"settings": {"schemaVersion": 1, "styleId": palette}}, format="json")
            self.assertEqual(response.status_code, 200)

    def test_unknown_style_and_extra_code_are_rejected(self):
        for settings in [{"schemaVersion": 1, "styleId": "unknown"}, {"schemaVersion": 1, "styleId": "golden_gallery", "css": "body{display:none}"}, {"schemaVersion": True, "styleId": "golden_gallery"}, {"styleId": "golden_gallery"}, {"schemaVersion": 1, "styleId": []}]:
            self.assertEqual(self.create(settings).status_code, 400)
        self.assertFalse(SiteContent.objects.filter(key="site-design").exists())

    def test_published_design_is_public_without_private_fields(self):
        self.create()
        self.client.logout()
        r = self.client.get("/api/v1/content/site-design/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["settings"]["styleId"], "golden_gallery")
        self.assertNotIn("id", r.data)

    def test_draft_design_is_not_public(self):
        self.create(published=False)
        self.client.logout()
        self.assertEqual(self.client.get("/api/v1/content/site-design/").status_code, 404)

    def test_customer_cannot_publish(self):
        u = User.objects.create_user("design-buyer")
        self.client.force_login(u)
        self.assertEqual(self.create().status_code, 403)

    def test_staff_without_content_permission_cannot_publish(self):
        u = User.objects.create_user("design-staff", is_staff=True)
        self.client.force_login(u)
        self.assertEqual(self.create().status_code, 403)

    def test_view_permission_does_not_grant_edit(self):
        r = self.create()
        u = User.objects.create_user("design-reader", is_staff=True)
        u.user_permissions.add(Permission.objects.get(codename="view_sitecontent"))
        self.client.force_login(u)
        self.assertEqual(self.client.get("/api/v1/admin/content/").status_code, 200)
        self.assertEqual(self.client.patch(f"/api/v1/admin/content/{r.data['id']}/", {"settings": {"schemaVersion": 1, "styleId": "rose_nectar"}}, format="json").status_code, 403)

    def test_reserved_key_cannot_be_renamed(self):
        r = self.create()
        self.assertEqual(self.client.patch(f"/api/v1/admin/content/{r.data['id']}/", {"key": "other"}, format="json").status_code, 400)

    def test_other_content_json_stays_compatible(self):
        r = self.client.post("/api/v1/admin/content/", {"key": "contact-test", "title": "تماس", "settings": {"socials": [], "custom": 123}}, format="json")
        self.assertEqual(r.status_code, 201)
