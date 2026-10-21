# استقرار محافظه‌کارانه روی Ubuntu VPS

**در این جلسه هیچ سرور، DNS، دامنه یا کانتینر عمومی تغییر نکرده است.** Docker در محیط اجرا وجود نداشت؛ دستورها راهنمای استقرار هستند، نه گزارش استقرار موفق. برای بهره‌برداری واقعی ابتدا همه موارد `STATUS.fa.md` را برطرف کنید.

## ۱. پیش‌نیاز و بررسی بدون تغییر

Ubuntu LTS پشتیبانی‌شده، Docker Engine و Compose v2، DNS قابل مدیریت، دسترسی مدیریتی مجاز، فضای پشتیبان خارج از VPS و Nginx موجود/اختصاصی لازم است.

```bash
sudo ss -lntp
docker compose ls
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
df -h
sudo nginx -T > nginx-before-arkham.txt
```

فایل آخر ممکن است جزئیات پیکربندی داخلی داشته باشد؛ آن را عمومی نکنید. بدون بررسی، پورت‌های 80/443 را اشغال نکنید، کانتینرهای دیگر را متوقف نکنید و `docker system prune` یا `down -v` اجرا نکنید. اگر 8088 اشغال است، فقط HTTP_PORT همین پروژه و upstream اختصاصی آن را عوض کنید.

## ۲. DNS و گواهی

A رکوردهای `arkham.ir` و `www.arkham.ir` را به IP همین VPS تنظیم کنید. اگر IPv6 سرویس‌دهی ندارید AAAA نادرست قرار ندهید. فایل `deploy/arkham.nginx.conf` مخصوص این دامنه است؛ آن را روی تنظیمات عمومی Nginx ننویسید.

ابتدا تنها بخش HTTP و مسیر `/.well-known/acme-challenge/` را در یک فایل سایت اختصاصی فعال کنید. سپس با ابزار ACME مجاز سرور، برای هر دو دامنه گواهی بگیرید. برای نمونه، در صورت استفاده از certbot و تأیید وضعیت سرور:

```bash
sudo mkdir -p /var/www/letsencrypt
sudo certbot certonly --webroot -w /var/www/letsencrypt -d arkham.ir -d www.arkham.ir
```

این دستور نیاز به نصب/تنظیم certbot، دسترسی واقعی به دامنه و تأیید شرایط سرویس دارد؛ در این محیط اجرا نشده است. بعد از ایجاد فایل‌های گواهی، بخش‌های TLS کانفیگ را فعال کنید. `www` به دامنه اصلی redirect می‌شود. تمدید خودکار و reload پس از تمدید را آزمایش کنید.

## ۳. متغیرها و کمینه‌سازی دسترسی

```bash
cp .env.example .env
chmod 600 .env
python3 -c 'import secrets; print(secrets.token_urlsafe(60))'
```

خروجی فرمان را برای SECRET_KEY در محیط امن ذخیره کنید؛ دو رمز مستقل و قوی برای PostgreSQL owner و app بسازید. فایل .env را commit نکنید. `DEBUG=0`، `PAYMENT_PROVIDER=disabled` تا پایان تأیید درگاه، PUBLIC_ORIGIN=https://arkham.ir و origins/hosts دقیق باشند.

- `POSTGRES_USER/POSTGRES_PASSWORD` فقط مالک bootstrap/پشتیبان PostgreSQL هستند.
- `POSTGRES_APP_USER/POSTGRES_APP_PASSWORD` حساب برنامه با NOSUPERUSER / NOCREATEDB / NOCREATEROLE هستند.
- backend فقط اعتبار حساب app را دریافت می‌کند، نه رمز owner.
- اسکریپت init فقط روی volume خالی اجرا می‌شود. تغییر این متغیرها روی دیتابیس موجود رمز/role را تغییر نمی‌دهد؛ تغییرهای بعدی باید با طرح migration مجاز انجام شوند.
- روی PostgreSQL واقعی قبل از انتشار، `SHOW server_encoding` باید UTF8 باشد.
- هدر X-Forwarded-Proto فقط از proxy مورد اعتماد پذیرفته می‌شود. پورت frontend فقط localhost است؛ آن را بدون طراحی proxy امن روی 0.0.0.0 منتشر نکنید.

## ۴. راه‌اندازی و migration

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 migrate backend frontend
./scripts/create-admin.sh
```

پیش‌فرض نام پروژه Compose برابر arkham است؛ volumeها و شبکه نام مستقل دارند. migrate یک سرویس یک‌باره است؛ خطای آن نباید با حذف دیتابیس پنهان شود. backend و frontend non-root هستند. imageهای رسمی PostgreSQL/Redis مدیریت user داخلی خود را دارند.

پروکسی میزبان بعد از تست کانفیگ:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://arkham.ir/api/v1/health/
```

این فرمان‌ها فقط پس از بررسی کانفیگ اختصاصی اجرا شوند. Health، دیتابیس و cache را بررسی می‌کند؛ معتبر بودن پذیرندگی، ارسال سفارش و کیفیت محتوای فروشگاه را تضمین نمی‌کند.

## ۵. پیش از بازکردن فروش

لوگو و عکس‌های اصلی، محصولات/قیمت‌ها، موجودی واقعی، روش و هزینه ارسال، شماره تماس، قوانین و حریم خصوصی را وارد کنید. نقش‌ها را به افراد مورد اعتماد تخصیص دهید. مسیر کامل خرید، callback، خرید هم‌زمان، شکست درگاه و reconciliation را روی محیط staging بررسی کنید. Production mock نمی‌پذیرد.

`check --deploy` با تنظیمات production اجرا شود. HSTS فعال است ولی preload عمداً فعال نشده است؛ هشدار `security.W021` تا تصمیم آگاهانه مالک دامنه باقی می‌ماند. کل دامنه و زیر‌دامنه‌ها را بدون بررسی به preload اضافه نکنید.

## ۶. پشتیبان و بازیابی

```bash
./scripts/backup.sh
```

dump فشرده PostgreSQL و tar رسانه‌ها با دسترسی محدود در backups ذخیره می‌شود. فایل‌ها شامل داده مشتری هستند؛ رمزگذاری، محدودیت دسترسی، نگهداری نسخه‌ها و انتقال خارج VPS ضروری است. برای سازگاری snapshot دیتابیس و media، در بازه پشتیبان‌گیری، نوشتن محتوا/آپلود را موقتاً متوقف کنید؛ این دو فایل یک snapshot توزیع‌شده اتمیک نیستند.

بازیابی را ابتدا در **دیتابیس تازه staging** و media جدا آزمایش کنید؛ نام واقعی فایل‌ها و دیتابیس را جایگزین کنید:

```bash
docker compose exec postgres sh -c 'createdb -U "$POSTGRES_USER" -O "$POSTGRES_APP_USER" arkham_restore_check'
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" --no-owner --role="$POSTGRES_APP_USER" -d arkham_restore_check' < backups/database-TIMESTAMP.dump
```

رسانه را در مسیر تازه با `tar -tzf` بررسی و سپس با مالک/دسترسی درست بازیابی کنید. هرگز tar ناشناس را روی ریشه سرور extract نکنید. تست restore، شمارش رکوردها، عکس‌ها و نمونه سفارش‌ها را بررسی کنید؛ فقط داشتن dump به معنی قابل‌بازیابی بودن نیست. برای جایگزینی دیتابیس Production، توقف نوشتن، برنامه rollback و تأیید مسئول لازم است؛ دستور مخرب خودکار ارائه نشده است.

## ۷. به‌روزرسانی امن

از کد و داده‌ها نسخه بگیرید. ابتدا در staging build/test/migrate را انجام دهید. به‌دلیل تغییر schema، rollback کد ممکن است نیازمند migration برگشتی یا بازیابی داده باشد.

```bash
docker compose build backend frontend
docker compose run --rm migrate
docker compose up -d backend frontend
docker compose ps
```

backend و frontend باید از یک revision ساخته شوند تا hash دارایی‌ها همسان باشد. در تغییرهای ناسازگار از maintenance window استفاده کنید؛ rolling deploy تضمین‌شده پیاده نشده است. هرگز برای به‌روزرسانی عادی volume حذف نکنید. لاگ Gunicorn عمداً URL و query را ثبت نمی‌کند تا authority و اطلاعات احتمالی مشتری در access log آن منتشر نشوند؛ policy لاگ Nginx و reverse proxy میزبان را نیز بررسی کنید.

## ۸. عملیات مالی

کران `expire_unstarted` فقط سفارش‌های منقضی با payment.state=new را لغو می‌کند. وضعیت‌های pending/unknown/requesting خودکار آزاد نمی‌شوند. `reconcile_payment ORDER_UUID` فقط verify مستقیم authority شناخته‌شده را تکرار می‌کند. برای تراکنش بدون authority، شکست نهایی، برگشت وجه و آزادسازی موجودی پس از تأیید شکست، نیاز به رویه مالی و تکمیل ابزارهای مدیریتی وجود دارد. این‌ها مانع انتشار تجاری بدون نظارت هستند.
