"""Opt-in spelling update; never seeds products or touches customer/financial data."""
from pathlib import Path
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from store.models import Product, ProductImage, Article, SiteContent, SiteAsset

REPLACEMENTS = {'آرکهام': 'ارکام', 'آرکام': 'ارکام', 'ارکهام': 'ارکام'}
def rename(value):
    if isinstance(value, str):
        for old, new in REPLACEMENTS.items(): value = value.replace(old, new)
    elif isinstance(value, list): value = [rename(v) for v in value]
    elif isinstance(value, dict): value = {rename(k): rename(v) for k,v in value.items()}
    return value

class Command(BaseCommand):
    help = 'Preview/apply the Arkam spelling in catalog/editorial content; no prices, stock, users or orders changed.'
    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')
        parser.add_argument('--refresh-demo-images', action='store_true', help='Only replaces old demo-named editorial assets; leaves original files on disk.')
    @transaction.atomic
    def handle(self, *args, **options):
        count=0
        for model, fields in [(Product,['name','description','storage','specifications','seo_title','meta_description']),(ProductImage,['alt']),(Article,['title','excerpt','body']),(SiteContent,['title','body','settings']),(SiteAsset,['alt'])]:
            for obj in model.objects.all().iterator():
                changed=[]
                for field in fields:
                    old=getattr(obj,field);new=rename(old)
                    if old!=new: setattr(obj,field,new);changed.append(field)
                if changed:
                    count+=1
                    if options['apply']:obj.save(update_fields=changed)
        images=0
        if options['refresh_demo_images']:
            mapping={'story-image':'meadow','article-demo-gift-ritual':'meadow','article-demo-crystallisation':'comb','article-demo-honey-tasting':'breakfast'}
            for key, filename in mapping.items():
                obj=SiteAsset.objects.filter(key=key).first()
                # Do not replace a real upload, even under a demo-like key.
                if not obj or not Path(obj.image.name).name.startswith('demo-') or Path(obj.image.name).name.startswith('demo-v4-'):continue
                source=Path(settings.BASE_DIR)/'demo_assets'/'v4'/(filename+'.webp')
                if not source.exists():continue
                images+=1
                if options['apply']:
                    obj.alt='تصویر نمایشی مجله ارکام؛ تولیدشده با هوش مصنوعی'
                    obj.image.save('demo-v4-'+filename+'.webp',ContentFile(source.read_bytes()),save=False)
                    obj.save(update_fields=['image','alt'])
        self.stdout.write(f"{'Applied' if options['apply'] else 'DRY RUN — use --apply'}: {count} branding records, {images} demo editorial images. No accounts, orders, prices or stock modified.")
