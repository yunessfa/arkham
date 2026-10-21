# ارکام — سیستم یکپارچه Visual + Motion، نسخه V5

## دامنه تحویل

بازطراحی در کد پروژه V4 انجام شده است؛ این جلسه به سرور یا مخزن Git مالک متصل نیست و چیزی روی دامنه منتشر نکرده است. نسخه V5 باید ابتدا به مخزن یا روش استقرار مالک منتقل شود.

هدف، گسترش هویت Home به مجموعه، دسته‌بندی، محصول، مجله، مقاله، داستان، صفحات اطلاعاتی، تماس، سبد و مسیرهای حساب/تسویه/سفارش است. تجربه اصلی Home بازسازی یا جایگزین نشده است.

## Audit و موارد حفظ‌شده

- `main.tsx`: مسیرها، داده‌های سروری، فرم‌های خرید/پشتیبانی/خبرنامه، نقش‌ها و پنل بررسی شدند؛ کارت‌های محصول و مقاله implementation مشترک دارند.
- `style.css`: لایه‌های قدیمی روشن/تیره، کارت‌ها، فرم‌ها، modal، breakpointها و revealهای V3 بررسی شدند. تداخل رنگ سراسری `header` و pseudo-element نشان empty در بازبینی رفع شد.
- `ScrollExperience.tsx`: Lenis با touch طبیعی، observer و RAF وجود داشت. نسخه V5 همان وابستگی و الگوی native flow را حفظ می‌کند و ثبت عناصر/پاک‌سازی را یکپارچه می‌کند.
- `ExperienceShell.tsx`، `timeline.ts`، `BotanicalLayer.tsx`، `experience.css` و `Scene.tsx`: منبع هفت فصل، درون‌یابی رنگ/حرکت، Jar/Bee، cleanup، حالت کاهش حرکت، fallback و inert بررسی شدند. **هیچ‌کدام از این فایل‌ها تغییر نکرده‌اند.**
- `api.ts`، تمام فایل‌های backend و package/lock وابستگی‌های runtime تغییر نکرده‌اند. migration، API endpoint یا فیلد تازه اضافه نشده است.
- API مقاله فقط عنوان، slug، excerpt، body و updated_at دارد؛ دسته‌بندی ساختگی به مقاله نسبت داده نشده است. عبارت NATURE / HONEY / CRAFT امضای تحریریه است، نه دستهٔ ذخیره‌شدهٔ مقاله.

گزارش SHA-256 فایل‌های حفاظت‌شده در `qa/reports/v5-preservation.json` قرار دارد. این تطبیق با کد محلی V4 است، نه اثبات تطبیق با commit نامشخص سرور مالک.

## ساختار جدید

| مسیر | مسئولیت |
|---|---|
| `frontend/src/components/Atelier.tsx` | HoneyPattern با ID اختصاصی SVG، BotanicalDecoration، CinematicDivider، BrandedFallback و PageHeader |
| `frontend/src/motion/Motion.tsx` | Reveal/RevealGroup، ImageReveal، Spotlight، PageTransition و ImageZoom |
| `frontend/src/motion/policy.ts` | محدودیت stagger، مسیرهای workflow و clamp حرکت pointer |
| `frontend/src/motion/motion.css` | توکن‌ها، ریتم motion، تمام compositionهای صفحات و breakpointها |
| `frontend/src/ScrollExperience.tsx` | یک observer مشترک، ثبت داده‌محور reveal و یک RAF مشترک Lenis/parallax |
| `frontend/src/main.tsx` | اتصال صفحات و کارت‌های مشترک، فیلتر disclosure، فوتر و حفظ تمام actionها |
| `frontend/tests/motion.test.mjs` | تست محدودیت‌های حرکت و مسیرهای workflow |

هیچ dependency جدیدی به پروژه اضافه نشده است. Prettier فقط ابزار بیرونی قالب‌بندی بود و به package.json یا lockfile پروژه اضافه نشده است.

## زبان بصری و صفحات

- کرم/عاجی، مشکی عمیق، سبز جنگلی، طلایی کهنه و عسل؛ Vazirmatn موجود حفظ شده است.
- `/products`: Hero سبز تیره، فیلتر بازشونده، تصویرهای قوسی، سلسله‌مراتب محصول/وزن/قیمت/موجودی و خرید سروری.
- `/category/:slug`: عنوان و توضیح واقعی دسته با composition گیاهی متفاوت؛ همان فیلترها و کارت مشترک.
- `/products/:slug`: گالری، thumbnail انتخاب‌شده، dialog بزرگ‌نمایی بومی با Escape/focus trap، spotlight حداکثر ۵px، فرم وزن/تعداد و اطلاعات/نظرات/محصولات مرتبط. spotlight در موبایل و کاهش حرکت خاموش است.
- `/journal`: یک مقاله برجسته و دو مقاله کوچک، سپس ادامه grid؛ تاریخ واقعی updated_at، excerpt، تصاویر منتشرشده و CTA.
- `/journal/:slug`: breadcrumb، عنوان، خلاصه، تاریخ، تصویر بزرگ با drift نرم دسکتاپ، متن خوانا و divider؛ نقل‌قول یا ادعای تازه در مقاله ساخته نشده است.
- `/pages/story`: پاراگراف‌های همان محتوای موجود در فصل‌های شماره‌دار روشن/تیره. تعداد فصل‌ها تابع پاراگراف‌هاست، نه ادعای ساختگی درباره تاریخ برند.
- FAQ/Shipping/Privacy/Terms و Contact: تیتر و تایپوگرافی مشترک، native details و فرم‌های قبلی حفظ شده‌اند.
- سبد، تسویه، حساب، سفارش، ورود و پنل: Header کم‌ارتفاع و هماهنگ؛ ترتیب فرم‌ها/امنیت/actionها دست‌نخورده‌اند. Lenis در workflowها غیرفعال و اسکرول طبیعی است.
- پس از Home، Collection با cream/pattern/divider، دسته‌بندی با botanical/hex و Journal با ترکیب نامتقارن ادامه می‌یابد. Footer با headline، pattern و همان خبرنامه/لینک‌ها پایان تجربه است.

## قرارداد Motion

- micro حدود ۲۴۰ms، hover حدود ۶۰۰–۷۰۰ms، reveal حدود ۹۰۰–۱۰۵۰ms.
- stagger به چرخه ۰/۸۰/۱۶۰/۲۴۰ms محدود است؛ لیست بلند زمان انتظار نامحدود نمی‌سازد.
- نشانه‌های `data-reveal="heading|image|label|card|cta"` و `data-reveal-group` قابل استفاده‌اند. wrapperهای Reveal/RevealGroup برای مصرف کامپوننتی هم وجود دارند؛ برای جلوگیری از wrapper اضافه، صفحات عمدتاً از data attribute استفاده می‌کنند.
- navigation: URL بدون انتظار شبکه تغییر می‌کند؛ خروج محتوای قبلی ۱۴۰ms و ورود ۶۲۰ms است. overlay کم‌رنگ و pointer-events:none است. **هیچ transform روی wrapper اصلی نیست** تا sticky صحنه Home حفظ شود. محتوای خروجی موقتاً inert می‌شود و سپس focus به H1 مقصد می‌رود.
- Lenis همان duration=1.05، syncTouch=false و anchor support را نگه داشته است. reset اسکرول در PageTransition متمرکز شده و Header فقط منو را می‌بندد.
- parallax محدود به دسکتاپ با pointer دقیق است؛ motionهای غیرضروری با prefers-reduced-motion خاموش می‌شوند. تصاویر lazy/async هستند؛ Hero مقاله eager است.
- بعد از خروج، observer/listener/RAF/Lenis و frameهای pointer پاک می‌شوند. drift خواندن‌های هندسی را پیش از نوشتن CSS variables جمع می‌کند.
- Skeletonها کارت تصویری دارند؛ reduced-motion shimmer را خاموش می‌کند. تصویر ناموجود با SVG/text برند جایگزین می‌شود؛ عکس مصنوعی تازه ساخته نشده است.

## تصاویر و داده‌ها

هیچ تصویر یا دارایی جدیدی در API، مدیا یا seed ایجاد نشده است. عکس‌های دمو قدیمی ممکن است AI-generated باشند؛ همان‌ها با هشدار DEMO و altهای موجود استفاده می‌شوند و به‌عنوان عکس واقعی محصولات مالک معرفی نمی‌شوند. برای تولید، مالک باید تصاویر/متن/قیمت/موجودی تأییدشده خود را منتشر کند.

## تست، محدودیت و پذیرش

گزارش‌های V5 با پیشوند `v5-` مشخص‌اند؛ گزارش‌های V4 و V3 تاریخی‌اند.

- TypeScript و Vite با `npm run build`، تست‌های واحد با `npm test`.
- suite موجود Django/PostgreSQL و سناریوی مرورگری ثبت‌نام، خرید، Mock، نظر و مدیریت روی دیتابیس موقت جدا اجرا می‌شوند. سناریوی اصلی حذف یا ضعیف نشده؛ کنترل overflow موبایل تسویه، حساب و سفارش به آن افزوده شده است.
- آزمون اختصاصی صفحات: مسیرهای عمومی، فیلترها، dialog، ناوبری، empty/fallback، کاهش حرکت و breakpointهای ۱۴۴۰، ۱۲۰۰، ۱۰۲۴، ۷۶۸، ۴۸۰ و ۳۶۰.
- رگرسیون Home: همان ۵۱ بررسی Canvas پایدار، هفت فصل، خرید API، کیبورد، unmount، fallback و ابعاد موبایل.
- آزمون layout برای جلوگیری از تبدیل‌شدن به load test، پاسخ GET عمومیِ تکراری را فقط داخل harness تست cache می‌کند؛ درخواست اول از API واقعی است، جست‌وجوی جدید URL تازه دارد و cart/session/POST cache نمی‌شوند. هیچ cache یا تغییر throttle به برنامه اضافه نشده است. تست‌های خرید مستقل از این harness هستند.
- بررسی تصویری جزو QA است؛ تصاویر منتخب در `qa/previews/` همراه بسته‌اند.

این گزارش گواه کامل WCAG، benchmark FPS، Lighthouse، GPU memory یا Safari/iOS واقعی نیست. زمان‌های CSS هدف طراحی‌اند، نه تضمین زمان رندر روی هر دستگاه؛ WebGL نرم‌افزاری محیط آزمون ممکن است کندتر باشد. تست روی گوشی فیزیکی و دامنه واقعی پس از استقرار لازم است. Docker در محیط این جلسه اجرا نشده است؛ موفقیت Docker نسخه قبلی روی سرور مالک، جای تأیید build و smoke-test همین نسخه را نمی‌گیرد.

## استقرار روی سرور موجود

این نسخه تغییر backend/schema ندارد؛ **seed و ساخت دوباره مدیر لازم نیست**. `.env`، media و volumeها را حفظ کنید. اول بکاپ بگیرید؛ روش کامل بکاپ در `CINEMATIC-V4.fa.md` آمده است.

۱. کد این بسته را با پروژهٔ خود ادغام و commit/push کنید. دریافت ZIP به‌تنهایی مخزن را به‌روز نمی‌کند. نام پوشه داخل ZIP، `arkham` است.

۲. روی سرور، پس از بررسی تغییرات محلی:

```bash
cd /home/ubuntu/arkham
git status
git pull --ff-only origin main
```

در صورت خطا، ادامه ندهید و تغییرات محلی را بررسی کنید. `git reset --hard` راه‌حل پیش‌فرض نیست.

۳. پس از موفقیت مرحله قبل:

```bash
docker compose config --quiet &&
docker compose build backend frontend &&
docker compose run --rm permissions &&
docker compose up -d &&
docker compose ps -a
```

```bash
docker compose logs --tail=80 permissions migrate backend frontend
curl -sS -o /dev/null -w 'Homepage HTTP: %{http_code}\n' -H 'Host: arkham.ir' http://127.0.0.1:8088/
curl -sS -o /dev/null -w 'API health HTTP: %{http_code}\n' -H 'Host: arkham.ir' http://127.0.0.1:8088/api/v1/health/
```

Backend هم خروجی build را مصرف می‌کند؛ فقط build فرانت‌اند کافی نیست. `permissions` و `migrate` باید Exited(0) شوند و سرویس‌های وب healthy. سپس دامنه، refresh کامل، موبایل، ورود مدیر قبلی، قیمت/موجودی، فیلتر، سبد و جریان پرداخت مجاز محیط را بررسی کنید. **`docker compose down -v` اجرا نکنید.** هیچ رمز یا فایل `.env` را در چت/گیت منتشر نکنید.
