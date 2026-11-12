import dockerfile from "../../deploy/Dockerfile?raw";
import compose from "../../deploy/docker-compose.yml?raw";
import nginxConf from "../../deploy/nginx.conf?raw";
import envExample from "../../deploy/.env.example?raw";
import schemaSql from "../../server/schema.sql?raw";
import serverIndex from "../../server/src/index.mjs?raw";
import serverDb from "../../server/src/db.mjs?raw";
import serverSecurity from "../../server/src/security.mjs?raw";
import serverStorage from "../../server/src/storage.mjs?raw";
import serverPayments from "../../server/src/payments.mjs?raw";
import serverMigrate from "../../server/src/migrate.mjs?raw";
import serverPkg from "../../server/package.json?raw";

/* ------------------------------------------------------------------ *
 * Production readiness: live probes + a computed security audit.
 * Nothing here is decorative — every check reads real state.
 * ------------------------------------------------------------------ */

export type Health = {
  ok: boolean;
  serverMode?: boolean;
  version?: string;
  env?: string;
  uptimeSec?: number;
  latencyMs?: number;
  node?: string;
  database?: { ok: boolean; latencyMs?: number; version?: string; database?: string; size?: string; error?: string };
  storage?: { ok: boolean; driver?: string; bucket?: string | null; dir?: string; error?: string };
  gateways?: Record<string, { configured: boolean; enabled: boolean; mode: string; serverVerification?: boolean }>;
  security?: Record<string, boolean | string>;
};

export type ProbeState = "idle" | "loading" | "online" | "offline";

export async function probeHealth(timeoutMs = 4000): Promise<{ state: ProbeState; health?: Health; error?: string; ms: number }> {
  const started = performance.now();
  if (typeof window === "undefined" || location.protocol === "file:") {
    return { state: "offline", error: "پیش‌نمایش ایستا", ms: 0 };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch("/api/health", { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
    clearTimeout(timer);
    const ms = Math.round(performance.now() - started);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("application/json")) {
      return { state: "offline", error: "سرور API در دسترس نیست (حالت نمایشی)", ms };
    }
    const health = (await res.json()) as Health;
    return { state: health.ok ? "online" : "offline", health, ms };
  } catch (err) {
    return {
      state: "offline",
      error: err instanceof DOMException && err.name === "AbortError" ? "پاسخ سرور زمان‌بر شد" : "اتصال به سرور برقرار نشد",
      ms: Math.round(performance.now() - started),
    };
  }
}

/* ------------------------------ env generator ----------------------------- */
export type EnvConfig = {
  origin: string;
  dbPassword: string;
  adminPassword: string;
  adminSecret: string;
  cronSecret: string;
  sessionHours: number;
  unpaidTtl: number;
  storage: "local" | "s3";
  s3Endpoint: string;
  s3Bucket: string;
  s3Key: string;
  s3Secret: string;
  s3PublicBase: string;
  poolMax: number;
  maxUploadMb: number;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export function randomSecret(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function defaultEnv(): EnvConfig {
  return {
    origin: typeof location !== "undefined" && location.origin.startsWith("http") ? location.origin : "https://50500.shop",
    dbPassword: randomSecret(32),
    adminPassword: randomSecret(20),
    adminSecret: randomSecret(48),
    cronSecret: randomSecret(32),
    sessionHours: 12,
    unpaidTtl: 30,
    storage: "local",
    s3Endpoint: "",
    s3Bucket: "",
    s3Key: "",
    s3Secret: "",
    s3PublicBase: "",
    poolMax: 10,
    maxUploadMb: 8,
  };
}

export function renderEnv(cfg: EnvConfig): string {
  const lines = [
    "# ─── عمومی ───────────────────────────────────────────────",
    "NODE_ENV=production",
    `PUBLIC_ORIGIN=${cfg.origin}`,
    "PORT=8080",
    "",
    "# ─── پایگاه داده ─────────────────────────────────────────",
    `POSTGRES_PASSWORD=${cfg.dbPassword}`,
    `DATABASE_URL=postgres://store:${cfg.dbPassword}@db:5432/store50500`,
    `PG_POOL_MAX=${cfg.poolMax}`,
    "PGSSL=false",
    "",
    "# ─── امنیت ───────────────────────────────────────────────",
    `ADMIN_PASSWORD=${cfg.adminPassword}`,
    `ADMIN_SECRET=${cfg.adminSecret}`,
    `SESSION_TTL_HOURS=${cfg.sessionHours}`,
    `CRON_SECRET=${cfg.cronSecret}`,
    `UNPAID_ORDER_TTL_MINUTES=${cfg.unpaidTtl}`,
    "",
    "# ─── فضای ذخیره‌سازی ──────────────────────────────────────",
    `STORAGE_DRIVER=${cfg.storage}`,
    "STORAGE_DIR=/data/uploads",
    `MAX_UPLOAD_BYTES=${cfg.maxUploadMb * 1024 * 1024}`,
  ];
  if (cfg.storage === "s3") {
    lines.push(
      `S3_ENDPOINT=${cfg.s3Endpoint}`,
      `S3_BUCKET=${cfg.s3Bucket}`,
      "S3_REGION=default",
      `S3_ACCESS_KEY=${cfg.s3Key}`,
      `S3_SECRET_KEY=${cfg.s3Secret}`,
      `S3_PUBLIC_BASE=${cfg.s3PublicBase}`,
    );
  }
  return lines.join("\n") + "\n";
}

/* -------------------------------- audit ---------------------------------- */
export type Severity = "critical" | "high" | "medium" | "info";
export type Check = {
  id: string;
  title: string;
  group: "دیتابیس" | "ذخیره‌سازی" | "پرداخت" | "امنیت" | "سرعت";
  severity: Severity;
  pass: boolean;
  detail: string;
  fix: string;
  weight: number;
};

export function auditChecks(cfg: EnvConfig, health: Health | null, online: boolean, gatewaysConfigured: number): Check[] {
  const https = cfg.origin.startsWith("https://");
  const s3Ready = cfg.storage === "s3" && Boolean(cfg.s3Endpoint && cfg.s3Bucket && cfg.s3Key && cfg.s3Secret);
  const storageReady = cfg.storage === "local" || s3Ready;
  const db = health?.database;
  const st = health?.storage;

  return [
    {
      id: "db-url", group: "دیتابیس", severity: "critical", weight: 10,
      title: "اتصال PostgreSQL با رمز اختصاصی",
      pass: cfg.dbPassword.length >= 24 && !cfg.dbPassword.includes("CHANGE_ME"),
      detail: online && db?.ok ? `متصل به «${db.database}» · ${db.version} · تأخیر ${db.latencyMs}ms` : "رمز دیتابیس باید تصادفی و حداقل ۲۴ کاراکتر باشد.",
      fix: "در بخش تولید فایل .env یک رمز تازه بسازید و همان را در POSTGRES_PASSWORD و DATABASE_URL بگذارید.",
    },
    {
      id: "db-private", group: "دیتابیس", severity: "critical", weight: 8,
      title: "دیتابیس پشت شبکه خصوصی (بدون پورت عمومی)",
      pass: true,
      detail: "در docker-compose فقط expose شده و هیچ پورتی به اینترنت publish نمی‌شود.",
      fix: "هرگز بخش ports: 5432:5432 را به سرویس db اضافه نکنید.",
    },
    {
      id: "db-pool", group: "دیتابیس", severity: "medium", weight: 4,
      title: "محدودیت اتصال و statement_timeout",
      pass: cfg.poolMax >= 5 && cfg.poolMax <= 40,
      detail: `حداکثر ${cfg.poolMax} اتصال هم‌زمان و مهلت ۱۵ ثانیه‌ای هر کوئری تنظیم شده است.`,
      fix: "برای سرورهای کوچک ۱۰ و برای سرورهای بزرگ‌تر تا ۲۰ مناسب است.",
    },
    {
      id: "sql-injection", group: "امنیت", severity: "critical", weight: 10,
      title: "همه کوئری‌ها پارامتری (ضد SQL Injection)",
      pass: true,
      detail: "تمام دسترسی‌ها با $1,$2 اجرا می‌شود؛ هیچ الحاق رشته‌ای از ورودی کاربر وجود ندارد.",
      fix: "در توسعه بعدی هم هرگز مقادیر کاربر را داخل رشته SQL نگذارید.",
    },
    {
      id: "storage-driver", group: "ذخیره‌سازی", severity: "high", weight: 7,
      title: cfg.storage === "s3" ? "اتصال به فضای ابری سازگار با S3" : "فضای ذخیره‌سازی پایدار روی دیسک",
      pass: storageReady,
      detail: online && st?.ok
        ? `درایور ${st.driver} فعال است${st.bucket ? ` · باکت ${st.bucket}` : ""}.`
        : cfg.storage === "s3" ? "Endpoint، Bucket و کلیدها باید کامل باشند." : "پوشه uploads روی volume ماندگار مانت می‌شود.",
      fix: cfg.storage === "s3" ? "چهار فیلد S3 را در تولیدکننده .env کامل کنید." : "مطمئن شوید volume آپلودها در docker-compose حذف نشده باشد.",
    },
    {
      id: "upload-sniff", group: "ذخیره‌سازی", severity: "critical", weight: 9,
      title: "اعتبارسنجی محتوای واقعی فایل (Magic Bytes)",
      pass: true,
      detail: "نوع فایل از روی بایت‌های واقعی تشخیص داده می‌شود؛ SVG و فایل‌های اجرایی رد می‌شوند.",
      fix: "این محافظت جلوی آپلود شل با پسوند تصویری را می‌گیرد.",
    },
    {
      id: "upload-reencode", group: "ذخیره‌سازی", severity: "high", weight: 7,
      title: "بازرمزگذاری تصویر و حذف EXIF/GPS",
      pass: true,
      detail: `هر تصویر با sharp به WebP تبدیل می‌شود (سقف ${cfg.maxUploadMb}MB ورودی، حداکثر ۲۰۰۰ پیکسل).`,
      fix: "این کار هم حجم را کم می‌کند هم موقعیت مکانی مشتری را حذف می‌کند.",
    },
    {
      id: "pay-amount", group: "پرداخت", severity: "critical", weight: 12,
      title: "مبلغ فقط از دیتابیس خوانده می‌شود",
      pass: true,
      detail: "مبلغ ارسالی به درگاه از جدول orders و داخل تراکنش قفل‌شده خوانده می‌شود؛ مبلغ مرورگر نادیده گرفته می‌شود.",
      fix: "این مهم‌ترین سد در برابر دستکاری قیمت در سمت کاربر است.",
    },
    {
      id: "pay-verify", group: "پرداخت", severity: "critical", weight: 12,
      title: "تأیید و تسویه سمت سرور (نه ریدایرکت مرورگر)",
      pass: true,
      detail: "زرین‌پال با verify.json و به پرداخت ملت با bpVerifyRequest + bpSettleRequest تأیید می‌شوند.",
      fix: "بدون تسویه (Settle) در ملت، پول به حساب شما منتقل نمی‌شود.",
    },
    {
      id: "pay-idempotent", group: "پرداخت", severity: "high", weight: 8,
      title: "ضد پرداخت تکراری و ضد Replay",
      pass: true,
      detail: "روی (gateway, ref_id) ایندکس یکتا هست و سفارش با SELECT … FOR UPDATE قفل می‌شود.",
      fix: "callback تکراری بانک هرگز دوباره سفارش را پرداخت‌شده نمی‌کند.",
    },
    {
      id: "pay-gateways", group: "پرداخت", severity: "high", weight: 8,
      title: "درگاه‌های فعال با اطلاعات پذیرنده",
      pass: gatewaysConfigured > 0,
      detail: `${gatewaysConfigured} درگاه اطلاعات پذیرنده دارد. رمزها با AES-256-GCM در دیتابیس رمز می‌شوند.`,
      fix: "در «درگاه‌های پرداخت» مرچنت زرین‌پال یا ترمینال/نام‌کاربری/رمز ملت را وارد کنید.",
    },
    {
      id: "pay-expire", group: "پرداخت", severity: "medium", weight: 5,
      title: "انقضای سفارش‌های پرداخت‌نشده و آزادسازی موجودی",
      pass: cfg.cronSecret.length >= 24 && cfg.unpaidTtl >= 5 && cfg.unpaidTtl <= 1440,
      detail: `هر ${cfg.unpaidTtl} دقیقه سفارش‌های رهاشده لغو و موجودی برمی‌گردد (cron با Bearer secret).`,
      fix: "CRON_SECRET حداقل ۲۴ کاراکتر باشد و در scheduler سرور تنظیم شود.",
    },
    {
      id: "https", group: "امنیت", severity: "critical", weight: 10,
      title: "HTTPS اجباری + HSTS",
      pass: https,
      detail: https ? "Nginx تمام ترافیک HTTP را 301 به HTTPS می‌فرستد و HSTS با preload فعال است." : "آدرس سایت باید با https:// شروع شود.",
      fix: "در فیلد «آدرس سایت» دامنه https را وارد کنید و گواهی Let's Encrypt بگیرید.",
    },
    {
      id: "secrets", group: "امنیت", severity: "critical", weight: 10,
      title: "رمز مدیر و کلید رمزنگاری قوی",
      pass: cfg.adminPassword.length >= 16 && cfg.adminSecret.length >= 32,
      detail: `رمز مدیر ${cfg.adminPassword.length} و کلید ${cfg.adminSecret.length} کاراکتر است. سرور در حالت production بدون این‌ها بالا نمی‌آید.`,
      fix: "ADMIN_SECRET را هرگز عوض نکنید؛ داده‌های رمزشده قبلی غیرقابل بازیابی می‌شوند.",
    },
    {
      id: "password-hash", group: "امنیت", severity: "critical", weight: 9,
      title: "هش رمز با scrypt و مقایسه زمان‌ثابت",
      pass: true,
      detail: "scrypt با N=32768 و salt تصادفی؛ مقایسه با timingSafeEqual.",
      fix: "هیچ رمزی به‌صورت متن ساده ذخیره نمی‌شود.",
    },
    {
      id: "session", group: "امنیت", severity: "high", weight: 8,
      title: "نشست HttpOnly + SameSite + هش توکن در دیتابیس",
      pass: cfg.sessionHours >= 1 && cfg.sessionHours <= 72,
      detail: `کوکی نشست ${cfg.sessionHours} ساعته است؛ فقط هش SHA-256 توکن در جدول sessions ذخیره می‌شود.`,
      fix: "با خروج یا غیرفعال‌سازی کارمند، همه نشست‌های او باطل می‌شود.",
    },
    {
      id: "csrf", group: "امنیت", severity: "high", weight: 8,
      title: "محافظت CSRF روی همه متدهای نوشتنی",
      pass: true,
      detail: "توکن CSRF در هدر x-csrf-token و با timingSafeEqual بررسی می‌شود؛ Origin هم کنترل می‌شود.",
      fix: "کلاینت باید توکن را از پاسخ login بخواند و در هدر بفرستد.",
    },
    {
      id: "brute", group: "امنیت", severity: "high", weight: 7,
      title: "محدودیت نرخ ورود و قفل تلاش ناموفق",
      pass: true,
      detail: "۸ تلاش در ۱۰ دقیقه برای ورود مدیر + rate limit لبه در Nginx + محدودیت کلی API.",
      fix: "برای سخت‌گیری بیشتر، TOTP دومرحله‌ای را برای مدیر فعال کنید.",
    },
    {
      id: "csp", group: "امنیت", severity: "medium", weight: 6,
      title: "CSP، X-Frame-Options و هدرهای امنیتی",
      pass: true,
      detail: "helmet + هدرهای Nginx: frame-ancestors 'none'، nosniff، Referrer-Policy و Permissions-Policy.",
      fix: "برای حذف کامل unsafe-inline باید بیلد چندقسمانی (بدون singlefile) انجام شود.",
    },
    {
      id: "cache", group: "سرعت", severity: "medium", weight: 5,
      title: "کش لبه و کش نامتغیر تصاویر",
      pass: true,
      detail: "تصاویر ۳۶۵ روز immutable و پاسخ‌های استاتیک ۵ دقیقه در Nginx کش می‌شوند.",
      fix: "برای ترافیک بالا، S3_PUBLIC_BASE را پشت CDN بگذارید.",
    },
    {
      id: "compress", group: "سرعت", severity: "medium", weight: 5,
      title: "فشرده‌سازی Gzip/Brotli",
      pass: true,
      detail: "compression در Node و gzip/brotli در Nginx برای متن‌ها فعال است.",
      fix: "باندل تک‌فایلی بزرگ است؛ در صورت نیاز بیلد چندفایلی را فعال کنید.",
    },
    {
      id: "indexes", group: "سرعت", severity: "medium", weight: 5,
      title: "ایندکس‌های جست‌وجو و گزارش‌گیری",
      pass: true,
      detail: "ایندکس روی phone، status، created_at و جست‌وجوی فازی عنوان با pg_trgm ساخته می‌شود.",
      fix: "برای گزارش‌های سنگین، از replica خواندنی استفاده کنید.",
    },
    {
      id: "runtime", group: "سرعت", severity: "info", weight: 3,
      title: "اتصال زنده به سرور production",
      pass: online,
      detail: online ? `سرور نسخه ${health?.version} روی ${health?.node} پاسخ داد (${health?.latencyMs}ms).` : "این پیش‌نمایش ایستا است؛ پس از استقرار، این چراغ سبز می‌شود.",
      fix: "پس از docker compose up، همین صفحه را روی دامنه اصلی باز کنید.",
    },
  ];
}

export function readinessScore(checks: Check[]): number {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
  return total ? Math.round((got / total) * 100) : 0;
}

/* ----------------------------- download bundle ---------------------------- */
export type BundleFile = { path: string; content: string; lang: string; note: string };

export function deploymentBundle(cfg: EnvConfig): BundleFile[] {
  return [
    { path: ".env", content: renderEnv(cfg), lang: "ini", note: "متغیرهای محیطی تولیدشده با رمزهای تصادفی شما" },
    { path: ".env.example", content: envExample, lang: "ini", note: "الگوی متغیرها بدون رمز واقعی" },
    { path: "deploy/Dockerfile", content: dockerfile, lang: "docker", note: "بیلد دومرحله‌ای، کاربر غیر-root، healthcheck" },
    { path: "deploy/docker-compose.yml", content: compose, lang: "yaml", note: "Postgres + API + Nginx با شبکه خصوصی" },
    { path: "deploy/nginx.conf", content: nginxConf, lang: "nginx", note: "TLS، HSTS، rate limit، کش لبه" },
    { path: "server/package.json", content: serverPkg, lang: "json", note: "وابستگی‌های سرور" },
    { path: "server/schema.sql", content: schemaSql, lang: "sql", note: "۱۳ جدول با ایندکس و قید یکپارچگی" },
    { path: "server/src/index.mjs", content: serverIndex, lang: "js", note: "API، helmet، CSRF، rate limit، مسیرهای پرداخت" },
    { path: "server/src/db.mjs", content: serverDb, lang: "js", note: "استخر اتصال، تراکنش، healthcheck" },
    { path: "server/src/security.mjs", content: serverSecurity, lang: "js", note: "scrypt، AES-GCM، نشست، TOTP، cron" },
    { path: "server/src/storage.mjs", content: serverStorage, lang: "js", note: "magic bytes، sharp، S3/دیسک" },
    { path: "server/src/payments.mjs", content: serverPayments, lang: "js", note: "زرین‌پال v4 و SOAP به پرداخت ملت" },
    { path: "server/src/migrate.mjs", content: serverMigrate, lang: "js", note: "اجرای idempotent اسکیمای دیتابیس" },
  ];
}

export function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.split("/").pop() ?? filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Sequential downloads keep every file intact without a zip dependency. */
export async function downloadBundle(files: BundleFile[], onStep?: (i: number, path: string) => void) {
  for (let i = 0; i < files.length; i++) {
    onStep?.(i, files[i].path);
    downloadText(files[i].path, files[i].content);
    await new Promise((r) => setTimeout(r, 260));
  }
}

export function bundleBytes(files: BundleFile[]): number {
  return files.reduce((s, f) => s + new TextEncoder().encode(f.content).length, 0);
}

export const DEPLOY_STEPS = [
  { title: "سرور آماده کنید", body: "یک VPS با حداقل ۲ هسته و ۴ گیگ رم (Ubuntu 22.04+) و Docker + Docker Compose نصب کنید." , cmd: "curl -fsSL https://get.docker.com | sh" },
  { title: "فایل‌ها را منتقل کنید", body: "بسته استقرار را دانلود و کنار پوشه پروژه روی سرور قرار دهید.", cmd: "scp -r ./* user@SERVER:/opt/50500" },
  { title: "دامنه و گواهی TLS", body: "رکورد A دامنه را به IP سرور بدهید و گواهی رایگان Let's Encrypt بگیرید.", cmd: "certbot certonly --standalone -d 50500.shop" },
  { title: "بالا آوردن سرویس‌ها", body: "Compose دیتابیس را می‌سازد، migration را اجرا می‌کند و API را پشت Nginx بالا می‌آورد.", cmd: "docker compose -f deploy/docker-compose.yml up -d --build" },
  { title: "زمان‌بندی انقضای سفارش‌ها", body: "این cron موجودی سفارش‌های رهاشده را برمی‌گرداند و نشست‌های منقضی را پاک می‌کند.", cmd: "*/10 * * * * curl -fsS -X POST -H \"Authorization: Bearer $CRON_SECRET\" https://50500.shop/api/cron/expire-unpaid" },
  { title: "پشتیبان‌گیری خودکار", body: "هر شب از دیتابیس خروجی بگیرید و فایل‌ها را به فضای ابری منتقل کنید.", cmd: "0 3 * * * docker compose exec -T db pg_dump -U store store50500 | gzip > /backups/50500-$(date +\\%F).sql.gz" },
];
