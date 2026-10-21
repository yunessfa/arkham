import tempfile, uuid
from io import StringIO
from django.test import TestCase, override_settings
from django.core.management import call_command
from django.core.management.base import CommandError
from rest_framework.exceptions import ValidationError
from store.models import Product, Variant, Article, SiteContent, ProductImage, SiteAsset, Order, Review, Payment
from store.services import create_order, start_payment
from .test_store import fixtures

@override_settings(DEBUG=True, DEMO_MODE=True, PAYMENT_PROVIDER='mock')
class DemoTests(TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.override=override_settings(MEDIA_ROOT=self.tmp.name)
        self.override.enable()
    def tearDown(self):
        self.override.disable(); self.tmp.cleanup()
    def seed(self):
        call_command('seed_demo',confirm_demo=True,stdout=StringIO())
    def test_repeatable_demo_has_complete_images_and_no_fake_sales(self):
        self.seed(); first=list(ProductImage.objects.values_list('image',flat=True)); self.seed()
        self.assertEqual(Product.objects.count(),6)
        self.assertEqual(Variant.objects.count(),11)
        self.assertEqual(Article.objects.count(),3)
        self.assertEqual(ProductImage.objects.count(),6)
        self.assertEqual(SiteAsset.objects.count(),5)
        self.assertEqual(first,list(ProductImage.objects.values_list('image',flat=True)))
        self.assertFalse(Order.objects.exists());self.assertFalse(Review.objects.exists())
        self.assertTrue(all('نمونه' in p.description for p in Product.objects.all()))
    def test_confirmation_required(self):
        with self.assertRaises(CommandError):call_command('seed_demo',stdout=StringIO())
        self.assertFalse(Product.objects.exists())
    @override_settings(DEBUG=False)
    def test_production_seed_is_blocked(self):
        with self.assertRaises(CommandError):self.seed()
    def test_real_content_is_not_overwritten(self):
        SiteContent.objects.create(key='story',title='Real story',body='Keep',published=True)
        with self.assertRaises(CommandError):self.seed()
        self.assertEqual(SiteContent.objects.get(key='story').body,'Keep')
        self.assertFalse(Product.objects.exists())
    def test_demo_real_gateway_is_blocked(self):
        u,p,v,a,s,cart=fixtures();v.sku='DEMO-GUARD-500';v.save()
        o=create_order(u,cart,a.pk,s.pk,uuid.uuid4())
        Payment.objects.filter(order=o).update(provider='zarinpal')
        with self.assertRaises(ValidationError):start_payment(o.pk,u)
