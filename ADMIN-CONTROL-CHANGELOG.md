# 50500 Admin Control Center — changes in v2

## Order operations
- Added server-side order search by order code, customer name, mobile number, city, and province.
- Preserved the active status filter while searching.
- Added authenticated CSV export (up to 5,000 rows) with UTF-8 BOM and spreadsheet-formula injection mitigation.
- Added internal admin notes and shipment tracking number fields to orders, including idempotent PostgreSQL column migrations.
- Tracking numbers can be shown on the customer order page once saved by an admin.
- Removed the casual order-delete action from the order UI; financial/order records should not be deleted as a routine workflow.
- Cancelling an order restores its reserved stock; reopening a cancelled order attempts to reserve stock atomically and fails if stock is insufficient.

## Product and finance operations
- Added editable product cost price to the product table and create-product form so the gross-profit estimate can use an actual cost entered by the operator.
- Added server-side validation for cost price.

## Important operational notes
- Build/typecheck has not been confirmed in this environment because dependency installation repeatedly timed out. The project archive and source edits should be validated with `npm install`, `npm run typecheck`, `npm run lint`, and `npm run build` in the target environment before deployment.
- CSV exports are restricted to authenticated administrators. They include personal data and should be stored and shared securely.
- Cost-based gross profit remains an estimate until shipping expense, gateway fees, refunds, advertising spend, and other overhead are captured as structured accounting entries.
- Stock reservation release is tied to the admin's cancellation action; an automated timeout/release job for unpaid orders is not included in this iteration.


# v3 hardening

- Added a protected scheduled endpoint `POST /api/cron/expire-unpaid` to cancel stale, unpaid online orders and release their stock in a database transaction. Configure `CRON_SECRET` (24+ random characters) and optionally `UNPAID_ORDER_TTL_MINUTES` (5..1440); call it from a trusted scheduler with `Authorization: Bearer <CRON_SECRET>`. The endpoint is disabled until configured.
- Disabled permanent order deletion at the API layer, not only in the UI.
- Prevented admins from manually forging a successful online payment or downgrading an already confirmed payment. Confirmed online payments must be changed only through a separately implemented verified refund flow.
- Prevented marking online orders as cash-on-delivery and prevented cancelling a paid order without a refund workflow, avoiding automatic stock restoration that could corrupt inventory/financial records.
- Added cron configuration examples to `.env.example`.

## Validation status
- Archive integrity and source-level assertions can be checked locally. A successful full Next.js build, typecheck, database migration run, and real gateway sandbox test have not been demonstrated here; do not treat this archive as production-certified until those are run in an environment with installed dependencies and a test PostgreSQL database.


## V3.1 — Payment callback race hardening
- Gateway verification now records a confirmed charge transactionally while locking the order row, preventing a late callback from resurrecting an order already cancelled by an administrator or the unpaid-order expiry job.
- A verified payment for a previously cancelled order is surfaced as a refund-review case; the customer page explicitly states that a refund is **not** automatic.
- Fixed the admin payment dropdown so a paid status remains visibly selected while locked.
- These are source-level changes; gateway sandbox integration and a full production build still require runtime verification.

- Added an admin-only manual-transfer confirmation endpoint. It requires a matching pending manual-transfer payment and amount, locks the order row, rejects cancelled/already-paid orders, and asks the admin to confirm they checked the bank receipt before submission.
- The card-to-card confirmation action is displayed only when the order has an actual pending manual-transfer attempt.

## V6 — Unified admin navigation and login hardening
- Reorganized the existing Next.js admin navigation into grouped sections inspired by the supplied 50500 control-center reference (control center, sales/catalog, content/customer communication, platform).
- Updated product navigation label to make vehicle catalog management explicit.
- Removed the visible default development password from the login page. Login credentials must be set locally in `.env.local`; do not publish credentials.
- The supplied Vite/React design remains a visual/functional reference, not a separately embedded app; existing Next.js pages and database-backed APIs remain the production integration target.
- Validation: archive and source text checks only; full Next.js build and browser tests have not been confirmed in this environment.

## V9 — Admin-managed vehicle hierarchy
- Added `/admin/vehicle-catalog` with an authenticated API-backed manager for vehicle brands and their model subcategories.
- Admins can add, edit, sort, and remove brands and models; model creation/editing selects its parent brand.
- The manager reads and writes the existing `brands` and `car_models` tables used by the storefront car finder, so changes are stored in PostgreSQL rather than browser-only state.
- Prevents deleting a brand that still has models. Removing a model detaches its product reference first to preserve historical order snapshots.
- This supports the current two-level hierarchy (brand -> model). Arbitrary depth beyond model level is not implemented.
- Runtime build and live database tests remain to be run in the user's environment.

## V11 — Customer email/password authentication, dashboard, and header layout
- Added customer registration and login endpoints using email + password, requiring a name and mobile number at registration so existing order history can be matched safely by phone.
- Passwords are stored as salted scrypt hashes; customer sessions continue to use hashed random tokens in PostgreSQL and HttpOnly/SameSite cookies. Added IP-based rate limits to password login and registration.
- Kept OTP login as an alternative for accounts created by the earlier passwordless flow. Authenticated customers without an email can upgrade their existing account by attaching an email and password after OTP login.
- Expanded the account page from a basic order list into an account dashboard with order count, active orders, confirmed payments, recent order contents/status, tracking numbers, profile details, and quick links.
- Expanded `/api/customer/me` to return summary stats and item snapshots for orders associated with the authenticated customer’s normalized phone number.
- Added additive PostgreSQL columns/index for normalized email uniqueness. Existing rows are preserved.
- Fixed desktop header pressure by giving the header a wider container, preventing nav labels from wrapping, reducing search width at intermediate breakpoints, and hiding secondary navigation entries until extra-wide layouts.
- Validation: TypeScript transpile/syntax checks and source assertions passed for changed files. `npm install` timed out in this environment, so a complete Next.js typecheck/build and browser/database integration test could not be run here.

## V12 — Homepage hero composition refresh

- Reworked the hero composition while preserving the 50500 dark charcoal/orange visual identity and Persian RTL orientation.
- Removed the framed-card treatment on the hero media and made the image bleed to the left viewport edge on desktop.
- Increased headline scale and adjusted copy width, spacing, and CTA grouping for a clearer visual hierarchy.
- Broadened the layered gradients so image, background texture, and copy blend together rather than appearing as separate blocks.
- Removed the secondary CTA/caption that duplicated the main CTA on the image.
- Integrated slider navigation visually into the hero and tightened the spacing before the vehicle finder.
- No image contents or brand colors were intentionally replaced.
- Validation: TypeScript parser produced no syntax diagnostics in the available global compiler. Full build is unverified because project dependencies are not installed in this environment.

## V14 — Hero image controls and vehicle finder continuity (2026-10-29)
- Kept the actual `CarFinder` form (brand + model dropdowns and product-search action) directly below the fixed homepage hero; no vehicle-logo strip is used inside the hero.
- Added administrator-managed desktop and mobile hero image slots at `/admin/images`, using the existing authenticated upload endpoint and database-backed site-image mechanism.
- Homepage hero now loads `/api/site-image/hero` on desktop and `/api/site-image/hero-mobile` on smaller screens. If no dedicated hero photo is uploaded, the route reuses the uploaded main product photo; the neutral vector fallback does not claim a specific product material.
- Replaced the hardcoded generated mat image in the lower product feature and construction watermark with the site-managed main product photo, avoiding a false depiction of the 50500 material.
- Removed the obsolete hero-slider JSON editor from the main settings form; the fixed single-hero experience is controlled by the image upload slots.
- Validation in this package is source-level only; full Next.js build/runtime test remains to be run in the user's environment.


## V15 — Compact hero + admin-editable copy (2026-10-29)
- Made the homepage vehicle finder compact and brought it closer to the hero so brand/model selection is visible earlier in the initial viewport. The hero image is now layered behind the composition on small screens rather than consuming a separate full row.
- Connected the static hero's eyebrow, headline, highlighted phrase, description, four feature titles/descriptions, CTA labels/URLs, helper line, model-count label, and vehicle-finder labels/placeholders to stored site settings.
- Added `hero.model_count_label` to allowed setting defaults. The hero text editor lives at Admin → Settings; desktop/mobile hero images remain in Admin → Image Library.
- Changed the no-upload hero fallback to a custom industrial sewing-machine vector illustration rather than reusing a floor-mat product photo. A real workshop/machine photo can be uploaded at Admin → Images.
- Validation is source-level only; full Next.js build and runtime/database smoke tests still need to be run in the user's environment.


## V16 — اصلاح مشخصات واقعی کفپوش ۵۰۵۰۰
- حذف معرفی TPE/XPE و ساختار پنج‌لایه از بخش ساختار کفپوش.
- بروزرسانی ساختار به چهار لایه: رویه چرمی با دوخت ریزبافت، فوم ۹ میلی‌متری، پارچه جودون و لایه زیرین/پشتیبان.
- حذف اعداد ادعاییِ تأییدنشده درباره مقاومت کششی، دمای کارکرد و طول عمر از بخش ساختار.
- این متن‌ها برای نمایش مشخصات اعلام‌شده تنظیم شده‌اند؛ جزئیات جنس لایه زیرین عمداً ادعای مادی مشخصی ندارد تا با مشخصات تولید تأیید شود.


## V16 — اصلاح مشخصات ساختار کفپوش چرمی ۵۰۵۰۰
- حذف ادعای TPE/XPE و ساختار پنج‌لایه از بخش ساختار کفپوش.
- نمایش چهار بخش: رویه چرمی با دوخت ریزبافت، فوم ۹ میلی‌متری، پارچه جودون و لایه زیرین.
- حذف ادعاهای تأییدنشده درباره ضخامت کل، مقاومت کششی، دمای کارکرد و طول عمر از نمودار ساختار.
- افزودن مهاجرت غیرمخرب برای به‌روزرسانی مشخصات محصولات چرمی از قبل seed شده؛ قیمت، موجودی و سفارش‌ها دست‌نخورده می‌مانند.


## V17 — تم روشن یکپارچه فروشگاه (2026-10-29)
- همسان‌سازی تم روشن با همان ساختار اصلی فروشگاه؛ فقط پالت رنگ، سطوح، حاشیه‌ها، خوانایی متن و جلوه‌ها تغییر می‌کنند.
- تبدیل هیرو به استایل وابسته به توکن‌های تم: زمینه روشن گرم، متن تیره، گرادیان نارنجی متناسب با کنتراست و کارت انتخاب خودرو روشن؛ چیدمان و رفتار انتخاب‌گر حفظ شده است.
- روشن‌سازی بخش ساختار چهارلایه با پنل سفید، حاشیه‌های قابل مشاهده و متن‌های تیره؛ در تم تیره همان ظاهر قبلی حفظ می‌شود.
- هماهنگ‌سازی پس‌زمینه ویترین محصول و استایل تب‌های محصولات/کد تخفیف با تم روشن.
- صفحه اصلی از کامپوننت سروری مشترک ارائه می‌شود تا مسیر `/` نسخه تیره و `/v2` نسخه روشن را بدون افزودن props غیرمجاز به فایل‌های route داشته باشند.
- نوار خرید موبایل صفحات محصول هم اکنون در مسیر روشن، واریانت روشن را استفاده می‌کند.
- اعتبارسنجی: پارس نحوی تمام 150 فایل TypeScript/TSX و پارس فایل CSS موفق بود. Build کامل Next.js و تست مرورگری به دلیل نبود وابستگی‌های نصب‌شده در محیط فعلی تأیید نشده است.


## V19 — پنل کنترل جامع (2026-10-30)
- مدیریت محتوای صفحات اصلی و داخلی از طریق تنظیمات امن و تاریخچه تغییرات؛ هدر، پیام تخفیف، نوار ارسال، فوتر، فونت، صفحات درباره‌ما/تماس/مجله/فروشگاه/سبد/تسویه/پیگیری و محتوای هیرو.
- مقالات واقعی در PostgreSQL با ایجاد، ویرایش، پیش‌نویس/انتشار، ساختار بلوکی ساده و متادیتای SEO؛ انتقال محتوای اولیه مقاله‌ها از seed بدون تکرار.
- مدیریت مشتریان با جست‌وجو، جمع سفارش‌ها، مجموع پرداخت، فعال/مسدودکردن حساب و خروجی CSV.
- دفتر مالی با درآمد/هزینه دستی، ابطال برگشت‌پذیر، فروش قطعی و حاشیه سود تخمینی بر اساس بهای تمام‌شده ذخیره‌شده در اقلام سفارش.
- ویرایش گروهی کالاها (حداکثر ۲۵۰ قلم در هر عملیات) و خروجی CSV انتخابی (حداکثر ۵۰۰ قلم).
- مدیریت کد تخفیف با بازه شروع/پایان و سقف مصرف؛ شمارش مصرف در ثبت سفارش و آزادسازی در لغو/انقضای سفارش.
- بخش همکاری/API برای توکن‌های محدود، صفحه تاریخچه تغییرات تنظیمات و افزوده‌شدن ماژول‌های مشتریان، صفحات، مقالات، ترفیع و حسابداری در منوی پنل.
- امنیت خروجی CSV در برابر formula injection و اصلاح جست‌وجوی مشتریان در SQL.
- درگاه‌های عملیاتی موجود در این نسخه: زرین‌پال، زیبال، کارت‌به‌کارت با تأیید دستی و sandbox توسعه؛ اتصال بانک/PSP جدید تا دریافت مستندات/شناسه پذیرنده و تست برگشت تراکنش فعال نشده است.
- محدودیت آزمون: بررسی نحوی TypeScript و سلامت ZIP قابل اجرا هستند؛ build کامل وابسته به نصب بسته‌ها و تست پرداخت واقعی نیازمند محیط پذیرنده و اطلاعات محرمانه کاربر است.

### V19 — تکمیل‌های تکمیلی پنل (2026-10-30)
- به عملیات گروهی سفارش‌ها محدودیت حداکثر ۱۰۰ سفارش، فیلتر سفارش‌های قابل پیشبرد، و انتخاب وضعیت مقصد معتبر بر اساس مرحله فعلی هر سفارش اضافه شد. لغو، بازپرداخت و تغییر وضعیت پرداخت همچنان از مسیر گروهی ممنوع است.
- جدول امن تراکنش‌های درگاه به صفحه پرداخت‌ها اضافه شد: فهرست ۲۵۰ تلاش اخیر، فیلتر درگاه/وضعیت و خروجی CSV؛ فیلد raw پاسخ درگاه هرگز به مرورگر فرستاده نمی‌شود.
- خروجی دفتر مالی در برابر CSV formula injection سخت‌سازی شد.
- اتصال پرداخت عملیاتی فعلی صرفاً شامل زرین‌پال، زیبال و تأیید دستی کارت‌به‌کارت است. به‌دلیل نبود اطلاعات پذیرندگی/قرارداد/مستندات تست‌شده، اتصال مستقیم به به‌پرداخت ملت، سامان/SEP، IDPay، NextPay، PayPing و درگاه‌های دیگر هنوز در این نسخه فعال نشده است.
- این نسخه شامل ماژول‌های متصل به دیتابیس برای سفارش‌ها، محصولات و ویرایش گروهی، خودروها، مشتریان، کمپین‌ها/کوپن‌ها، صفحات/متون قابل تنظیم، بلاگ، تصاویر، پیام‌ها/نظرات، تحلیل بازدید، دفتر مالی و توکن‌های همکاری/API است. امکاناتی مثل page-builder آزاد با جابه‌جایی بصری تمام بلوک‌ها، چندنقشی واقعی مدیران، 2FA، تسویه و بازپرداخت خودکار، سیستم همکار فروش/افیلیت و اتصال وبهوک‌های خروجی هنوز کامل نیستند.
- بررسی نحوی TypeScript/TSX و تست‌های ایستای منبع به‌صورت جداگانه اجرا می‌شوند؛ نصب بسته‌ها، Build، مهاجرت دیتابیس روی محیط واقعی و تست sandbox درگاه باید پیش از انتشار انجام شود.

## V20 — تکمیل ماژول‌های عملیاتی پنل
- افزودن گردش انبار و ثبت تغییر موجودی برای اصلاح دستی، دریافت خرید، بازگشت مرجوعی و ویرایش گروهی/CSV.
- افزودن تأمین‌کنندگان و سفارش خرید با دریافت مرحله‌ای؛ دریافت کالا، افزایش موجودی، به‌روزرسانی بهای خرید و ثبت سند دوطرفه موجودی/حساب‌های پرداختنی در همان تراکنش.
- افزودن پرونده مرجوعی کامل سفارش، قفل گردش وضعیت، بازگشت موجودی فقط یک بار پس از دریافت فیزیکی و ثبت سند موجودی/بهای تمام‌شده.
- ثبت بازپرداخت فقط پس از دریافت مرجوعی و با شماره پیگیری؛ ثبت سند برگشت از فروش/صندوق و بانک انجام می‌شود. این API خودش پول را از بانک منتقل نمی‌کند.
- تسویه پورسانت همکار با الزام تأیید قبلی و شماره مرجع پرداخت؛ ثبت سند هزینه بازاریابی/صندوق و بانک هنگام تسویه.
- افزودن جست‌وجوی سریع سراسری‌تر برای محصولات، سفارش‌ها، مشتریان، تأمین‌کنندگان، سفارش خرید و پرونده مرجوعی.
- افزودن حذف صفحه سفارشی و اعتبارسنجی متمرکز بلوک‌ها، مسیر تصاویر و مقصد دکمه‌ها.
- ثبت گردش موجودی هنگام تغییر گروهی موجودی و ورود CSV؛ جلوگیری از ناسازگاری دفتر گردش با عدد انبار.
- افزودن شاخص‌های جدید سلامت سیستم و حساب‌های دفتر کل.
- توقف تخمین خودکار بهای تمام‌شده بر مبنای درصدی از قیمت فروش برای دیتابیس‌های جدید. داده‌های قدیمی که نسخه‌های قبلی شاید با ضریب ۶۸٪ ساخته باشند باید با فاکتور خرید بازبینی شوند.
- بررسی نحوی ۲۱۶ فایل TypeScript/TSX بدون خطا؛ نصب وابستگی‌ها در محیط ساخت به timeout خورد، بنابراین build و تست یکپارچه هنوز تأیید نشده است.

- بهبود محاسبه بهای خرید هنگام دریافت مرحله‌ای: هزینه واحد محصول با میانگین موزون موجودی قبلی و خرید جدید به‌روز می‌شود، نه صرفاً با آخرین فاکتور.
- اگر محصول ثبت‌شده در عکس لحظه مرجوعی پیدا نشود، کل عملیات دریافت مرجوعی rollback می‌شود و پرونده به‌اشتباه «دریافت‌شده» علامت نمی‌خورد.
- اعتبارسنجی تاریخ تحویل سفارش خرید و جلوگیری از تکرار یک محصول در چند ردیف یک سفارش خرید اضافه شد.
- پورسانت سفارش پرداخت در محل فقط پس از وضعیت «تحویل‌شده» قابل ثبت است؛ وضعیت پورسانت باطل‌شده نهایی و غیرقابل فعال‌سازی مجدد شد.
- Snapshot منطقی سیستم اکنون metadata امن تراکنش‌های پرداخت و رویدادهای مدیریت را هم صادر می‌کند؛ raw gateway payload، authority، card PAN، session و token همچنان حذف‌اند.
- ثبت محصول جدید با موجودی اولیه اکنون در همان تراکنش، گردش «موجودی اولیه» ثبت می‌کند و رویداد ایجاد محصول audit می‌شود.
- رفع دو خطای کد موجود در صفحه خانه/محصول: import تابع matUrl و تعریف تشخیص تم روشن برای نوار خرید موبایل؛ رفع نام تکراری handler در فرم تأمین‌کننده.


## V21 — Admin staff RBAC + TOTP (2026-10-30)
- Added persistent staff accounts and database-backed 8-hour sessions.
- Added owner-only employee management UI and APIs, per-module read/write permissions, password reset, deactivate/reactivate, and session revocation.
- Enforced route-level API permissions and server-rendered page permissions; write grants imply read, never the reverse.
- Added optional TOTP (RFC 6238), encrypted pending/active secrets with AES-256-GCM using key material derived from ADMIN_SECRET, code verification on login, rate-limited setup verification, and session revocation after enable/disable.
- Staff login now supports email/password and optional second-factor code; owner environment-password login remains backward compatible.
- Audit rows now record employee display name when available; logical backup includes safe staff metadata but excludes password hashes and sessions.
- Added Drizzle schema definition for the existing blog_posts table discovered missing in V20 source (DDL already created that table).
- Validation: 223 TS/TSX files transpiled without syntax diagnostics. Full dependency install/build could not run because npm install timed out in this environment. Existing repository semantic type diagnostics remain where dependency type packages are unavailable; these are not represented as a passing typecheck.


### V21.1 — تکمیل MFA مدیر اصلی و گردش دسترسی کارکنان (2026-10-30)
- Added idempotent `admin_staff` TOTP columns for existing databases.
- Added owner TOTP setup/verify/disable endpoint; owner login now requires the 6-digit authenticator code after MFA is enabled.
- Owner sessions are now database-backed with hashed tokens and per-session logout revocation. Enabling/disabling owner MFA increments the session version and invalidates all prior owner sessions. Legacy V20 owner cookies are intentionally invalidated on upgrade.
- Reused the security settings UI for both owner and staff accounts.
- Added role/permission editing to the staff management UI.
- Added throttled last-seen updates and cleanup of old staff sessions on new login.
- Manual bank-transfer confirmation now requires both order-write and payment-write permission.

## V22 — گسترش کاتالوگ خودروها و مدیریت گروهی (2026-10-30)
- افزودن مهاجرت غیرمخرب و idempotent برای ۲۷ برند جدید و ۲۲۹ مدل جدید در کنار فهرست قبلی؛ کاتالوگ پایه به ۷۳ برند و ۳۸۵ مدل می‌رسد. موارد قبلی و تغییرات دستی مدیر بازنویسی نمی‌شوند.
- مدل‌های جدید فقط به درخت سازگاری خودرو اضافه می‌شوند؛ برای جلوگیری از محصول/قیمت/موجودی ساختگی، برای آن‌ها محصول خودکار seed نمی‌شود.
- فهرست تکمیلی شامل برندهای مندرج در تصویر کاربر از جمله BAC، آواتار، مکث موتور، بنتلی، ونوسیا، دایون، آمیکو، اشکودا، دامای، یواز، پروتون، زامیاد، آلفارومئو، فیات، فوتون، فردا، ترامپچی، تیگارد، ایرس، دی‌اس، ریسپکت، بورگوارد، کادیلاک، هن‌تنگ، لاماری، فورد و شورولت است؛ همراه با مدل‌های متداول هر برند.
- برای مدل‌های واقعی که معمولاً به‌صورت زیرمدل شناخته می‌شوند، «پاتریوت» زیر یواز و «پادرا» زیر زامیاد قرار داده شده‌اند.
- مدیریت خودروها اکنون علاوه بر افزودن/ویرایش/حذف تک‌تک برند و مدل، ورود گروهی با قالب `برند | مدل ۱، مدل ۲` و خروجی CSV امن برای ویرایش در Excel دارد.
- جست‌وجوی مدل در پنل، برند والد را خودکار باز می‌کند و فقط زیرمدل‌های منطبق را نشان می‌دهد.
- نام‌های قدیمیِ اشتباه «دانگ فانگ» و «بایدی» فقط در صورت تطابق با مقدار legacy دقیق، به «دانگ فنگ» و «BYD» اصلاح می‌شوند؛ تغییر نام‌های دستی مدیر حفظ می‌شود.
- انتخاب‌گر صفحه اصلی به‌صورت موجود از جدول brands/car_models تغذیه می‌شود؛ مدل‌های جدید بدون محصول مرتبط در فهرست انتخاب دیده می‌شوند، اما صفحه محصول ساختگی ایجاد نمی‌شود.
- اعتبارسنجی نحو فایل‌های TypeScript/TSX و بررسی‌های استاتیک کاتالوگ/API انجام شد؛ Build و اجرای migration در PostgreSQL واقعی باید در محیط آزمایشی کاربر تأیید شود.


## V23 — Owner-supplied workshop and mat images

- Bundled the owner's industrial sewing-machine/workshop photo as the default desktop and mobile hero image.
- Bundled the owner's mat photo as the common initial photo for every leather floor-mat product and the category/group showcases.
- Added a one-time, transactional, non-destructive catalogue image migration. It replaces only floor-mat product image arrays and site image references; prices, stock, specifications, product identities and historic order-item image snapshots are preserved.
- Changed the image library to manage one shared temporary default mat photo; uploading it updates all four legacy mat colour endpoints.
- Added per-product image upload in the product editor. A replacement affects only the selected vehicle/product and is stored as that product's own upload URL.
- Product-specific images can be added progressively later without needing code changes.

## V24 — Compact animated theme switch
- Removed the large fixed bottom-corner theme links from both storefront layouts.
- Added a compact 30px day/night switch to the top announcement strip, alongside the contact number.
- The sun and moon icons cross-fade/rotate gently and the button has a subtle pulse; reduced-motion preferences disable the animations.
- The switch navigates between the dark storefront (`/`) and the light storefront (`/v2`) while preserving the intended destination skin.
- No dependencies, database migrations, or environment variables were added.
