# استقرار فروشگاه 50500 روی ابر لیارا

این راهنما دقیقاً برای معماری این پروژه نوشته شده: **اپ Docker + دیتابیس PostgreSQL + فضای ذخیره‌سازی ابری (Object Storage)**.
پروژه از قبل برای لیارا آماده است: `liara.json`، `deploy/Dockerfile`، درایور S3 با endpoint لیارا، و `.liaraignore`.

---

## ۰. سه سرویسی که باید بخرید

| سرویس | در لیارا | نقش در پروژه |
| --- | --- | --- |
| **اپلیکیشن Docker** | PaaS → اپلیکیشن‌ها → ایجاد برنامه → پلتفرم **Docker** | اجرای فروشگاه + API |
| **دیتابیس PostgreSQL** | پایگاه داده → ایجاد → PostgreSQL | سفارش‌ها، محصولات، کاربران (دائمی) |
| **فضای ذخیره‌سازی ابری** | ذخیره‌سازی ابری → ایجاد باکت | عکس محصولات، عکس خودروها، کتابخانه تصاویر |

> **توصیه:** هر سه را در **همان منطقه (region)** بسازید و اپ و دیتابیس را در **یک شبکهٔ خصوصی** قرار دهید.

---

## ۱. نصب ابزار خط فرمان

```bash
npm install -g @liara/cli
liara login        # توکن از: پنل لیارا → تنظیمات → API Token
```

---

## ۲. ساخت اپلیکیشن Docker

پنل: **ایجاد برنامه → Docker** → نام `shop50500` → حداقل ۲ هسته / ۴ گیگ رم (برای `sharp` و بیلد).

فایل `liara.json` در ریشهٔ پروژه همهٔ تنظیمات را حمل می‌کند:

```json
{
  "app": "shop50500",
  "platform": "docker",
  "port": 8080,
  "build": { "dockerfile": "./deploy/Dockerfile", "cache": true },
  "disks": [ { "name": "uploads", "mountTo": "/data/uploads" } ],
  "healthCheck": { "command": "CMD curl -fsS http://127.0.0.1:8080/api/health || exit 1",
                   "interval": 30, "timeout": 10, "retries": 3, "startPeriod": 30 }
}
```

- `deploy/Dockerfile` در دو مرحله می‌سازد: اول فرانت با Vite، بعد ران‌تایم سبک با `sharp`.
- روی **دیسک `uploads`** (حداقل ۲ گیگ) عکس‌های آپلودشده با هر استقرار باقی می‌مانند.
- با هر اجرا، **مهاجرت دیتابیس خودکار** انجام می‌شود (`migrate.mjs` قبل از شروع سرور).

اگر ترجیح می‌دهید به‌جای دیسک از فضای ابری استفاده کنید، مرحلهٔ ۴ را ببینید (`STORAGE_DRIVER=s3`) — آن‌وقت دیسک فقط برای کش لازم است.

---

## ۳. دیتابیس PostgreSQL و شبکهٔ خصوصی

۱. **پایگاه داده → ایجاد → PostgreSQL 16** — نام مثلاً `shop50500-db`.
۲. بعد از ساخت، در پنل دیتابیس، **شبکهٔ خصوصی** را فعال و به برنامهٔ `shop50500` وصل کنید.
۳. اطلاعات اتصال را از پنل کپی کنید؛ چیزی شبیه این است:

```
Host:     bromo.liara.cloud
Port:     34515          ← پورت اختصاصی، همان را عیناً بگذارید
User:     root
Password: ●●●●●●●●
Database: postgres
```

۴. مقدار `DATABASE_URL` را بسازید:

```
DATABASE_URL=postgresql://root:رمز@bromo.liara.cloud:34515/postgres
```

> ⚠️ `db:5432` در `docker-compose.yml` فقط برای اجرای محلی است. روی لیارا باید از **Host و Port پنل دیتابیس** استفاده کنید.
> `PGSSL=false` بگذارید مگر اینکه لیارا TLS تحمیل کرده باشد؛ کد ما هر دو را پشتیبانی می‌کند.

---

## ۴. فضای ذخیره‌سازی ابری (عکس‌ها)

۱. **ذخیره‌سازی ابری → ایجاد باکت** — نام `50500-media`، دسترسی **عمومی (Public Read)** تا عکس‌ها در سایت نمایش داده شوند.
۲. داخل باکت → **Access Key** → بسازید و هر دو مقدار را نگه دارید:

```
Access Key ID:     مثلاً nieiou08cnbod58p
Secret Access Key: مثلاً df67ef3e-ccb6-4a25-97ba-3526f33da3fc
Endpoint:          https://storage.iran.liara.space
                   (مقادیر دقیق endpoint و دامنهٔ عمومی را از پنل باکت کپی کنید)
```

۳. در متغیرهای محیطی برنامه:

```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://storage.iran.liara.space
S3_BUCKET=50500-media
S3_REGION=default
S3_ACCESS_KEY=... 
S3_SECRET_KEY=...
S3_PUBLIC_BASE=https://50500-media.storage.iran.liara.space
```

> سرور روی آپلود: نوع فایل را با **magic bytes** تشخیص می‌دهد، SVG را به‌دلیل خطر اسکریپت رد می‌کند، با `sharp` دوباره‌کدگذاری به WebP می‌کند (حذف EXIF/GPS) و کلید ذخیره به شکل `2026-01/<uuid>.webp` می‌سازد.

---

## ۵. متغیرهای محیطی برنامه

در پنل لیارا: **برنامه → تنظیمات → متغیرهای محیطی**. این‌ها را بگذارید:

```bash
# ── عمومی ──
NODE_ENV=production
PORT=8080
PUBLIC_ORIGIN=https://50500.shop
STATIC_DIR=/app/dist

# ── دیتابیس ──
DATABASE_URL=postgresql://root:رمز@bromo.liara.cloud:34515/postgres
PG_POOL_MAX=10
PGSSL=false

# ── امنیت (بدون این‌ها سرور بالا نمی‌آید) ──
# ADMIN_PASSWORD  → حداقل ۱۶ کاراکتر: openssl rand -base64 24
# ADMIN_SECRET    → حداقل ۳۲ کاراکتر و هرگز تغییر نکنید (کلید رمزنگاری نشست/TOTP/کلیدها)
ADMIN_PASSWORD=CHANGE_ME_at_least_16_chars
ADMIN_SECRET=CHANGE_ME_at_least_32_random_chars_stable
SESSION_TTL_HOURS=12
CRON_SECRET=CHANGE_ME_at_least_24_chars
UNPAID_ORDER_TTL_MINUTES=30

# ── ذخیره‌سازی ──
STORAGE_DRIVER=s3
MAX_UPLOAD_BYTES=8388608
# ... مقادیر S3_* از مرحلهٔ ۴
```

تولید مقادیر امن:

```bash
openssl rand -base64 24   # ADMIN_PASSWORD
openssl rand -base64 48   # ADMIN_SECRET
openssl rand -base64 24   # CRON_SECRET
```

> بعد از تغییر `ADMIN_SECRET`، همهٔ نشست‌ها و کلیدهای رمزنگاری‌شده باطل می‌شوند — از روز اول درست بگذارید.

---

## ۶. انتشار

```bash
# در ریشهٔ پروژه
liara deploy --app=shop50500 --platform=docker --port=8080
```

لیارا `node_modules` و `dist` را طبق `.liaraignore` آپلود نمی‌کند؛ خود Docker داخل لیارا می‌سازد.

بررسی سلامت:

```bash
curl https://shop50500.liara.run/api/health
# {"ok":true,"latencyMs":...,"database":"postgres",...}
```

اگر `database` را برگرداند، اتصال دیتابیس برقرار است. لاگ‌ها: پنل → برنامه → **لاگ‌ها**.

---

## ۷. دامنه و SSL

۱. پنل → برنامه → **دامنه‌ها** → افزودن `50500.shop` و `www.50500.shop`.
۲. رکوردهای DNS نزد ثبت‌کنندهٔ دامنه:
   - `A` → `@` → IP برنامهٔ لیارا
   - `CNAME` → `www` → `shop50500.liara.run`
۳. SSL رایگان لیارا به‌صورت خودکار صادر می‌شود؛ فقط صبر کنید DNS کامل شود.
۴. `PUBLIC_ORIGIN` را روی دامنهٔ نهایی بگذارید تا callback درگاه پرداخت درست ساخته شود.

---

## ۸. ورود به پنل پس از استقرار

- آدرس: `https://50500.shop/#/admin`
- رمز: همان `ADMIN_PASSWORD` که در متغیرهای محیطی گذاشتید.
- در حالت سرور، ورود از `/api/admin/login` انجام می‌شود (rate-limit سمت سرور + TOTP اختیاری) و کد مرورگر خودش سرور را تشخیص می‌دهد (`/api/public/bootstrap`).

---

## ۹. درگاه پرداخت

۱. پنل → **درگاه‌های پرداخت** → زرین‌پال → مرچنت‌کد را ثبت و حالت را **production** کنید.
۲. آدرس callback که زرین‌پال بازمی‌گرداند: `https://50500.shop/#/pay/callback`
۳. تأیید پرداخت با `payment/verify.json` انجام می‌شود؛ نتیجهٔ موفق = سفارش «پرداخت‌شده».
۴. **به‌پرداخت ملت** فقط سمت سرور کار می‌کند و روی لیارا فعال است — مرچنت/ترمینال/نام‌کاربری/رمز را در همان پنل ثبت کنید (رمز در vault رمزنگاری‌شده ذخیره می‌شود، نه در مرورگر).

---

## ۱۰. هزینهٔ تقریبی ماهانه (برای شروع)

| سرویس | حداقل منطقی |
| --- | --- |
| اپ Docker | ۲ هسته / ۴ گیگ |
| PostgreSQL | پلن پایه + شبکهٔ خصوصی |
| فضای ابری | ۵–۲۰ گیگ برای عکس‌ها |
| دیسک اپ | ۲ گیگ |

دقیق مبلغ را در پنل لیارا ببینید؛ اعداد لیارا تغییر می‌کند و من نمی‌خواهم عدد اشتباه بدهم.

---

## ۱۱. رفع اشکال سریع

| نشانه | علت معمول |
| --- | --- |
| `DATABASE_URL is required` | متغیر محیطی ست نشده |
| اتصال دیتابیس timeout | اپ و دیتابیس در شبکهٔ خصوصی مشترک نیستند یا Port اشتباه است |
| عکس آپلود نمی‌شود | `S3_*` ناقص یا باکت خصوصی است (Public Read لازم است) |
| لینک عکس باز نمی‌شود | `S3_PUBLIC_BASE` با دامنهٔ واقعی باکت فرق دارد |
| سرور بالا نمی‌آید | `ADMIN_PASSWORD` یا `ADMIN_SECRET` کوتاه/پیش‌فرض است |
| پنل «سرور تشخیص نشد» | `/api/public/bootstrap` برنمی‌گردد؛ لاگ سرور را ببینید |
