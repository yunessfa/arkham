import os, secrets, subprocess
from pathlib import Path
from django.test import LiveServerTestCase, override_settings
from django.contrib.auth.models import User
from store.models import Order, Variant, Review
from .test_store import fixtures


@override_settings(
    ROOT_URLCONF="config.urls_test",
    DEBUG=True,
    PAYMENT_PROVIDER="mock",
    ALLOWED_HOSTS=["localhost", "127.0.0.1", "testserver"],
    PUBLIC_ORIGIN="http://localhost:8000",
)
class BrowserTests(LiveServerTestCase):
    def test_end_to_end(self):
        u, p, v, a, s, c = fixtures()
        p.featured = True
        p.save()
        password = secrets.token_urlsafe(24)
        User.objects.create_superuser("ui-admin", "qa-admin@example.test", password)
        root = Path(__file__).resolve().parents[3]
        env = {
            **os.environ,
            "QA_BASE_URL": self.live_server_url,
            "QA_ADMIN_PASSWORD": password,
        }
        result = subprocess.run(
            ["node", str(root / "qa/browser-flow.cjs")],
            env=env,
            capture_output=True,
            text=True,
            timeout=200,
        )
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)
        self.assertEqual(
            Order.objects.filter(user__username="ui-buyer", status="paid").count(), 1
        )
        v.refresh_from_db()
        self.assertEqual(v.stock, 9)
        self.assertEqual(Review.objects.filter(approved=False).count(), 1)
        print(result.stdout)
