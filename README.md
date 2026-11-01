# 50500 Car Mat Store

A Next.js + PostgreSQL storefront.

## Requirements
- Node.js version supported by the installed Next.js release
- PostgreSQL

## Setup
1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL`.
3. For production, set a unique `ADMIN_PASSWORD` (at least 16 characters) and `ADMIN_SECRET` (at least 32 characters). Production startup/login intentionally fails closed if these are missing.
4. Install dependencies with `npm install`.
5. Run `npm run typecheck`, `npm run lint`, and `npm run build`.
6. Start with `npm run start` after a successful production build.

## Payments
Configure a real gateway in the admin settings before accepting online payments. The sandbox simulator is development-only and is rejected in production. Zarinpal requests use IRT (Toman) explicitly; verify this against your merchant account and complete a real sandbox transaction before launch. Never expose payment settings or credentials to agent API tokens.

For card-to-card transfers, the customer must first open the manual-transfer option on the payment page. In Admin → Orders, the **تأیید واریز کارت‌به‌کارت** action appears only while a matching manual-transfer attempt is awaiting review. An administrator must verify the bank receipt before confirming it. This action does not verify a bank account automatically.

### Expire stale unpaid orders
Set a unique `CRON_SECRET` of at least 24 characters and optionally set `UNPAID_ORDER_TTL_MINUTES` (5–1440; default 30). Configure your trusted scheduler to send a `POST` request to `/api/cron/expire-unpaid` with `Authorization: Bearer <CRON_SECRET>`. The endpoint is disabled if the secret is missing/too short. Do not expose the secret in frontend code or public URLs. The job cancels stale pending online orders and releases their stock transactionally. If a gateway confirms a payment after an order was cancelled, the payment is recorded and flagged for refund review; the app does not issue an automatic refund.

## Database safety
Existing catalog data is not automatically deleted when the seed version changes. Seed data is only initialized for an empty catalog. Back up PostgreSQL before schema or data migrations.

## پنل کنترل و اتصال‌های هوش مصنوعی

- داشبورد مدیریت: `/admin`
- تحلیل بازدیدها و کمپین‌های UTM: `/admin/analytics` (برای آمار تاریخی، رهگیری از زمان فعال‌شدن ثبت می‌شود)
- تنظیمات عمومی، اطلاعات تماس، SEO و اسلایدر: `/admin/settings`
- درگاه‌های موجود در این نسخه: زرین‌پال، زیبال و کارت‌به‌کارت: `/admin/payments`
- استودیوی محتوا و تنظیم کلید OpenAI/Anthropic: `/admin/content`
- ساخت توکن‌های محدودشده برای ایجنت‌ها و مشاهده OpenAPI: `/admin/integrations` و `/api/agent/openapi.json`

کلیدهای OpenAI و Anthropic که از پنل ثبت می‌شوند در دیتابیس با AES-256-GCM رمزگذاری می‌شوند. برای استفاده از این قابلیت، مقدار `ADMIN_SECRET` باید حداقل ۳۲ کاراکتر تصادفی و پایدار باشد؛ با تغییر این secret، کلیدهای رمزگذاری‌شده قبلی قابل بازیابی نیستند. هر ایجنت باید توکن جداگانه و حداقل دسترسی لازم را داشته باشد.

سود نمایش‌داده‌شده در داشبورد فعلاً تخمینی است و از بهای تمام‌شده فعلی محصولات محاسبه می‌شود؛ برای سود حسابداری دقیق، باید بهای تمام‌شده هر قلم در لحظه سفارش نیز snapshot شود و هزینه ارسال، کارمزد درگاه، مرجوعی و هزینه تبلیغات ثبت شوند.

## Customer login / registration

- Customer account entry point: `/account` (also linked in the store header).
- Standard registration uses name, email, mobile, and password. Email/password login is available from the same page. Passwords are stored as salted scrypt hashes, never as plain text.
- Registration requires a mobile number so customer orders can be matched to the account. The `/api/customer/me` endpoint returns only orders matching the authenticated customer's phone and includes order summaries/items for the dashboard.
- Accounts created by the previous OTP-only flow can still sign in with SMS; after login, they can attach an email and password in the account dashboard. OTPs expire after five minutes, are stored hashed, and have attempt/request rate limits.
- Customer sessions use an HttpOnly, SameSite=Lax cookie; only a hash of the session token is stored in PostgreSQL. Password login and registration have request rate limits.
- Local development without SMS credentials displays the one-time code only on `/account`. This behavior is disabled in production.
- For production SMS login, configure `SMS_API_URL` and `SMS_API_KEY` for a provider endpoint compatible with the JSON Bearer-authenticated contract in `.env.example`; verify provider payload/recipient fields.
- Schema initialization adds `email` and `password_hash` columns and an email uniqueness index without deleting existing customer records. Back up PostgreSQL before deployment as always.


## 50500 Home Hero Update (v13)

- Replaced the animated multi-slide homepage hero with a single static RTL hero.
- Removed slide navigation, slide progress indicators, and color-picker controls from the homepage hero.
- Reworked Persian marketing copy to avoid unsupported claims about leather, embroidery, or a specific material.
- Added a sample molded/ribbed floor-mat visual at `public/images/hero-mat-50500.webp` to demonstrate the layout. This is a placeholder visual and should be replaced by an actual 50500 product photograph before production.
- Moved the working vehicle finder directly beneath the hero and removed the duplicate moving brand ribbon.
- Kept the site's existing black/orange visual identity and the rest of the store sections.


## مدیریت کارکنان و امنیت پنل (V21)

- ورود مدیر اصلی با `ADMIN_PASSWORD` و امضای امن مبتنی بر `ADMIN_SECRET` حفظ شده است؛ نشست مدیر اصلی در PostgreSQL با هش توکن نگهداری می‌شود و در خروج قابل ابطال است.
- مدیر اصلی می‌تواند از مسیر `/admin/staff` حساب کارمند با ایمیل و رمز مستقل بسازد و مجوزهای خواندن/نوشتن هر ماژول را تعیین کند.
- نشست کارکنان توکن تصادفی با هش SHA-256 در PostgreSQL است؛ غیرفعال‌سازی کارمند یا بازنشانی رمز، همه نشست‌های قبلی او را باطل می‌کند.
- ورود کارکنان از صفحه `/admin/login` با ایمیل/رمز انجام می‌شود. در صورت فعال‌سازی TOTP، کد شش‌رقمی دومرحله‌ای نیز الزامی است.
- مدیر اصلی و کارمند از مسیر `/admin/my-security` می‌توانند TOTP را در برنامه Authenticator فعال/غیرفعال کنند. پس از فعال‌سازی TOTP مدیر اصلی، ورود با رمز محیطی به‌تنهایی کافی نیست و کد شش‌رقمی نیز لازم است. رمز TOTP در دیتابیس به‌صورت AES-256-GCM رمز می‌شود و کلید آن از `ADMIN_SECRET` مشتق می‌شود؛ تغییر `ADMIN_SECRET` بدون نگه‌داشتن نسخه قبلی، رمزگشایی کلیدهای TOTP را ناممکن می‌کند.
- دسترسی API و صفحات سروری بر اساس مجوزهای ثبت‌شده محدود می‌شود؛ مدیر اصلی همچنان دسترسی کامل دارد. مدیر اصلی می‌تواند از همان پنل نقش و مجوزهای کارکنان موجود را نیز ویرایش کند.
- با ارتقای V20 به V21، نشست‌های قدیمی مدیر اصلی عمداً نامعتبر می‌شوند؛ پس از انتشار نسخه جدید، مدیر اصلی باید یک‌بار دوباره با رمز `ADMIN_PASSWORD` وارد شود. پس از آن پیشنهاد می‌شود TOTP را از `/admin/my-security` فعال کند.
- `ADMIN_SECRET` باید پایدار بماند؛ کلیدهای TOTP و سایر داده‌های رمزگذاری‌شده با آن مشتق می‌شوند. تغییر این مقدار بدون فرآیند مهاجرت کلید، امکان رمزگشایی داده‌های قبلی را از بین می‌برد.
- در تولید، `ADMIN_PASSWORD` حداقل ۱۶ و `ADMIN_SECRET` حداقل ۳۲ نویسه تصادفی باشند. دسترسی مدیریت کارکنان فقط برای مدیر اصلی است.


### Owner-supplied image defaults (V23)

On the first database bootstrap after V23, the owner's uploaded sewing-machine photo is registered as the desktop/mobile hero image and the uploaded floor-mat photo is registered as the shared default for all current floor-mat products. This is a one-time migration; it does not alter product pricing, stock, specifications, order history, or accessory images. To assign a unique image to a vehicle, open Admin → Products, expand that product's editor, and use “بارگذاری عکس اختصاصی همین خودرو”. The shared temporary image can be changed from Admin → Image Library.
