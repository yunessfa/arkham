"""Publish the real ARKHAM honey catalogue and retire the demo storefront.

Safe to run on every deploy: it applies each catalogue version once (tracked in
SiteContent "catalog-version"), so later edits made in /manage are kept.
Use --force to re-apply the bundled copy and prices on purpose.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from store.catalog import (
    CATALOG_VERSION, CATEGORIES, HONEYS, NEEDS, STORAGE, DISCLAIMER, CONTACT_BODY,
)
from store.models import Category, Product, Variant, SiteContent

MARKER = "catalog-version"
CRYSTAL = {"fast": "زود شکرک می‌زند", "medium": "شکرک متوسط", "slow": "دیر شکرک می‌زند"}
FAQ = [
    {"title": "چرا عسل شکرک می‌زند؟", "body": "شکرک‌زدن (بلوری‌شدن) فرایندی طبیعی است که به نسبت قندهای عسل و دما بستگی دارد. عسلی که حرارت ندیده، دیر یا زود شکرک می‌زند؛ این نشانهٔ تقلب نیست."},
    {"title": "عسل شکرک‌زده را چطور روان کنم؟", "body": "در شیشه را ببندید و ظرف را چند دقیقه در آب ولرم بگذارید. از حرارت مستقیم، مایکروویو یا آب جوش استفاده نکنید؛ عطر و ترکیبات حساس عسل از بین می‌رود."},
    {"title": "کدام عسل برای من مناسب است؟", "body": "از بخش «عسل‌یاب» استفاده کنید؛ با چند سؤال کوتاه دربارهٔ کاربرد، طعم، وزن و بودجه، مناسب‌ترین عسل‌ها را پیشنهاد می‌دهیم."},
    {"title": "آیا عسل برای کودکان مناسب است؟", "body": "برای کودکان زیر یک سال به هیچ وجه عسل ندهید. برای بچه‌های بزرگ‌تر، عسل‌های ملایم مثل یونجه، گون، مرکبات یا عسل صبحانه انتخاب‌های خوشایندی‌اند."},
    {"title": "افراد دیابتی می‌توانند عسل بخورند؟", "body": "همهٔ عسل‌ها قند دارند. بعضی عسل‌های دیررس فروکتوز بیشتری دارند، اما اگر دیابت دارید نوع و مقدار مصرف را حتماً با پزشک خود تنظیم کنید."},
    {"title": "عسل را کجا نگه دارم؟", "body": "در ظرف دربسته، دمای اتاق و دور از نور مستقیم. یخچال لازم نیست و شکرک‌زدن را سریع‌تر می‌کند. همیشه از قاشق خشک استفاده کنید."},
]


def specs(h):
    p = h["profile"]
    out = {
        "گیاه منبع": p["flower"] + (" (" + p["latin"] + ")" if p.get("latin") else ""),
        "منطقهٔ برداشت": p["region"],
        "فصل برداشت": p["season"],
        "رنگ": p["color"],
        "طعم": "، ".join(p["taste"]),
        "شکرک": CRYSTAL[p["crystal"]],
        "طبع": p["temper"],
    }
    if p.get("pack"):
        out["بسته‌بندی"] = p["pack"]
    if p["needs"]:
        out["مناسب برای"] = "، ".join(NEEDS[n] for n in p["needs"])
    out["_honey"] = p
    return out


class Command(BaseCommand):
    help = "Load the ARKHAM honey catalogue once per version and remove demo notices."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Re-apply copy and prices even if this version was loaded.")

    @transaction.atomic
    def handle(self, *args, **opts):
        marker = SiteContent.objects.filter(key=MARKER).first()
        done = (marker.settings or {}).get("version", 0) if marker else 0
        if done >= CATALOG_VERSION and not opts["force"]:
            self.stdout.write("Catalogue v%s already loaded; nothing to do." % CATALOG_VERSION)
            return
        cats = {}
        for slug, name, desc in CATEGORIES:
            cats[slug], _ = Category.objects.update_or_create(
                slug=slug, defaults={"name": name, "description": desc, "active": True}
            )
        for i, h in enumerate(HONEYS):
            p = h["profile"]
            product, _ = Product.objects.update_or_create(
                slug=h["slug"],
                defaults={
                    "name": h["name"],
                    "category": cats[h["category"]],
                    "description": "\n\n".join(h["body"] + [DISCLAIMER]),
                    "storage": STORAGE,
                    "specifications": specs(h),
                    "active": True,
                    "featured": h["featured"],
                    "sort_order": i,
                    "seo_title": h["name"] + " طبیعی | ارکام",
                    "meta_description": (h["body"][0])[:290],
                },
            )
            weights = []
            for weight, price in h["prices"]:
                weights.append(weight)
                Variant.objects.update_or_create(
                    sku="ARK-%s-%s" % (h["slug"].upper(), weight),
                    defaults={
                        "product": product, "weight_g": weight, "price": price,
                        "sale_price": None, "sale_start": None, "sale_end": None,
                        "stock": max(h["stock"], 0), "reserved": 0, "active": True,
                    },
                )
            product.variants.exclude(weight_g__in=weights).update(active=False)
        # Retire the clearly labelled demo storefront.
        Product.objects.filter(slug__startswith="demo-").update(active=False, featured=False)
        Category.objects.filter(slug__startswith="demo-").update(active=False)
        SiteContent.objects.filter(key="demo-notice").update(published=False)
        contact, _ = SiteContent.objects.get_or_create(key="contact", defaults={"title": "در کنار شما هستیم"})
        settings = {k: v for k, v in (contact.settings or {}).items() if k != "demo"}
        settings.update({
            "email": "info@arkham.ir",
            "instagram": "arkam.honey",
            "footer_text": "عسل طبیعی تک‌گل از کوهستان‌های ایران؛ برداشت‌شده با حوصله، بسته‌بندی‌شده با وسواس.",
            "socials": [{"label": "اینستاگرام", "url": "https://instagram.com/arkam.honey"}],
        })
        contact.title, contact.body, contact.settings, contact.published = "در کنار شما هستیم", CONTACT_BODY, settings, True
        contact.save()
        faq, _ = SiteContent.objects.get_or_create(key="faq", defaults={"title": "پرسش‌های متداول"})
        faq.title = "پرسش‌های شما، پاسخ‌های روشن"
        faq.body = "پاسخ کوتاه به پرسش‌هایی که بیشتر از ما می‌پرسند. اگر جوابتان را پیدا نکردید، از صفحهٔ تماس پیام بگذارید."
        faq.settings, faq.published = {"sections": FAQ}, True
        faq.save()
        story, _ = SiteContent.objects.get_or_create(key="story", defaults={"title": "حرف ما"})
        if (story.settings or {}).get("demo") or "نمایشی" in (story.body or "") or not story.body:
            story.title = "از کوهستان، تا سفرهٔ شما"
            story.body = "\n\n".join([
                "ارکام از یک باور ساده شروع شد: عسل خوب حوصله می‌خواهد؛ حوصلهٔ زنبور، حوصلهٔ فصل‌ها و حوصلهٔ ما برای این‌که هر شیشه درست به دستتان برسد.",
                "عسل‌های ما از گیاهان و مناطق مشخص می‌آیند؛ از آویشن کوهستان‌های خراسان تا کنار و سدر جنوب. برای هر شیشه نوشته‌ایم از کدام گل، کدام منطقه و کدام فصل آمده و چه طعمی دارد.",
                "رنگ مشکی و طلایی ارکام از دل کندو آمده است؛ تاریکی آرامی که زنبورها در آن، شهد گل‌ها را آرام‌آرام به طلا تبدیل می‌کنند.",
                "اگر نمی‌دانید از کجا شروع کنید، عسل‌یاب ارکام کمکتان می‌کند؛ و هر سؤالی داشتید، به info@arkham.ir بنویسید.",
            ])
            story.settings = {k: v for k, v in (story.settings or {}).items() if k != "demo"}
            story.published = True
            story.save()
        benefits, _ = SiteContent.objects.get_or_create(key="benefits", defaults={"title": "با حوصله انتخاب کنید"})
        benefits.title, benefits.published = "با حوصله انتخاب کنید", True
        benefits.body = "برای هر عسل، گل منبع، منطقه و شناسنامهٔ طعمش را نوشته‌ایم تا با خیال راحت انتخاب کنید."
        benefits.settings = {"items": [
            {"title": "شناسنامهٔ گل و طعم", "body": "گل منبع، منطقه، فصل برداشت، رنگ و طعم هر عسل."},
            {"title": "انتخاب وزن دلخواه", "body": "شیشه‌های نیم‌کیلویی، ۶۵۰ گرمی و یک‌کیلویی."},
            {"title": "پیگیری آنلاین سفارش", "body": "وضعیت سفارش را از حساب خود دنبال کنید."},
        ]}
        benefits.save()
        # The brand's default look is the dark "noir hive" theme.
        SiteContent.objects.update_or_create(
            key="site-design",
            defaults={"title": "طراحی ظاهر سایت", "settings": {"schemaVersion": 1, "styleId": "noir_hive"}, "published": True},
        )
        SiteContent.objects.update_or_create(
            key=MARKER, defaults={"title": "نسخهٔ کاتالوگ", "settings": {"version": CATALOG_VERSION}, "published": False}
        )
        self.stdout.write(self.style.SUCCESS(
            "Catalogue v%s: %s honeys in %s categories; demo products and notice retired."
            % (CATALOG_VERSION, len(HONEYS), len(CATEGORIES))
        ))
