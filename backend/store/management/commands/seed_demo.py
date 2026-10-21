"""Opt-in, repeatable demo dataset. Never creates accounts or paid orders."""
from pathlib import Path
from datetime import timedelta
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from store.models import Category, Product, Variant, ProductImage, Article, SiteContent, SiteAsset, ShippingMethod, Coupon

PAGES = {
'story': ('روایتی از طبیعت، برای لحظه‌های آرام', 'این داستان، روایت نمایشی برند در نسخه دمو است؛ سابقه یا ادعای واقعی درباره کسب‌وکار نیست.\n\nارکام در این روایت از یک ایده ساده آغاز می‌شود: گاهی یک قاشق عسل، دعوتی است به آهسته‌تر زندگی کردن. صبحی که فرصت می‌کنیم کنار پنجره بنشینیم، نان تازه را قسمت کنیم و طعم‌ها را با حوصله کشف کنیم.\n\nهویت طلایی و مشکی مجموعه از همین تضاد الهام می‌گیرد؛ گرمای عسل در کنار سکوت یک ظرف ساده. خطوط شش‌ضلعی نشان، یادآور نظمی است که در دل کندو دیده می‌شود.\n\nدر این مجموعه نمایشی، رایحه آویشن، لطافت شکوفه‌ها و گرمای رنگ کهربایی کنار هم قرار گرفته‌اند تا انتخاب محصول و تجربه هدیه دادن را ببینید. تمام تصویرها تولیدشده با هوش مصنوعی و همه قیمت‌ها نمونه‌اند.\n\nداستان واقعی تولید، محل برداشت و نتایج آزمون هر محصول پیش از فروش توسط مالک جایگزین خواهد شد.'),
'benefits': ('با حوصله انتخاب کنید', 'جزئیات کوچک، تجربه‌ای یکپارچه می‌سازند. در این نسخه می‌توانید انتخاب وزن، مشاهده تصاویر، سبد و پرداخت آزمایشی را امتحان کنید.'),
'faq': ('پرسش‌های شما، پاسخ‌های روشن', 'این پرسش‌ها و پاسخ‌ها نمونه‌اند و شرایط واقعی فروش محسوب نمی‌شوند.'),
'shipping': ('راهنمای ارسال و مرجوعی — نمونه', 'این صفحه صرفاً متن نمایشی است؛ تعهد تجاری یا حقوقی ایجاد نمی‌کند.\n\nدر سناریوی دمو، روش ارسال را هنگام تسویه انتخاب می‌کنید. هزینه نهایی از روی روش انتخاب‌شده در سرور محاسبه می‌شود. زمان تحویل واقعی و محدوده پوشش هنوز تعیین نشده‌اند.\n\nبرای کالای آسیب‌دیده، در سناریوی نمونه ابتدا از بسته عکس تهیه و از فرم تماس پیام ثبت می‌شود. مهلت و شرایط نهایی مرجوعی باید پیش از آغاز فروش توسط مالک تأیید شوند.'),
'privacy': ('داده‌های شما در این نسخه آزمایشی', 'این متن نمونه است و جایگزین سیاست حقوقی تأییدشده نیست.\n\nفرم‌های حساب، آدرس و پشتیبانی اطلاعات واردشده را در دیتابیس همین محیط ذخیره می‌کنند. برای آزمایش از نام، ایمیل و آدرس واقعی استفاده نکنید.\n\nخبرنامه تنها آدرس و رضایت ثبت‌شده را ذخیره می‌کند؛ ارسال ایمیل متصل نیست. درگاه پرداخت این نسخه فقط Mock است و هیچ اطلاعات کارت بانکی درخواست نمی‌شود.\n\nسیاست نهایی نگهداری، حذف داده، مسئول رسیدگی و اطلاعات تماس باید پیش از انتشار تجاری تکمیل شوند.'),
 'terms': ('شرایط استفاده از نسخه دمو', 'این فروشگاه یک محیط نمایشی است. محصولات، تصاویر، موجودی، قیمت‌ها، هزینه ارسال و کد تخفیف، داده آزمایشی هستند و پیشنهاد فروش واقعی نیستند.\n\nثبت سفارش و موفقیت پرداخت فقط برای آزمایش نرم‌افزار است؛ کالایی ارسال نمی‌شود و وجهی دریافت نمی‌شود.\n\nتصویر محصولات با هوش مصنوعی تولید شده و شکل واقعی بسته‌بندی یا کیفیت محصول را تأیید نمی‌کند. متن مقالات، معرفی نمونه است و توصیه درمانی یا تضمین اصالت محسوب نمی‌شود.'),
 'contact': ('در کنار شما هستیم — نسخه دمو', 'برای دیدن روند پشتیبانی می‌توانید از فرم روبه‌رو یک پیام آزمایشی ثبت کنید. ایمیل نمایشی: hello@arkham.example\n\nاین آدرس عملیاتی نیست؛ ارسال ایمیل یا پاسخ خودکار در این نسخه فعال نشده است. اطلاعات تماس واقعی پیش از انتشار جایگزین می‌شوند.'),
 'demo-notice': ('نسخه نمایشی', 'محصولات، تصاویر و قیمت‌ها دمو هستند؛ پرداخت فقط آزمایشی است.'),
}
ARTICLES = [
 ('demo-honey-tasting', 'یک راه ساده برای چشیدن عسل', 'طعم، رایحه و بافت؛ سه جزئیاتی که یک مکث کوتاه را دلچسب‌تر می‌کنند.', 'breakfast', 'این مقاله نمونه محتوایی نسخه دمو است و درباره محصولات واقعی ارکام ادعایی ندارد.\n\nبا مقدار کمی عسل و یک قاشق تمیز شروع کنید. پیش از چشیدن، به رنگ و رایحه توجه کنید؛ تفاوت رنگ به‌تنهایی معیار اصالت یا کیفیت نیست.\n\nبرای مقایسه، عسل‌ها را در دمای مشابه و بدون همراهی خوراکی‌های پررایحه بچشید. بین هر دو نمونه کمی آب بنوشید و برای توصیف حس خود از واژه‌هایی مثل ملایم، گلی یا گرم استفاده کنید.\n\nنان ساده، ماست ساده یا پنیر می‌توانند برای تجربه طعم انتخاب‌های متفاوتی باشند. پیشنهادهای این مطلب صرفاً ایده سرو هستند، نه توصیه پزشکی.\n\nبه کودکان زیر یک سال عسل ندهید. برای محدودیت‌های غذایی شخصی، نظر متخصص سلامت را ملاک قرار دهید.'),
 ('demo-crystallisation', 'وقتی بافت عسل تغییر می‌کند', 'نگاهی کوتاه به بلوری‌شدن و اهمیت نگهداری مناسب، بدون آزمون‌های خانگی گمراه‌کننده.', 'comb', 'این مطلب برای تکمیل مجله دمو نوشته شده است؛ گواه کیفیت هیچ محصولی نیست.\n\nعسل می‌تواند با گذشت زمان بلوری شود. سرعت و شکل این تغییر به ترکیب قندها، دما و شرایط نگهداری وابسته است. بلوری‌شدن به‌تنهایی اصالت یا تقلبی‌بودن عسل را ثابت نمی‌کند.\n\nظرف را دربسته، در جای خشک و دور از نور مستقیم نگه دارید. همیشه از قاشق تمیز و خشک استفاده کنید تا رطوبت اضافی وارد ظرف نشود.\n\nاگر بافت روان‌تر را ترجیح می‌دهید، راهنمای نگهداری همان محصول را بخوانید و از حرارت شدید یا مستقیم پرهیز کنید.\n\nبرای ارزیابی اصالت، اطلاعات قابل رهگیری و آزمون معتبر اهمیت دارند؛ ترفندهای شعله، دستمال یا حل‌شدن در آب جایگزین آزمایش معتبر نیستند.'),
 ('demo-gift-ritual', 'هدیه‌ای برای یک صبح آرام', 'چند ایده برای چیدمان یک هدیه ساده با رنگ‌های طلایی، مشکی و عاجی.', 'meadow', 'این راهنما، محتوای نمایشی مجموعه هدیه است؛ بسته‌بندی تصاویر نیز تولیدشده با هوش مصنوعی است.\n\nهدیه خوب لزوماً شلوغ نیست. یک یا دو انتخاب هماهنگ، یک یادداشت کوتاه و بسته‌بندی مرتب می‌توانند حس شخصی‌تری بسازند.\n\nبرای ترکیب رنگ‌ها، مشکی را زمینه و طلایی را تأکید در نظر بگیرید. کاغذ عاجی یا بافت طبیعی، گرمای بیشتری به چیدمان می‌دهد.\n\nاگر خوراکی هدیه می‌دهید، حساسیت‌ها و محدودیت‌های غذایی گیرنده را در نظر بگیرید. ترکیبات، وزن و تاریخ مصرف باید روی محصول واقعی روشن باشند.\n\nدر نسخه دمو، مجموعه هدیه تنها برای آزمایش گالری، انتخاب وزن و سبد ثبت شده است و موجودی واقعی برای ارسال نیست.'),
]

class Command(BaseCommand):
    help = 'Create clearly labelled demo content and generated images; requires DEMO_MODE=1, DEBUG=1, mock payment.'
    def add_arguments(self, parser):
        parser.add_argument('--confirm-demo', action='store_true')
    @transaction.atomic
    def handle(self, *args, **opts):
        if not (opts['confirm_demo'] and settings.DEBUG and settings.DEMO_MODE and settings.PAYMENT_PROVIDER == 'mock'):
            raise CommandError('Requires --confirm-demo, DEBUG=1, DEMO_MODE=1 and PAYMENT_PROVIDER=mock. Use a separate demo database.')
        for key in PAGES:
            old = SiteContent.objects.filter(key=key).first()
            if old and not old.settings.get('demo'):
                raise CommandError(f'Refusing to overwrite non-demo content: {key}')
        assets = Path(settings.BASE_DIR) / 'demo_assets'
        if not (assets/'thyme.webp').exists():
            raise CommandError('Bundled demo images are missing.')
        cats=[]
        for slug,name,desc in [('floral','عسل‌های گل‌محور','از رایحه گیاهان تا لطافت شکوفه‌ها؛ انتخاب‌های نمایشی مجموعه.'),('signature','انتخاب‌های ویژه','ترکیب‌های الهام‌گرفته از طبیعت برای تجربه‌ای متفاوت؛ نمونه دمو.'),('gifts','مجموعه هدیه','چیدمان‌های مشکی و طلایی برای یک هدیه خوش‌سلیقه؛ نمونه دمو.')]:
            c,_=Category.objects.update_or_create(slug='demo-'+slug,defaults={'name':name,'description':desc,'active':True});cats.append(c)
        items=[('thyme','عسل آویشن',0,385000,'رایحه‌ای گیاهی، رنگی کهربایی و پیشنهادی برای همراهی صبحانه.'),('acacia','عسل اقاقیا',0,425000,'تصویری از عسل روشن با الهام از لطافت گل‌های اقاقیا.'),('mountain','عسل کوهستان',1,465000,'رنگی عمیق و الهام‌گرفته از چشم‌اندازهای کوهستانی.'),('walnut','عسل و گردو',1,445000,'یک ترکیب پیشنهادی برای میز صبحانه؛ در صورت حساسیت به گردو انتخاب نشود.'),('blossom','عسل بهارنارنج',0,395000,'الهامی از شکوفه‌های بهاری برای لحظه‌های آرام.'),('gift','جعبه هدیه ارکام',2,890000,'دو شیشه در یک چیدمان هدیه مشکی و طلایی؛ بسته‌بندی صرفاً نمایشی.')]
        for i,(slug,name,c,price,desc) in enumerate(items):
            p,_=Product.objects.update_or_create(slug='demo-'+slug,defaults={'name':name,'category':cats[c],'active':True,'featured':True,'sort_order':i,'description':'نمونه نمایشی؛ تصویر تولیدشده با هوش مصنوعی و قیمت غیرواقعی. '+desc,'storage':'راهنمای نمونه: در جای خشک، دور از نور و با درِ بسته نگهداری شود. اطلاعات واقعی باید روی برچسب محصول درج شوند.','specifications':{'وضعیت':'محصول دمو؛ قابل ارسال نیست','تصویر':'تولیدشده با هوش مصنوعی','ترکیبات نمونه':'عسل و گردو — حاوی مغز گردو' if slug=='walnut' else 'عسل — نمونه نمایشی','گزارش آزمایش':'برای این محصول دمو ارائه نشده است'},'seo_title':name+' | نمونه نمایشی ارکام','meta_description':'محصول نمایشی برای تست فروشگاه؛ فروش واقعی نیست.'})
            for weight,factor in ([(500,1),(1000,1.85)] if slug!='gift' else [(1000,1)]):
                Variant.objects.get_or_create(sku=f'DEMO-{slug.upper()}-{weight}',defaults={'product':p,'weight_g':weight,'price':round(price*factor),'stock':24,'active':True})
            image=ProductImage.objects.filter(product=p,position=0).first()
            if not image:
                image=ProductImage(product=p,position=0,alt=name+' — تصویر دمو تولیدشده با هوش مصنوعی');image.image.save('demo-'+slug+'.webp',ContentFile((assets/(slug+'.webp')).read_bytes()))
        for key,(title,body) in PAGES.items():
            extra={}
            if key=='faq':extra['sections']=[{'title':'آیا خرید در این نسخه واقعی است؟','body':'خیر. سفارش و پرداخت صرفاً آزمایشی هستند و کالایی ارسال نمی‌شود.'},{'title':'قیمت و عکس محصولات واقعی‌اند؟','body':'خیر؛ قیمت‌ها نمونه و عکس‌ها تولیدشده با هوش مصنوعی هستند.'},{'title':'چطور کد تخفیف را امتحان کنم؟','body':'در تسویه، کد DEMO10 را برای تخفیف نمونه ده‌درصدی وارد کنید.'},{'title':'آیا ثبت حساب و پیام کار می‌کند؟','body':'بله، در دیتابیس همین محیط ثبت می‌شوند؛ لطفاً فقط اطلاعات تست وارد کنید.'}]
            if key=='benefits':extra['items']=[{'title':'انتخاب وزن','body':'گونه‌های ۵۰۰ و ۱۰۰۰ گرمی را در صفحه محصول امتحان کنید.'},{'title':'بسته‌بندی هدیه','body':'یک چیدمان تصویری نمونه برای نمایش هویت برند.'},{'title':'خرید آزمایشی','body':'از سبد تا تأیید پرداخت Mock، بدون دریافت وجه.'}]
            SiteContent.objects.update_or_create(key=key,defaults={'title':title,'body':body,'published':True,'settings':{'demo':True,**extra}})
        for key,file in [('story-image','meadow'),('editorial-image','editorial')]+[('article-'+a[0],a[3]) for a in ARTICLES]:
            obj=SiteAsset.objects.filter(key=key).first()
            if obj:continue
            obj=SiteAsset(key=key,alt='تصویر تحریریه دمو؛ تولیدشده با هوش مصنوعی');source=assets/'v4'/(file+'.webp') if (assets/'v4'/(file+'.webp')).exists() else assets/(file+'.webp');obj.image.save(('demo-v4-' if source.parent.name=='v4' else 'demo-')+file+'.webp',ContentFile(source.read_bytes()))
        for slug,title,excerpt,body_image,body in ARTICLES:
            Article.objects.update_or_create(slug=slug,defaults={'title':title,'excerpt':excerpt,'body':body,'published':True})
        for name,cost in [('ارسال استاندارد — دمو',35000),('ارسال ویژه — دمو',65000)]:ShippingMethod.objects.update_or_create(name=name,defaults={'cost':cost,'active':True})
        Coupon.objects.update_or_create(code='DEMO10',defaults={'kind':'percent','value':10,'minimum':200000,'starts_at':timezone.now()-timedelta(days=1),'ends_at':timezone.now()+timedelta(days=90),'usage_limit':500,'per_user_limit':5,'active':True})
        self.stdout.write(self.style.SUCCESS('Demo ready: 6 products, 11 variants, 3 categories, 3 articles, 8 pages, 5 brand/editorial assets, 2 shipping options and DEMO10. No account, reviews or paid orders created.'))
