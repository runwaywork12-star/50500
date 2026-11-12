# استقرار واقعی فروشگاه 50500

این مخزن حالا دو بخش دارد: **فروشگاه (React/Vite)** و **سرور واقعی (Node + PostgreSQL)**.
پنل مدیریت ← «استقرار و امنیت» همه فایل‌های لازم را با رمزهای تصادفی برای شما تولید می‌کند.

## ۱. پیش‌نیاز
- سرور Ubuntu 22.04+ با حداقل ۲ هسته / ۴GB رم
- Docker و Docker Compose
- یک دامنه با رکورد A به IP سرور

```bash
curl -fsSL https://get.docker.com | sh
```

## ۲. دریافت فایل‌ها
از پنل «استقرار و امنیت» دکمه **دانلود بسته استقرار** را بزنید. فایل‌ها را کنار پروژه روی سرور بگذارید:

```
/opt/50500
├── .env                     ← تولیدشده در پنل (رمزهای واقعی)
├── deploy/{Dockerfile,docker-compose.yml,nginx.conf}
├── server/{package.json,schema.sql,src/*}
└── dist/index.html          ← خروجی npm run build
```

## ۳. گواهی TLS
```bash
sudo certbot certonly --standalone -d 50500.shop
sudo cp /etc/letsencrypt/live/50500.shop/{fullchain,privkey}.pem deploy/certs/
```
سپس در `deploy/nginx.conf` نام دامنه را جایگزین کنید.

## ۴. اجرا
```bash
docker compose -f deploy/docker-compose.yml up -d --build
curl -s https://50500.shop/api/health | jq
```
`migrate.mjs` به‌صورت idempotent اسکیمای ۱۳ جدولی را می‌سازد.

## ۵. زمان‌بندی‌ها
```cron
*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://50500.shop/api/cron/expire-unpaid
0 3 * * *   docker compose exec -T db pg_dump -U store store50500 | gzip > /backups/50500-$(date +\%F).sql.gz
```

## امنیت پیاده‌سازی‌شده
| لایه | مکانیزم |
|---|---|
| رمز عبور | scrypt (N=32768) + salt + `timingSafeEqual` |
| کلید درگاه | AES-256-GCM با کلید مشتق از `ADMIN_SECRET` |
| نشست | کوکی HttpOnly/Secure/SameSite=Lax، فقط هش SHA-256 توکن در DB |
| CSRF | هدر `x-csrf-token` + کنترل `Origin` روی همه متدهای نوشتنی |
| SQL | ۱۰۰٪ پارامتری (`$1,$2`)، بدون الحاق رشته |
| ورود | ۸ تلاش/۱۰ دقیقه + rate limit لبه + TOTP اختیاری |
| آپلود | Magic bytes، رد SVG، بازرمزگذاری sharp به WebP، حذف EXIF/GPS |
| هدرها | helmet + CSP + HSTS + nosniff + frame-ancestors 'none' |
| شبکه | Postgres بدون پورت عمومی، کانتینر با کاربر غیر-root |

## امنیت پرداخت
1. **مبلغ هرگز از مرورگر گرفته نمی‌شود** — از جدول `orders` داخل تراکنش خوانده می‌شود.
2. **موجودی با `SELECT … FOR UPDATE` قفل و کم می‌شود** — فروش مازاد ممکن نیست.
3. **زرین‌پال**: `payment/request.json` → `StartPay/{authority}` → `payment/verify.json`.
4. **به پرداخت ملت**: `bpPayRequest` → `startpay.mellat?RefId=` → `bpVerifyRequest` → **`bpSettleRequest`** (تسویه الزامی است).
5. **ضد Replay**: ایندکس یکتای `(gateway, ref_id)` و بررسی وضعیت داخل تراکنش.
6. **پرداخت دیرهنگام**: اگر سفارش لغو شده باشد، پرداخت با وضعیت `paid_review` ثبت می‌شود تا مسترد شود.
7. **واحد پول**: زرین‌پال IRT (تومان)، ملت IRR (ریال). قرارداد پذیرنده خود را چک کنید.

## سرعت
- Nginx: Brotli/Gzip، کش ۵ دقیقه‌ای پاسخ‌ها، کش ۳۶۵ روزه immutable تصاویر
- تصاویر مستقیم از دیسک/CDN سرو می‌شوند (بدون عبور از Node)
- ایندکس‌های `phone`, `status`, `created_at` و جست‌وجوی فازی `pg_trgm`
- استخر اتصال با `statement_timeout` و سقف اتصال قابل تنظیم

## بازگشت به عقب
```bash
docker compose -f deploy/docker-compose.yml down
gunzip -c /backups/50500-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U store store50500
```
