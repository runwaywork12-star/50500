import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { q, tx, health as dbHealth } from "./db.mjs";
import {
  assertProductionSecrets, hashPassword, verifyPassword, createSession, readSession, destroySession,
  requireCsrf, requireAdmin, loginGuard, clearLoginGuard, clientIp, audit, newTotp, checkTotp,
  expireUnpaidOrders, ADMIN_PASSWORD,
} from "./security.mjs";
import { saveUpload, deleteUpload, storageHealth, publicUrl } from "./storage.mjs";
import { loadGateway, zarinpalStart, zarinpalVerify, mellatStart, mellatVerify, newOrderToken } from "./payments.mjs";

assertProductionSecrets();

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = process.env.STATIC_DIR ?? path.join(here, "..", "..", "dist");
const ORIGIN = process.env.PUBLIC_ORIGIN ?? "http://localhost:8080";
const PROD = process.env.NODE_ENV === "production";
const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      // The single-file build inlines its script/style, and photos are data: URLs.
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": Array.from(new Set(["'self'", "data:", "blob:", process.env.S3_PUBLIC_BASE].filter(Boolean))),
      "connect-src": ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
      "font-src": ["'self'", "data:"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'", "https://*.zarinpal.com", "https://bpm.shaparak.ir"],
      ...(PROD ? { "upgrade-insecure-requests": [] } : {}),
    },
  },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "256kb" }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== ORIGIN) return res.status(403).json({ error: "Cross-origin request blocked" });
  next();
});

const limiter = (windowMs, max) => rateLimit({
  windowMs, max, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید." },
});
app.use("/api/", limiter(60_000, 240));
app.use("/api/admin/login", limiter(10 * 60_000, 8));
app.use("/api/orders", limiter(60_000, 12));
app.use("/api/admin/media", limiter(60_000, 40));

app.use(async (req, _res, next) => { req.session = await readSession(req).catch(() => null); next(); });

/* --------------------------------- health -------------------------------- */
app.get("/api/health", async (_req, res) => {
  const started = Date.now();
  const [db, storage] = await Promise.allSettled([dbHealth(), storageHealth()]);
  const gateways = {};
  for (const id of ["zarinpal", "mellat"]) {
    const cfg = await loadGateway(id).catch(() => null);
    gateways[id] = {
      configured: Boolean(cfg?.fields?.merchantId || cfg?.fields?.terminalId),
      enabled: Boolean(cfg?.enabled), mode: cfg?.mode ?? "sandbox",
      serverVerification: true,
    };
  }
  res.json({
    ok: db.status === "fulfilled",
    serverMode: true,
    version: "1.0.0",
    uptimeSec: Math.round(process.uptime()),
    latencyMs: Date.now() - started,
    node: process.version,
    env: PROD ? "production" : "development",
    database: db.status === "fulfilled" ? db.value : { ok: false, error: String(db.reason?.message ?? db.reason) },
    storage: storage.status === "fulfilled" ? storage.value : { ok: false, error: String(storage.reason?.message ?? storage.reason) },
    gateways,
    security: {
      https: ORIGIN.startsWith("https://"),
      hsts: PROD,
      csrf: true,
      rateLimit: true,
      passwordHash: "scrypt",
      vault: "aes-256-gcm",
      sessionCookie: "HttpOnly; Secure; SameSite=Lax",
      secretsOk: true,
    },
  });
});

app.get("/api/public/bootstrap", async (_req, res) => {
  const settings = await q("SELECT key,value FROM settings WHERE key IN ('site_content','control')");
  const map = Object.fromEntries(settings.rows.map((r) => [r.key, r.value]));
  const overrides = await q("SELECT slug, title, price, compare_price, stock, image, active, cost FROM products WHERE custom = false");
  const gateways = [];
  for (const id of ["zarinpal", "mellat", "card"]) {
    const cfg = await loadGateway(id).catch(() => null);
    if (cfg?.enabled) gateways.push({ id, name: cfg.name ?? id, mode: cfg.mode ?? "sandbox", ...(id === "card" ? { card: cfg.fields } : {}) });
  }
  res.json({
    serverMode: true, user: null,
    siteContent: map.site_content ?? null,
    control: map.control ?? null,
    productOverrides: Object.fromEntries(overrides.rows.map((r) => [r.slug, {
      title: r.title, price: Number(r.price), comparePrice: r.compare_price === null ? null : Number(r.compare_price),
      stock: r.stock, image: r.image, active: r.active, cost: Number(r.cost),
    }])),
    gateways,
    redirectHosts: ["bpm.shaparak.ir", "www.zarinpal.com", "payment.zarinpal.com", "sandbox.zarinpal.com", "ibp.zarinpal.com"],
  });
});

/* ---------------------------------- auth ---------------------------------- */
app.post("/api/admin/login", async (req, res) => {
  const ip = clientIp(req);
  const guard = loginGuard(`admin:${ip}`);
  if (!guard.allowed) return res.status(429).json({ error: `تلاش زیاد. ${guard.retryInSec} ثانیه دیگر تلاش کنید.` });
  const { email, password, totp } = req.body ?? {};
  let subject = "owner", ok = false, totpSecret = null;

  if (!email || email === "owner") {
    ok = ADMIN_PASSWORD.length > 0 && String(password) === ADMIN_PASSWORD;
    const { rows } = await q("SELECT value FROM settings WHERE key='owner_totp'");
    totpSecret = rows[0]?.value?.secret ?? null;
  } else {
    const { rows } = await q("SELECT id,password_hash,totp_secret,active FROM staff WHERE email=$1", [String(email).toLowerCase()]);
    const staff = rows[0];
    ok = Boolean(staff?.active) && verifyPassword(String(password ?? ""), staff.password_hash);
    subject = staff?.id ?? "unknown";
    totpSecret = staff?.totp_secret ?? null;
  }
  if (!ok) { await audit("anonymous", "امنیت", "ورود ناموفق مدیر", ip, { email }); return res.status(401).json({ error: "ایمیل یا رمز عبور نادرست است." }); }
  if (totpSecret) {
    if (!totp) return res.json({ needTotp: true });
    if (!checkTotp(totpSecret, totp)) return res.status(401).json({ error: "کد دومرحله‌ای نادرست است." });
  }
  clearLoginGuard(`admin:${ip}`);
  const { csrf } = await createSession(res, { kind: subject === "owner" ? "admin" : "staff", subject, ip, userAgent: req.get("user-agent") });
  await audit(email ?? "owner", "امنیت", "ورود موفق به پنل", ip);
  res.json({ admin: { id: subject, email: email ?? "owner", name: "مدیر", role: subject === "owner" ? "owner" : "staff", totpEnabled: Boolean(totpSecret) }, csrf });
});

app.post("/api/admin/logout", async (req, res) => { await destroySession(req, res); res.json({ ok: true }); });
app.get("/api/admin/me", requireAdmin, (req, res) => res.json({ admin: { id: req.session.subject, role: req.session.kind === "admin" ? "owner" : "staff" }, csrf: req.session.csrf }));
app.post("/api/admin/totp/setup", requireAdmin, async (req, res) => res.json(newTotp(req.session.subject)));

/* --------------------------------- orders --------------------------------- */
const orderSchema = z.object({
  items: z.array(z.object({ slug: z.string().max(160), qty: z.number().int().min(1).max(20), leather: z.string().max(20).optional(), thread: z.string().max(20).optional() })).min(1).max(30),
  customer: z.object({
    name: z.string().min(3).max(80), phone: z.string().regex(/^09\d{9}$/),
    province: z.string().min(2).max(40), city: z.string().min(2).max(40),
    address: z.string().min(10).max(400), postalCode: z.string().max(10).optional().default(""), notes: z.string().max(300).optional().default(""),
  }),
  shippingMethod: z.enum(["post", "tipax", "pickup"]),
  payment: z.enum(["online", "cod", "card"]),
  coupon: z.string().max(30).nullable().optional(),
});

app.post("/api/orders", async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "اطلاعات سفارش نامعتبر است", issues: parsed.error.issues.slice(0, 4) });
  const input = parsed.data;
  try {
    const result = await tx(async (c) => {
      // Prices are read from the DB inside the transaction — the client total is ignored.
      let subtotal = 0;
      const lines = [];
      for (const item of input.items) {
        const base = item.slug.startsWith("sub:") ? item.slug.split(":")[1] : item.slug;
        const { rows } = await c.query("SELECT slug,title,price,cost,stock,image,active FROM products WHERE slug=$1 FOR UPDATE", [base]);
        const p = rows[0];
        if (!p || !p.active) throw new Error(`محصول «${item.slug}» در دسترس نیست`);
        if (p.stock < item.qty) throw new Error(`موجودی «${p.title}» کافی نیست`);
        await c.query("UPDATE products SET stock = stock - $2 WHERE slug=$1", [base, item.qty]);
        subtotal += Number(p.price) * item.qty;
        lines.push({ ...item, title: p.title, price: Number(p.price), cost: Number(p.cost), image: p.image });
      }
      let discount = 0;
      if (input.coupon) {
        const { rows } = await c.query("SELECT percent,min_amount,max_uses,uses FROM coupons WHERE code=$1 AND active FOR UPDATE", [input.coupon.toUpperCase()]);
        const cp = rows[0];
        if (cp && subtotal >= Number(cp.min_amount) && (cp.max_uses === null || cp.uses < cp.max_uses)) {
          discount = Math.round((subtotal * cp.percent) / 100);
          await c.query("UPDATE coupons SET uses = uses + 1 WHERE code=$1", [input.coupon.toUpperCase()]);
        }
      }
      const shipping = input.shippingMethod === "post" && subtotal - discount < 5_000_000 ? 120_000 : 0;
      const total = subtotal - discount + shipping;
      const code = String(50_000_000 + Math.floor(Math.random() * 49_999_999));
      const token = newOrderToken();
      const ttl = Number(process.env.UNPAID_ORDER_TTL_MINUTES ?? 30);
      await c.query(
        `INSERT INTO orders(code,customer_name,phone,province,city,address,postal_code,notes,shipping_method,
          payment_method,payment_status,subtotal,discount,shipping,total,coupon,access_token,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now() + ($18 || ' minutes')::interval)`,
        [code, input.customer.name, input.customer.phone, input.customer.province, input.customer.city,
         input.customer.address, input.customer.postalCode, input.customer.notes, input.shippingMethod,
         input.payment, input.payment === "cod" ? "cod" : "pending", subtotal, discount, shipping, total,
         input.coupon ?? null, token, String(ttl)],
      );
      for (const l of lines) {
        await c.query(
          "INSERT INTO order_items(order_code,slug,title,qty,unit_price,unit_cost,image,leather,thread) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [code, l.slug, l.title, l.qty, l.price, l.cost, l.image, l.leather ?? null, l.thread ?? null],
        );
      }
      return { code, accessToken: token, total };
    });
    res.json({ order: result });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

app.get("/api/orders/:code", async (req, res) => {
  const token = req.get("x-order-token");
  const { rows } = await q("SELECT * FROM orders WHERE code=$1", [req.params.code]);
  const order = rows[0];
  if (!order || (order.access_token !== token && req.session?.kind !== "admin" && req.session?.kind !== "staff")) {
    return res.status(404).json({ error: "سفارش یافت نشد" });
  }
  const items = await q("SELECT * FROM order_items WHERE order_code=$1", [order.code]);
  res.json({ order: { ...order, access_token: undefined, items: items.rows } });
});

/* -------------------------------- payments -------------------------------- */
app.post("/api/payments/start", async (req, res) => {
  const { code, token, gateway } = req.body ?? {};
  const { rows } = await q("SELECT access_token FROM orders WHERE code=$1", [code]);
  if (!rows[0] || rows[0].access_token !== token) return res.status(403).json({ error: "دسترسی به سفارش مجاز نیست" });
  const cfg = await loadGateway(gateway);
  if (!cfg?.enabled) return res.status(400).json({ error: "این درگاه فعال نیست" });
  const callbackUrl = `${ORIGIN}/api/payments/callback/${gateway}`;
  try {
    const out = gateway === "mellat" ? await mellatStart({ code, cfg, callbackUrl }) : await zarinpalStart({ code, cfg, callbackUrl });
    res.json({ redirectUrl: out.url, authority: out.authority });
  } catch (err) { res.status(502).json({ error: err.message }); }
});

const finish = (res, out) => res.redirect(303, `${ORIGIN}/#/order/${out.code}?pay=${out.ok ? "success" : "failed"}`);

app.get("/api/payments/callback/zarinpal", async (req, res) => {
  try {
    const cfg = await loadGateway("zarinpal");
    finish(res, await zarinpalVerify({ authority: req.query.Authority, status: req.query.Status, cfg }));
  } catch (err) { res.redirect(303, `${ORIGIN}/#/track?error=${encodeURIComponent(err.message)}`); }
});

app.post("/api/payments/callback/mellat", async (req, res) => {
  try {
    const cfg = await loadGateway("mellat");
    finish(res, await mellatVerify({
      refId: req.body.RefId, resCode: req.body.ResCode, saleOrderId: req.body.SaleOrderId,
      saleReferenceId: req.body.SaleReferenceId, cardHolderPan: req.body.CardHolderPan, cfg,
    }));
  } catch (err) { res.redirect(303, `${ORIGIN}/#/track?error=${encodeURIComponent(err.message)}`); }
});

/* --------------------------------- uploads -------------------------------- */
app.post("/api/admin/media", requireAdmin, requireCsrf, express.raw({ type: "*/*", limit: "10mb" }), async (req, res) => {
  try {
    const asset = await saveUpload(
      { buffer: req.body, originalname: req.get("x-file-name") ?? "upload" },
      { folder: req.get("x-folder") ?? "عمومی", alt: req.get("x-alt") ?? "" },
    );
    await audit(req.session.subject, "رسانه", `آپلود تصویر ${asset.name}`, clientIp(req));
    res.json({ asset });
  } catch (err) { res.status(400).json({ error: err.message }); }
});
app.delete("/api/admin/media/:id", requireAdmin, requireCsrf, async (req, res) => {
  res.json({ ok: await deleteUpload(req.params.id) });
});
app.get("/api/admin/media", requireAdmin, async (_req, res) => {
  const { rows } = await q("SELECT * FROM media ORDER BY created_at DESC LIMIT 500");
  res.json({ media: rows.map((r) => ({ ...r, dataUrl: publicUrl(r.object_key) })) });
});

/* ---------------------------- admin data + cron --------------------------- */
app.get("/api/admin/bootstrap", requireAdmin, async (_req, res) => {
  const orders = await q("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500");
  const items = await q("SELECT * FROM order_items WHERE order_code = ANY($1)", [orders.rows.map((o) => o.code)]);
  const products = await q("SELECT * FROM products ORDER BY created_at DESC");
  res.json({
    csrf: _req.session.csrf,
    orders: orders.rows.map((o) => ({ ...o, items: items.rows.filter((i) => i.order_code === o.code) })),
    products: products.rows,
    control: (await q("SELECT value FROM settings WHERE key='control'")).rows[0]?.value ?? null,
    gateways: await Promise.all(["zarinpal", "mellat"].map(async (id) => ({ id, ...((await loadGateway(id)) ?? {}) }))),
  });
});

app.put("/api/admin/settings/:key", requireAdmin, requireCsrf, async (req, res) => {
  const key = String(req.params.key).replace(/[^a-z_]/g, "").slice(0, 40);
  await q("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, at=now()", [key, JSON.stringify(req.body.value ?? {})]);
  await audit(req.session.subject, "تنظیمات", `به‌روزرسانی ${key}`, clientIp(req));
  res.json({ ok: true });
});

app.post("/api/cron/expire-unpaid", async (req, res) => {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 24 || req.get("authorization") !== `Bearer ${secret}`) return res.status(403).json({ error: "forbidden" });
  const cancelled = await expireUnpaidOrders(Number(process.env.UNPAID_ORDER_TTL_MINUTES ?? 30));
  await q("DELETE FROM sessions WHERE expires_at < now()");
  res.json({ cancelled });
});

/* ------------------------------ static + errors --------------------------- */
if (process.env.STORAGE_DRIVER !== "s3") {
  app.use("/uploads", express.static(process.env.STORAGE_DIR ?? "/data/uploads", {
    maxAge: "365d", immutable: true, setHeaders: (r) => r.setHeader("X-Content-Type-Options", "nosniff"),
  }));
}
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: PROD ? "1h" : 0, index: false }));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}
app.use((err, _req, res, _next) => {
  console.error("[error]", err.message);
  res.status(500).json({ error: "خطای داخلی سرور" });
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`[50500] API listening on :${port} (${PROD ? "production" : "development"})`));
