from io import StringIO
from django.test import TestCase
from django.core.management import call_command
from store.models import SiteContent, Article, SiteAsset
from .test_store import fixtures

class BrandUpgradeTests(TestCase):
    def test_dry_run_does_not_change_content(self):
        p=SiteContent.objects.create(key='story',title='داستان آرکهام',body='محفوظ')
        call_command('upgrade_brand',stdout=StringIO());p.refresh_from_db()
        self.assertEqual(p.title,'داستان آرکهام')
    def test_brand_update_preserves_stock_prices_urls_and_users(self):
        u,p,v,a,s,c=fixtures();p.name='عسل آرکهام';p.save()
        before=(v.stock,v.price,p.slug,u.password,a.street)
        content=SiteContent.objects.create(key='story',title='آرکهام',body='داستان آرکام',settings={'items':[{'title':'ارکهام'}]})
        call_command('upgrade_brand',apply=True,stdout=StringIO())
        p.refresh_from_db();v.refresh_from_db();u.refresh_from_db();content.refresh_from_db()
        self.assertEqual(p.name,'عسل ارکام');self.assertEqual(content.settings['items'][0]['title'],'ارکام')
        self.assertEqual(before,(v.stock,v.price,p.slug,u.password,a.street))
    def test_repeatable_and_does_not_overwrite_real_editorial_upload(self):
        image=SiteAsset.objects.create(key='story-image',image='brand/real-owner-photo.webp',alt='Real photo')
        call_command('upgrade_brand',apply=True,refresh_demo_images=True,stdout=StringIO())
        call_command('upgrade_brand',apply=True,refresh_demo_images=True,stdout=StringIO())
        image.refresh_from_db();self.assertEqual(image.image.name,'brand/real-owner-photo.webp')
    def test_demo_refresh_is_opt_in_and_idempotent(self):
        import tempfile
        from pathlib import Path
        from django.test import override_settings
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            original=Path(media)/'brand'/'demo-old.webp';original.parent.mkdir();original.write_bytes(b'old-preserved')
            image=SiteAsset.objects.create(key='story-image',image='brand/demo-old.webp',alt='Old')
            call_command('upgrade_brand',refresh_demo_images=True,stdout=StringIO())
            image.refresh_from_db();self.assertEqual(image.image.name,'brand/demo-old.webp')
            call_command('upgrade_brand',apply=True,refresh_demo_images=True,stdout=StringIO())
            image.refresh_from_db();name=image.image.name
            self.assertTrue(Path(name).name.startswith('demo-v4-'));self.assertTrue(Path(media,name).exists());self.assertEqual(original.read_bytes(),b'old-preserved')
            call_command('upgrade_brand',apply=True,refresh_demo_images=True,stdout=StringIO())
            image.refresh_from_db();self.assertEqual(image.image.name,name)
