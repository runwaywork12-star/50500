import { Hono, type Context, type Next } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { bodyLimit } from "hono/body-limit";
import sharp from "sharp";
import { z, type ZodTypeAny } from "zod";
import { config } from "./config";
import { CATALOG, SEED_PRODUCTS, audit, sql } from "./db";
import { GATEWAY_NAMES, REDIRECT_HOSTS, REQUIRED_FIELDS, gateways, isGatewayError, type Creds, type GatewayId, type GatewayMode } from "./payments";
import {
  burnPasswordCheck, decrypt, encrypt, generateTotpSecret, hashPassword, maskPhone, normalizeDigits, normalizePhone,
  passwordPolicy, randomDigits, randomToken, rateLimit, safeEqual, sha256, totpUri, verifyPassword, verifyTotp,
} from "./security";
import { contentSecurityPolicy, serveStatic } from "./static";

/* ---------------------------------- types --------------------------------- */
type Perms = Record<string, { read: boolean; write: boolean }>;
type AdminRow = { id: string; email: string; name: string; role: "owner" | "staff"; permissions: Perms; totp_enabled: boolean };
type UserRow = { id: string; name: string; email: string; phone: string };
type AppEnv = { Bindings: HttpBindings; Variables: { user: UserRow | null; admin: AdminRow | null; ip: string } };
type Ctx = Context<AppEnv>;
type OrderRow = {
  id: string; code: string; access_hash: string; user_id: string | null; customer: Record<string, string>; phone: string;
  items: { slug: string; qty: number; title: string; price: number; leather?: string; thread?: string }[];
  subtotal: number; discount: number; shipping: number; total: number; coupon: string | null; shipping_method: string;
  payment_method: "online" | "cod" | "card"; status: string; payment_status: string; tracking: string | null; note: string | null;
  expires_at: Date | null; created_at: Date;
};

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const app = new Hono<AppEnv>();

const USER_COOKIE = config.production ? "__Host-sid" : "sid";
const ADMIN_COOKIE = config.production ? "__Host-asid" : "asid";
const USER_TTL = 30 * 24 * 3600;
const ADMIN_TTL = 8 * 3600;
const GATEWAY_IDS = ["zarinpal", "sadad", "sep", "zibal", "card"] as const;
const SECRET_FIELDS: Record<string, string[]> = { sadad: ["secretKey"], sep: ["password"] };
const ORDER_STATUSES = ["pending", "confirmed", "producing", "shipped", "delivered", "cancelled"] as const;
const MODULES = ["orders", "products", "customers", "coupons", "reviews", "content", "pages", "media", "payments", "agents", "settings", "finance", "affiliates"] as const;

/* --------------------------------- helpers -------------------------------- */
const fail = (c: Ctx, status: number, error: string, extra: Record<string, unknown> = {}) => c.json({ error, ...extra }, status as 400);

function clientIp(c: Ctx) {
  // Liara terminates TLS at its proxy and appends the client address to X-Forwarded-For.
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || c.env?.incoming?.socket?.remoteAddress || "unknown";
}

function limit(c: Ctx, bucket: string, max: number, windowMs: number): Response | null {
  const result = rateLimit(`${bucket}:${c.get("ip")}`, max, windowMs);
  if (result.ok) return null;
  c.header("Retry-After", String(result.retryAfter));
  return fail(c, 429, "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.");
}

async function readBody<S extends ZodTypeAny>(c: Ctx, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try { raw = await c.req.json(); } catch { throw new HttpError(400, "بدنه درخواست معتبر نیست"); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "ورودی نامعتبر است");
  return parsed.data;
}

const isUnique = (error: unknown) => typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";

async function createSession(c: Ctx, kind: "user" | "admin", subjectId: string) {
  const token = randomToken(32);
  const ttl = kind === "admin" ? ADMIN_TTL : USER_TTL;
  await sql`insert into sessions (id_hash, kind, subject_id, expires_at, ip, user_agent)
    values (${sha256(token)}, ${kind}, ${subjectId}, now() + ${`${ttl} seconds`}::interval, ${c.get("ip")}, ${(c.req.header("user-agent") ?? "").slice(0, 300)})`;
  setCookie(c, kind === "admin" ? ADMIN_COOKIE : USER_COOKIE, token, {
    httpOnly: true, secure: config.production, sameSite: kind === "admin" ? "Strict" : "Lax", path: "/", maxAge: ttl,
  });
}

async function destroySession(c: Ctx, kind: "user" | "admin") {
  const name = kind === "admin" ? ADMIN_COOKIE : USER_COOKIE;
  const token = getCookie(c, name);
  if (!token) return;
  await sql`delete from sessions where id_hash = ${sha256(token)}`;
  deleteCookie(c, name, { path: "/", secure: config.production });
}

function requireUser(c: Ctx) {
  const user = c.get("user");
  if (!user) throw new HttpError(401, "ابتدا وارد حساب کاربری شوید.");
  return user;
}

function requireAdmin(c: Ctx, module?: (typeof MODULES)[number], write = false) {
  const admin = c.get("admin");
  if (!admin) throw new HttpError(401, "نشست مدیریت معتبر نیست؛ دوباره وارد شوید.");
  if (module && admin.role !== "owner") {
    const perm = admin.permissions?.[module];
    if (!perm?.read || (write && !perm.write)) throw new HttpError(403, "مجوز این عملیات را ندارید.");
  }
  return admin;
}

const publicUser = (u: UserRow | null) => (u ? { id: u.id, name: u.name, email: u.email, phone: u.phone } : null);
const publicAdmin = (a: AdminRow) => ({ id: a.id, email: a.email, name: a.name, role: a.role, permissions: a.permissions, totpEnabled: a.totp_enabled });

function mapOrder(o: OrderRow, masked = false) {
  return {
    code: o.code,
    items: o.items.map((i) => ({ slug: i.slug, qty: i.qty, title: i.title, price: i.price, leather: i.leather, thread: i.thread })),
    customer: masked
      ? { name: o.customer.name, phone: maskPhone(o.phone), province: o.customer.province, city: o.customer.city, address: "—", postalCode: "", notes: "" }
      : o.customer,
    shippingMethod: o.shipping_method, payment: o.payment_method, coupon: o.coupon,
    subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total,
    status: o.status, paymentStatus: o.payment_status, tracking: o.tracking, createdAt: o.created_at.toISOString(),
    expiresAt: o.expires_at?.toISOString() ?? null,
  };
}

function mapAdminOrder(o: OrderRow) {
  const payment = o.payment_status === "paid" || o.payment_status === "paid_review" ? "paid" : o.payment_status === "cod" ? "cod" : o.payment_status === "refunded" ? "refunded" : "pending";
  return {
    code: o.code, customer: o.customer.name, phone: o.phone, province: o.customer.province ?? "", city: o.customer.city ?? "",
    items: o.items.map((i) => ({ slug: i.slug, title: i.title, qty: i.qty, price: i.price, image: "", leather: i.leather, thread: i.thread })),
    subtotal: o.subtotal, shipping: o.shipping, discount: o.discount, total: o.total, status: o.status, payment,
    paymentStatus: o.payment_status, paymentMethod: o.payment_method, shippingMethod: o.shipping_method, createdAt: o.created_at.toISOString(),
    tracking: o.tracking ?? undefined, note: o.note ?? undefined, address: o.customer.address, postalCode: o.customer.postalCode,
  };
}

async function getSetting<T>(key: string): Promise<T | null> {
  const [row] = await sql<{ value: T }[]>`select value from settings where key = ${key}`;
  return row?.value ?? null;
}

type GatewayRecord = { id: string; enabled: boolean; mode: GatewayMode; currency: "IRT" | "IRR"; position: number; fields: Record<string, string> };
async function loadGateway(id: string): Promise<GatewayRecord> {
  const [row] = await sql<{ value_enc: string; meta: Omit<GatewayRecord, "id" | "fields"> }[]>`select value_enc, meta from vault where key = ${`gateway:${id}`}`;
  const defaults = { enabled: false, mode: "sandbox" as GatewayMode, currency: (id === "zarinpal" || id === "zibal" || id === "card" ? "IRT" : "IRR") as "IRT" | "IRR", position: GATEWAY_IDS.indexOf(id as never) + 1 };
  if (!row) return { id, ...defaults, fields: {} };
  return { id, ...defaults, ...row.meta, fields: JSON.parse(decrypt(row.value_enc)) as Record<string, string> };
}

async function publicGateways() {
  const all = await Promise.all(GATEWAY_IDS.map(loadGateway));
  return all.filter((g) => g.enabled).sort((a, b) => a.position - b.position).map((g) => ({
    id: g.id, name: g.id === "card" ? "کارت‌به‌کارت" : GATEWAY_NAMES[g.id as GatewayId], mode: g.mode,
    card: g.id === "card" ? { owner: g.fields.owner ?? "", cardNumber: g.fields.cardNumber ?? "", iban: g.fields.iban ?? "", bank: g.fields.bank ?? "" } : undefined,
  }));
}

async function adminGateways() {
  const all = await Promise.all(GATEWAY_IDS.map(loadGateway));
  return all.map((g) => {
    const secrets = SECRET_FIELDS[g.id] ?? [];
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(g.fields)) {
      if (secrets.includes(key)) fields[`__set_${key}`] = value ? "1" : "";
      else fields[key] = value;
    }
    return { id: g.id, enabled: g.enabled, mode: g.mode, currency: g.currency, position: g.position, fields };
  });
}

type CustomProduct = { slug: string; title: string; category: string; price: number; comparePrice: number | null; stock: number; image: string | null; body: string; brandName: string | null; active: boolean };
async function customProducts(includeInactive = false): Promise<CustomProduct[]> {
  const rows = await sql<{ slug: string; title: string; category: string; price: number; compare_price: number | null; stock: number; image: string | null; body: string; brand_name: string | null; active: boolean }[]>`
    select slug, title, category, price, compare_price, stock, image, body, brand_name, active from products where custom ${includeInactive ? sql`` : sql`and active`} order by created_at desc`;
  return rows.map((r) => ({ slug: r.slug, title: r.title, category: r.category, price: r.price, comparePrice: r.compare_price, stock: r.stock, image: r.image, body: r.body, brandName: r.brand_name, active: r.active }));
}

async function productOverrides() {
  const rows = await sql<{ slug: string; title: string; price: number; compare_price: number | null; stock: number; active: boolean; image: string | null; body: string; custom: boolean }[]>`
    select slug, title, price, compare_price, stock, active, image, body, custom from products where not custom`;
  const out: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const seed = SEED_PRODUCTS.get(r.slug);
    const o: Record<string, unknown> = {};
    if (!seed || r.title !== seed.title) o.title = r.title;
    if (!seed || r.price !== seed.price) o.price = r.price;
    if (!seed || r.compare_price !== seed.comparePrice) o.comparePrice = r.compare_price;
    if (!seed || r.stock !== seed.stock) o.stock = r.stock;
    if (!r.active) o.active = false;
    if (r.image) o.image = r.image;
    if (r.body) o.body = r.body;
    if (Object.keys(o).length) out[r.slug] = o;
  }
  return out;
}

async function findOrderWithAccess(c: Ctx, code: string, token?: string | null): Promise<OrderRow> {
  if (!/^\d{6,12}$/.test(code)) throw new HttpError(404, "سفارش پیدا نشد.");
  const [order] = await sql<OrderRow[]>`select * from orders where code = ${code}`;
  const user = c.get("user");
  const allowed = order && ((token && safeEqual(sha256(token), order.access_hash)) || (user && order.user_id === user.id));
  if (!order || !allowed) throw new HttpError(404, "سفارش پیدا نشد.");
  return order;
}

const IMAGE_REF = /^(\/media\/[A-Za-z0-9_-]{8,64}|images\/[A-Za-z0-9/_.-]{1,200}|https:\/\/[^\s"'<>]{1,2000})$/;

/* ------------------------------- middleware -------------------------------- */
app.use("*", async (c, next) => {
  c.set("ip", clientIp(c));
  c.set("user", null);
  c.set("admin", null);
  await next();
  const h = c.res.headers;
  h.set("Content-Security-Policy", contentSecurityPolicy(config.production));
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  if (config.production) h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  h.delete("X-Powered-By");
});

app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  const general = limit(c, "api", 600, 60_000);
  if (general) return general;
  // CSRF: every state-changing request must carry our custom header (impossible cross-site
  // without a CORS preflight, which we never grant) and must not come from another origin.
  // Bank callbacks are exempt: they are cross-site by design and verified server-to-server.
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !c.req.path.startsWith("/api/payments/callback/")) {
    const origin = c.req.header("origin");
    if (c.req.header("x-50500-client") !== "1" || c.req.header("sec-fetch-site") === "cross-site" || (origin && origin !== config.appOrigin)) {
      return fail(c, 403, "درخواست نامعتبر است.");
    }
  }
  const userToken = getCookie(c, USER_COOKIE);
  if (userToken) {
    const [user] = await sql<UserRow[]>`select u.id, u.name, u.email, u.phone from sessions s join users u on u.id = s.subject_id
      where s.id_hash = ${sha256(userToken)} and s.kind = 'user' and s.expires_at > now()`;
    c.set("user", user ?? null);
  }
  const adminToken = getCookie(c, ADMIN_COOKIE);
  if (adminToken) {
    const [admin] = await sql<AdminRow[]>`select a.id, a.email, a.name, a.role, a.permissions, a.totp_enabled from sessions s join admins a on a.id = s.subject_id
      where s.id_hash = ${sha256(adminToken)} and s.kind = 'admin' and s.expires_at > now() and a.active`;
    c.set("admin", admin ?? null);
  }
  await next();
});

app.use("/api/*", (c: Ctx, next: Next) => {
  const maxSize = c.req.path === "/api/admin/media" && c.req.method === "POST" ? 6 * 1024 * 1024 : c.req.path.startsWith("/api/admin/settings/") ? 1024 * 1024 : 64 * 1024;
  return bodyLimit({ maxSize, onError: (ctx) => ctx.json({ error: "حجم درخواست بیش از حد مجاز است." }, 413) })(c, next);
});

app.onError((error, c) => {
  if (error instanceof HttpError) return fail(c as Ctx, error.status, error.message);
  console.error("Unhandled error:", error);
  return c.json({ error: "خطای داخلی سرور؛ لطفاً دوباره تلاش کنید." }, 500);
});

/* ---------------------------------- public --------------------------------- */
app.get("/api/health", async (c) => {
  await sql`select 1`;
  return c.json({ ok: true });
});

app.get("/api/public/bootstrap", async (c) => {
  const [siteContent, control, overrides, payGateways, custom] = await Promise.all([
    getSetting<Record<string, unknown>>("site_content"),
    getSetting<{ pages?: unknown }>("control"),
    productOverrides(),
    publicGateways(),
    customProducts(),
  ]);
  return c.json({
    serverMode: true,
    user: publicUser(c.get("user")),
    siteContent,
    control: control ? { pages: control.pages } : null,
    productOverrides: overrides,
    customProducts: custom,
    gateways: payGateways,
    redirectHosts: REDIRECT_HOSTS,
  });
});

/* --------------------------------- reviews --------------------------------- */
app.get("/api/reviews", async (c) => {
  const slug = c.req.query("slug") ?? "";
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return fail(c, 400, "محصول نامعتبر است.");
  const rows = await sql<{ id: string; name: string; rating: number; comment: string; created_at: Date }[]>`
    select id, name, rating, comment, created_at from reviews where slug = ${slug} and status = 'approved' order by created_at desc limit 50`;
  return c.json({ reviews: rows.map((r) => ({ id: r.id, name: r.name, rating: r.rating, comment: r.comment, date: r.created_at.toISOString() })) });
});

app.post("/api/reviews", async (c) => {
  const limited = limit(c, "review", 5, 3600_000);
  if (limited) return limited;
  const body = await readBody(c, z.object({
    slug: z.string().regex(/^[a-z0-9-]{1,120}$/, "محصول نامعتبر است."),
    name: z.string().trim().min(2, "نام را کامل وارد کنید.").max(60),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(10, "نظر باید حداقل ۱۰ کاراکتر باشد.").max(1000),
  }));
  const [product] = await sql`select slug from products where slug = ${body.slug}`;
  if (!product) return fail(c, 404, "محصول پیدا نشد.");
  const user = c.get("user");
  const [recent] = await sql`select id from reviews where slug = ${body.slug} and name = ${body.name} and created_at > now() - interval '24 hours' limit 1`;
  if (recent) return fail(c, 429, "نظر شما برای این محصول ثبت شده و در انتظار بررسی است.");
  await sql`insert into reviews (slug, user_id, name, rating, comment) values (${body.slug}, ${user?.id ?? null}, ${body.name}, ${body.rating}, ${body.comment})`;
  return c.json({ ok: true, pending: true });
});

/* ------------------------------- customer auth ----------------------------- */
const email = z.string().trim().toLowerCase().email("ایمیل معتبر نیست.").max(120);
const phone = z.string().max(20).transform(normalizePhone).refine((v) => /^09\d{9}$/.test(v), "شماره موبایل معتبر نیست.");

app.post("/api/auth/register", async (c) => {
  const limited = limit(c, "register", 8, 3600_000);
  if (limited) return limited;
  const body = await readBody(c, z.object({ name: z.string().trim().min(3, "نام را کامل وارد کنید.").max(80), email, phone, password: z.string().max(200) }));
  const policy = passwordPolicy(body.password);
  if (policy) return fail(c, 400, policy);
  try {
    const [user] = await sql<UserRow[]>`insert into users (name, email, phone, password_hash)
      values (${body.name}, ${body.email}, ${body.phone}, ${await hashPassword(body.password)}) returning id, name, email, phone`;
    await createSession(c, "user", user.id);
    return c.json({ user: publicUser(user) });
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "این ایمیل یا شماره موبایل قبلاً ثبت شده است.");
    throw error;
  }
});

app.post("/api/auth/login", async (c) => {
  const body = await readBody(c, z.object({ email, password: z.string().max(200) }));
  const limited = limit(c, "login", 20, 900_000) ?? limit(c, `login:${body.email}`, 10, 900_000);
  if (limited) return limited;
  const [row] = await sql<(UserRow & { password_hash: string; failed_logins: number; locked_until: Date | null })[]>`
    select id, name, email, phone, password_hash, failed_logins, locked_until from users where lower(email) = ${body.email}`;
  if (!row) {
    await burnPasswordCheck(body.password);
    return fail(c, 401, "ایمیل یا رمز عبور نادرست است.");
  }
  if (row.locked_until && row.locked_until > new Date()) return fail(c, 429, "به دلیل تلاش‌های ناموفق، حساب موقتاً قفل شده است.");
  if (!(await verifyPassword(body.password, row.password_hash))) {
    await sql`update users set failed_logins = failed_logins + 1,
      locked_until = case when failed_logins + 1 >= 10 then now() + interval '15 minutes' else locked_until end where id = ${row.id}`;
    return fail(c, 401, "ایمیل یا رمز عبور نادرست است.");
  }
  await sql`update users set failed_logins = 0, locked_until = null where id = ${row.id}`;
  await destroySession(c, "user"); // session fixation protection
  await createSession(c, "user", row.id);
  return c.json({ user: publicUser(row) });
});

app.post("/api/auth/logout", async (c) => {
  await destroySession(c, "user");
  return c.json({ ok: true });
});

app.get("/api/auth/me", (c) => c.json({ user: publicUser(c.get("user")) }));

app.post("/api/auth/reset", (c) => fail(c, 503, "بازیابی آنلاین رمز هنوز فعال نشده است؛ لطفاً با پشتیبانی تماس بگیرید."));

app.patch("/api/account/profile", async (c) => {
  const user = requireUser(c);
  const body = await readBody(c, z.object({ name: z.string().trim().min(3, "نام معتبر نیست.").max(80), phone }));
  try {
    const [updated] = await sql<UserRow[]>`update users set name = ${body.name}, phone = ${body.phone} where id = ${user.id} returning id, name, email, phone`;
    return c.json({ user: publicUser(updated) });
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "این شماره موبایل متعلق به حساب دیگری است.");
    throw error;
  }
});

app.post("/api/account/password", async (c) => {
  const user = requireUser(c);
  const limited = limit(c, `pw:${user.id}`, 8, 900_000);
  if (limited) return limited;
  const body = await readBody(c, z.object({ current: z.string().max(200), next: z.string().max(200) }));
  const [row] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${user.id}`;
  if (!row || !(await verifyPassword(body.current, row.password_hash))) return fail(c, 400, "رمز فعلی نادرست است.");
  const policy = passwordPolicy(body.next);
  if (policy) return fail(c, 400, policy);
  await sql`update users set password_hash = ${await hashPassword(body.next)} where id = ${user.id}`;
  await sql`delete from sessions where kind = 'user' and subject_id = ${user.id}`; // sign out every device
  await createSession(c, "user", user.id);
  return c.json({ ok: true });
});

app.get("/api/account/orders", async (c) => {
  const user = requireUser(c);
  const rows = await sql<OrderRow[]>`select * from orders where user_id = ${user.id} order by created_at desc limit 100`;
  return c.json({ orders: rows.map((o) => mapOrder(o)) });
});

/* ---------------------------------- orders --------------------------------- */
const orderSchema = z.object({
  items: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]{1,120}$/, "محصول نامعتبر است."),
    qty: z.number().int().min(1).max(10),
    leather: z.string().max(20).optional(),
    thread: z.string().max(20).optional(),
  })).min(1, "سبد خرید خالی است.").max(30),
  customer: z.object({
    name: z.string().trim().min(3, "نام گیرنده را کامل وارد کنید.").max(80),
    phone,
    province: z.string().trim().min(1, "استان را وارد کنید.").max(40),
    city: z.string().trim().min(1, "شهر را وارد کنید.").max(40),
    address: z.string().trim().min(10, "نشانی کامل را وارد کنید.").max(300),
    postalCode: z.string().max(20).optional().default("").transform((v) => normalizeDigits(v).replace(/\D/g, "")).refine((v) => v === "" || v.length === 10, "کد پستی ۱۰ رقمی است."),
    notes: z.string().trim().max(500).optional().default(""),
  }),
  shippingMethod: z.string().max(20),
  payment: z.enum(["online", "cod"]),
  coupon: z.string().trim().max(30).nullable().optional(),
});

app.post("/api/orders", async (c) => {
  const limited = limit(c, "order", 20, 3600_000);
  if (limited) return limited;
  const body = await readBody(c, orderSchema);
  const method = CATALOG.shipping.find((m) => m.id === body.shippingMethod);
  if (!method) return fail(c, 400, "روش ارسال نامعتبر است.");
  const couponCode = body.coupon ? body.coupon.trim().toUpperCase() : null;

  // Merge duplicate lines so per-line quantity limits cannot be bypassed.
  const merged = new Map<string, { slug: string; qty: number; leather?: string; thread?: string }>();
  for (const item of body.items) {
    const key = `${item.slug}|${item.leather ?? ""}|${item.thread ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, { ...item, qty: Math.min(10, (prev?.qty ?? 0) + item.qty) });
  }

  const accessToken = randomToken(24);
  const user = c.get("user");
  const order = await sql.begin(async (tx) => {
    const lines: OrderRow["items"] = [];
    for (const item of merged.values()) {
      // Atomic reservation: the row is only updated when enough stock exists (no overselling).
      const [row] = await tx<{ price: number; title: string; category: string }[]>`
        update products set stock = stock - ${item.qty}, updated_at = now()
        where slug = ${item.slug} and active and stock >= ${item.qty} returning price, title, category`;
      if (!row) throw new HttpError(409, `موجودی یکی از کالاها کافی نیست یا کالا دیگر فروخته نمی‌شود (${item.slug}).`);
      const leather = row.category === "embroidered-leather" ? (CATALOG.leather.includes(item.leather ?? "") ? item.leather : CATALOG.leather[0]) : undefined;
      const thread = row.category === "embroidered-leather" ? (CATALOG.thread.includes(item.thread ?? "") ? item.thread : CATALOG.thread[0]) : undefined;
      lines.push({ slug: item.slug, qty: item.qty, title: row.title, price: row.price, leather, thread });
    }
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    let discount = 0;
    if (couponCode) {
      const [cp] = await tx<{ percent: number; min_amount: number; max_uses: number | null; uses: number; active: boolean }[]>`
        select percent, min_amount, max_uses, uses, active from coupons where code = ${couponCode} for update`;
      if (!cp || !cp.active) throw new HttpError(400, "کد تخفیف معتبر نیست یا غیرفعال شده است.");
      if (subtotal < cp.min_amount) throw new HttpError(400, `حداقل مبلغ سفارش برای این کد ${cp.min_amount.toLocaleString("fa-IR")} تومان است.`);
      if (cp.max_uses !== null && cp.uses >= cp.max_uses) throw new HttpError(400, "ظرفیت استفاده از این کد تخفیف تکمیل شده است.");
      discount = Math.round((subtotal * cp.percent) / 100);
      await tx`update coupons set uses = uses + 1 where code = ${couponCode}`;
    }
    const shipping = method.freeOver !== null && subtotal - discount >= method.freeOver ? 0 : method.cost;
    let code = randomDigits(10);
    for (let i = 0; i < 5; i++) {
      const [taken] = await tx`select 1 from orders where code = ${code}`;
      if (!taken) break;
      code = randomDigits(10);
    }
    const [created] = await tx<OrderRow[]>`
      insert into orders (code, access_hash, user_id, customer, phone, items, subtotal, discount, shipping, total, coupon, shipping_method, payment_method, payment_status, expires_at)
      values (${code}, ${sha256(accessToken)}, ${user?.id ?? null}, ${tx.json({ ...body.customer, phone: body.customer.phone } as never)}, ${body.customer.phone},
        ${tx.json(lines as never)}, ${subtotal}, ${discount}, ${shipping}, ${subtotal - discount + shipping}, ${couponCode}, ${method.id}, ${body.payment},
        ${body.payment === "cod" ? "cod" : "pending"},
        ${body.payment === "online" ? sql`now() + ${`${config.orderTtlMinutes} minutes`}::interval` : null})
      returning *`;
    return created;
  });
  return c.json({ order: mapOrder(order), accessToken });
});

app.get("/api/orders/:code", async (c) => {
  const order = await findOrderWithAccess(c, c.req.param("code"), c.req.header("x-order-token"));
  return c.json({ order: mapOrder(order) });
});

app.post("/api/orders/track", async (c) => {
  const limited = limit(c, "track", 15, 600_000);
  if (limited) return limited;
  const body = await readBody(c, z.object({ code: z.string().trim().max(20), phone }));
  const code = normalizeDigits(body.code).replace(/\D/g, "");
  const [order] = await sql<OrderRow[]>`select * from orders where code = ${code} and phone = ${body.phone}`;
  if (!order) return fail(c, 404, "سفارشی با این کد و شماره موبایل پیدا نشد.");
  return c.json({ order: mapOrder(order, true) });
});

app.post("/api/coupons/validate", async (c) => {
  const limited = limit(c, "coupon-check", 30, 600_000);
  if (limited) return limited;
  const body = await readBody(c, z.object({ code: z.string().trim().max(30), subtotal: z.number().int().min(0).max(10_000_000_000) }));
  const [cp] = await sql<{ percent: number; label: string; min_amount: number; max_uses: number | null; uses: number; active: boolean }[]>`
    select percent, label, min_amount, max_uses, uses, active from coupons where code = ${body.code.toUpperCase()}`;
  if (!cp || !cp.active) return fail(c, 400, "کد تخفیف معتبر نیست یا غیرفعال شده است.");
  if (body.subtotal < cp.min_amount) return fail(c, 400, `حداقل خرید برای این کد ${cp.min_amount.toLocaleString("fa-IR")} تومان است.`);
  if (cp.max_uses !== null && cp.uses >= cp.max_uses) return fail(c, 400, "ظرفیت استفاده از این کد تکمیل شده است.");
  return c.json({ percent: cp.percent, label: cp.label });
});

/* --------------------------------- payments -------------------------------- */
app.post("/api/payments/start", async (c) => {
  const limited = limit(c, "pay", 30, 3600_000);
  if (limited) return limited;
  const body = await readBody(c, z.object({ code: z.string().max(20), token: z.string().max(100).nullable().optional(), gateway: z.enum(["zarinpal", "zibal", "sep", "sadad"]) }));
  const order = await findOrderWithAccess(c, body.code, body.token);
  if (order.payment_status !== "pending" || order.status !== "pending" || order.payment_method !== "online") return fail(c, 409, "این سفارش قابل پرداخت آنلاین نیست.");
  if (order.expires_at && order.expires_at < new Date()) return fail(c, 410, "مهلت پرداخت این سفارش تمام شده است.");
  const gw = await loadGateway(body.gateway);
  if (!gw.enabled) return fail(c, 400, "این درگاه فعال نیست.");
  if (REQUIRED_FIELDS[body.gateway].some((f) => !gw.fields[f]) && !(body.gateway === "zibal" && gw.mode === "sandbox")) return fail(c, 503, "تنظیمات این درگاه کامل نیست.");

  const token = randomToken(32);
  const [payment] = await sql<{ id: string }[]>`insert into payments (order_id, gateway, amount, token_hash) values (${order.id}, ${body.gateway}, ${order.total}, ${sha256(token)}) returning id`;
  try {
    const result = await gateways[body.gateway].start({
      paymentId: Number(payment.id), amountToman: order.total, mobile: order.phone, description: `سفارش ${order.code} - 50500.shop`,
      callbackUrl: `${config.appOrigin}/api/payments/callback/${body.gateway}?t=${encodeURIComponent(token)}`,
      creds: gw.fields as Creds, mode: gw.mode,
    });
    await sql`update payments set authority = ${result.authority} where id = ${payment.id}`;
    return c.json({ redirectUrl: result.redirectUrl });
  } catch (error) {
    await sql`update payments set status = 'failed', raw = ${sql.json({ error: String(error) } as never)} where id = ${payment.id}`;
    if (isGatewayError(error)) return fail(c, 502, error.message);
    throw error;
  }
});

app.post("/api/payments/card", async (c) => {
  const body = await readBody(c, z.object({ code: z.string().max(20), token: z.string().max(100).nullable().optional() }));
  const order = await findOrderWithAccess(c, body.code, body.token);
  const card = await loadGateway("card");
  if (!card.enabled) return fail(c, 400, "پرداخت کارت‌به‌کارت فعال نیست.");
  if (order.payment_status !== "pending" || order.status !== "pending") return fail(c, 409, "روش پرداخت این سفارش قابل تغییر نیست.");
  const [updated] = await sql<OrderRow[]>`update orders set payment_method = 'card', expires_at = now() + interval '24 hours', updated_at = now() where id = ${order.id} returning *`;
  return c.json({ order: mapOrder(updated) });
});

app.all("/api/payments/callback/:gateway", async (c) => {
  const gatewayId = c.req.param("gateway") as GatewayId;
  const token = c.req.query("t") ?? "";
  const fallback = "/#/track?pay=invalid";
  if (!(gatewayId in gateways) || !token) return c.redirect(fallback, 303);

  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(c.req.query())) params[k] = String(v);
  if (c.req.method === "POST") {
    const form = await c.req.parseBody().catch(() => ({}));
    for (const [k, v] of Object.entries(form)) if (typeof v === "string") params[k] = v;
  }

  const [payment] = await sql<{ id: string; order_id: string; status: string; amount: number; authority: string | null; code: string }[]>`
    select p.id, p.order_id, p.status, p.amount, p.authority, o.code from payments p join orders o on o.id = p.order_id
    where p.token_hash = ${sha256(token)} and p.gateway = ${gatewayId}`;
  if (!payment) return c.redirect(fallback, 303);
  const done = (ok: boolean) => c.redirect(`/#/order/${payment.code}?pay=${ok ? "success" : "failed"}`, 303);
  if (payment.status === "paid") return done(true);

  const info = gateways[gatewayId].parseCallback(params);
  // The callback must refer to the exact transaction we created (blocks swapped/forged references).
  const authorityMatches = gatewayId === "sep" ? params.ResNum === String(payment.id) : info.authority !== null && info.authority === payment.authority;
  if (!info.success || !authorityMatches || !payment.authority) {
    await sql`update payments set status = 'failed', raw = ${sql.json(params as never)} where id = ${payment.id} and status = 'initiated'`;
    return done(false);
  }

  const gw = await loadGateway(gatewayId);
  const verified = await gateways[gatewayId].verify({
    paymentId: Number(payment.id), amountToman: payment.amount, authority: payment.authority, reference: info.reference, creds: gw.fields as Creds, mode: gw.mode,
  }).catch((error) => ({ ok: false, refId: null, cardPan: null, message: String(error), raw: null }));

  if (!verified.ok) {
    await sql`update payments set status = 'failed', raw = ${sql.json({ params, verify: verified.raw, message: verified.message } as never)} where id = ${payment.id} and status = 'initiated'`;
    return done(false);
  }

  try {
    await sql.begin(async (tx) => {
      const [locked] = await tx<{ status: string }[]>`select status from payments where id = ${payment.id} for update`;
      if (locked.status === "paid") return; // idempotent: a duplicate callback changes nothing
      await tx`update payments set status = 'paid', ref_id = ${verified.refId}, card_pan = ${verified.cardPan}, raw = ${tx.json(verified.raw as never)}, verified_at = now() where id = ${payment.id}`;
      const [order] = await tx<{ status: string }[]>`select status from orders where id = ${payment.order_id} for update`;
      if (order.status === "cancelled") {
        // Paid after the order expired and stock was released — flag for manual refund/review.
        await tx`update orders set payment_status = 'paid_review', note = coalesce(note, '') || ' پرداخت پس از لغو؛ نیاز به بررسی/استرداد.', updated_at = now() where id = ${payment.order_id}`;
      } else {
        await tx`update orders set payment_status = 'paid', status = case when status = 'pending' then 'confirmed' else status end, expires_at = null, updated_at = now() where id = ${payment.order_id}`;
      }
    });
  } catch (error) {
    if (isUnique(error)) {
      // This bank reference already settled another payment: replay attempt.
      await sql`update payments set status = 'failed', raw = ${sql.json({ replay: verified.refId } as never)} where id = ${payment.id} and status = 'initiated'`;
      return done(false);
    }
    throw error;
  }
  return done(true);
});

/* ------------------------------- admin auth -------------------------------- */
app.post("/api/admin/login", async (c) => {
  const body = await readBody(c, z.object({ email, password: z.string().max(200), totp: z.string().max(10).optional() }));
  const limited = limit(c, "admin-login", 10, 900_000) ?? limit(c, `admin-login:${body.email}`, 8, 900_000);
  if (limited) return limited;
  const [row] = await sql<(AdminRow & { password_hash: string; totp_secret_enc: string | null; totp_last_counter: string; locked_until: Date | null; active: boolean })[]>`
    select id, email, name, role, permissions, totp_enabled, password_hash, totp_secret_enc, totp_last_counter, locked_until, active from admins where lower(email) = ${body.email}`;
  if (!row || !row.active) {
    await burnPasswordCheck(body.password);
    return fail(c, 401, "ایمیل یا رمز عبور نادرست است.");
  }
  if (row.locked_until && row.locked_until > new Date()) return fail(c, 429, "به دلیل تلاش‌های ناموفق، ورود موقتاً قفل شده است.");
  if (!(await verifyPassword(body.password, row.password_hash))) {
    await sql`update admins set failed_logins = failed_logins + 1,
      locked_until = case when failed_logins + 1 >= 6 then now() + interval '30 minutes' else locked_until end where id = ${row.id}`;
    await audit(Number(row.id), "admin.login_failed", {}, c.get("ip"));
    return fail(c, 401, "ایمیل یا رمز عبور نادرست است.");
  }
  if (row.totp_enabled && row.totp_secret_enc) {
    if (!body.totp) return c.json({ needTotp: true });
    const counter = verifyTotp(decrypt(row.totp_secret_enc), normalizeDigits(body.totp), Number(row.totp_last_counter));
    if (counter === null) {
      await sql`update admins set failed_logins = failed_logins + 1 where id = ${row.id}`;
      return fail(c, 401, "کد تأیید دومرحله‌ای نادرست است.", { needTotp: true });
    }
    await sql`update admins set totp_last_counter = ${counter} where id = ${row.id}`;
  }
  await sql`update admins set failed_logins = 0, locked_until = null where id = ${row.id}`;
  await destroySession(c, "admin");
  await createSession(c, "admin", row.id);
  await audit(Number(row.id), "admin.login", {}, c.get("ip"));
  return c.json({ admin: publicAdmin(row) });
});

app.post("/api/admin/logout", async (c) => {
  await destroySession(c, "admin");
  return c.json({ ok: true });
});

app.get("/api/admin/me", (c) => c.json({ admin: publicAdmin(requireAdmin(c)) }));

app.post("/api/admin/password", async (c) => {
  const admin = requireAdmin(c);
  const body = await readBody(c, z.object({ current: z.string().max(200), next: z.string().min(12, "رمز مدیر باید حداقل ۱۲ کاراکتر باشد.").max(200) }));
  const [row] = await sql<{ password_hash: string }[]>`select password_hash from admins where id = ${admin.id}`;
  if (!(await verifyPassword(body.current, row.password_hash))) return fail(c, 400, "رمز فعلی نادرست است.");
  await sql`update admins set password_hash = ${await hashPassword(body.next)} where id = ${admin.id}`;
  await sql`delete from sessions where kind = 'admin' and subject_id = ${admin.id}`;
  await createSession(c, "admin", admin.id);
  await audit(Number(admin.id), "admin.password_changed", {}, c.get("ip"));
  return c.json({ ok: true });
});

app.post("/api/admin/totp/setup", async (c) => {
  const admin = requireAdmin(c);
  const secret = generateTotpSecret();
  await sql`update admins set totp_pending_enc = ${encrypt(secret)} where id = ${admin.id}`;
  return c.json({ secret, uri: totpUri(secret, admin.email) });
});

app.post("/api/admin/totp/enable", async (c) => {
  const admin = requireAdmin(c);
  const body = await readBody(c, z.object({ code: z.string().max(10) }));
  const [row] = await sql<{ totp_pending_enc: string | null }[]>`select totp_pending_enc from admins where id = ${admin.id}`;
  if (!row?.totp_pending_enc) return fail(c, 400, "ابتدا راه‌اندازی را شروع کنید.");
  const counter = verifyTotp(decrypt(row.totp_pending_enc), normalizeDigits(body.code));
  if (counter === null) return fail(c, 400, "کد وارد شده نادرست است؛ ساعت گوشی را بررسی کنید.");
  await sql`update admins set totp_secret_enc = totp_pending_enc, totp_pending_enc = null, totp_enabled = true, totp_last_counter = ${counter} where id = ${admin.id}`;
  await audit(Number(admin.id), "admin.totp_enabled", {}, c.get("ip"));
  return c.json({ ok: true });
});

app.post("/api/admin/totp/disable", async (c) => {
  const admin = requireAdmin(c);
  const body = await readBody(c, z.object({ password: z.string().max(200), code: z.string().max(10) }));
  const [row] = await sql<{ password_hash: string; totp_secret_enc: string | null; totp_last_counter: string }[]>`select password_hash, totp_secret_enc, totp_last_counter from admins where id = ${admin.id}`;
  const okPassword = await verifyPassword(body.password, row.password_hash);
  const okCode = row.totp_secret_enc ? verifyTotp(decrypt(row.totp_secret_enc), normalizeDigits(body.code), Number(row.totp_last_counter)) !== null : false;
  if (!okPassword || !okCode) return fail(c, 400, "رمز یا کد تأیید نادرست است.");
  await sql`update admins set totp_enabled = false, totp_secret_enc = null, totp_last_counter = -1 where id = ${admin.id}`;
  await audit(Number(admin.id), "admin.totp_disabled", {}, c.get("ip"));
  return c.json({ ok: true });
});

/* ------------------------------- admin data -------------------------------- */
app.get("/api/admin/bootstrap", async (c) => {
  const admin = requireAdmin(c);
  const [control, siteContent, orders, gws, custom] = await Promise.all([
    getSetting("control"), getSetting("site_content"),
    sql<OrderRow[]>`select * from orders order by created_at desc limit 500`, adminGateways(), customProducts(true),
  ]);
  return c.json({ admin: publicAdmin(admin), control, siteContent, orders: orders.map(mapAdminOrder), gateways: gws, customProducts: custom });
});

app.put("/api/admin/settings/:key", async (c) => {
  const key = c.req.param("key");
  const module = key === "site_content" ? "content" : key === "control" ? "pages" : null;
  if (!module) return fail(c, 404, "تنظیم نامعتبر است.");
  const admin = requireAdmin(c, module, true);
  const body = await readBody(c, z.object({ value: z.record(z.unknown()) }));
  if (key === "control") {
    // Never persist AI keys or gateway secrets through this channel.
    delete (body.value as Record<string, unknown>).secrets;
  }
  await sql`insert into settings (key, value, updated_by) values (${key}, ${sql.json(body.value as never)}, ${admin.id})
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
  await audit(Number(admin.id), `settings.${key}`, {}, c.get("ip"));
  return c.json({ ok: true });
});

app.patch("/api/admin/products/:slug", async (c) => {
  const admin = requireAdmin(c, "products", true);
  const slug = c.req.param("slug");
  const body = await readBody(c, z.object({
    title: z.string().trim().min(3).max(200).optional(),
    price: z.number().int().min(0).max(10_000_000_000).optional(),
    comparePrice: z.number().int().min(0).max(10_000_000_000).nullable().optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    active: z.boolean().optional(),
    image: z.string().regex(IMAGE_REF, "آدرس تصویر مجاز نیست.").nullable().optional(),
    cost: z.number().int().min(0).max(10_000_000_000).optional(),
    body: z.string().trim().max(5000).optional(),
    brandName: z.string().trim().max(60).nullable().optional(),
  }));
  const [row] = await sql`update products set
      body = coalesce(${body.body ?? null}, body),
      brand_name = case when ${body.brandName !== undefined} then ${body.brandName ?? null} else brand_name end,
      title = coalesce(${body.title ?? null}, title),
      price = coalesce(${body.price ?? null}, price),
      compare_price = case when ${body.comparePrice !== undefined} then ${body.comparePrice ?? null}::int else compare_price end,
      stock = coalesce(${body.stock ?? null}, stock),
      active = coalesce(${body.active ?? null}, active),
      image = case when ${body.image !== undefined} then ${body.image ?? null} else image end,
      cost = coalesce(${body.cost ?? null}, cost),
      updated_at = now()
    where slug = ${slug} returning slug, price, stock, active`;
  if (!row) return fail(c, 404, "محصول پیدا نشد.");
  await audit(Number(admin.id), "product.update", { slug, ...body }, c.get("ip"));
  return c.json({ product: row });
});

const productSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,80}$/, "شناسه فقط حروف انگلیسی کوچک، عدد و خط تیره (۳ تا ۸۰ کاراکتر)."),
  title: z.string().trim().min(3, "عنوان را کامل وارد کنید.").max(200),
  category: z.enum(["embroidered-leather", "accessories"]),
  price: z.number().int().min(1000, "قیمت معتبر نیست.").max(10_000_000_000),
  comparePrice: z.number().int().min(0).max(10_000_000_000).nullable().default(null),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  image: z.string().regex(IMAGE_REF, "آدرس تصویر مجاز نیست.").nullable().default(null),
  body: z.string().trim().max(5000).default(""),
  brandName: z.string().trim().max(60).nullable().default(null),
  active: z.boolean().default(true),
  cost: z.number().int().min(0).max(10_000_000_000).default(0),
});

app.post("/api/admin/products", async (c) => {
  const admin = requireAdmin(c, "products", true);
  const body = await readBody(c, productSchema);
  if (body.comparePrice !== null && body.comparePrice <= body.price) return fail(c, 400, "قیمت قبل از تخفیف باید بیشتر از قیمت فروش باشد.");
  try {
    await sql`insert into products (slug, title, category, price, compare_price, stock, image, body, brand_name, active, cost, custom)
      values (${body.slug}, ${body.title}, ${body.category}, ${body.price}, ${body.comparePrice}, ${body.stock}, ${body.image}, ${body.body}, ${body.brandName}, ${body.active}, ${body.cost}, true)`;
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "محصولی با این شناسه وجود دارد.");
    throw error;
  }
  await audit(Number(admin.id), "product.create", { slug: body.slug }, c.get("ip"));
  return c.json({ products: await customProducts(true) });
});

app.delete("/api/admin/products/:slug", async (c) => {
  const admin = requireAdmin(c, "products", true);
  const slug = c.req.param("slug");
  const [row] = await sql<{ custom: boolean }[]>`select custom from products where slug = ${slug}`;
  if (!row) return fail(c, 404, "محصول پیدا نشد.");
  if (!row.custom) return fail(c, 409, "محصولات پایه کاتالوگ حذف نمی‌شوند؛ آن را غیرفعال کنید.");
  await sql`delete from products where slug = ${slug}`;
  await audit(Number(admin.id), "product.delete", { slug }, c.get("ip"));
  return c.json({ ok: true });
});

app.post("/api/admin/products/bulk", async (c) => {
  const admin = requireAdmin(c, "products", true);
  const body = await readBody(c, z.object({
    slugs: z.array(z.string().max(120)).min(1).max(500),
    action: z.enum(["price_percent", "price_set", "stock_set", "stock_add", "activate", "deactivate", "compare_clear"]),
    value: z.number().optional(),
  }));
  const value = body.value ?? 0;
  if (body.action === "price_percent" && (value < -90 || value > 500)) return fail(c, 400, "درصد تغییر قیمت باید بین ‎-۹۰ تا ۵۰۰ باشد.");
  if ((body.action === "price_set" || body.action === "stock_set") && value < 0) return fail(c, 400, "مقدار نمی‌تواند منفی باشد.");
  const result = await sql.begin(async (tx) => {
    let changed = 0;
    for (const slug of body.slugs) {
      const [row] = await tx<{ price: number; stock: number }[]>`select price, stock from products where slug = ${slug} for update`;
      if (!row) continue;
      if (body.action === "price_percent") await tx`update products set price = greatest(1000, round(price * (1 + ${value}::numeric / 100) / 10000) * 10000)::int, updated_at = now() where slug = ${slug}`;
      else if (body.action === "price_set") await tx`update products set price = ${Math.round(value)}, updated_at = now() where slug = ${slug}`;
      else if (body.action === "stock_set") await tx`update products set stock = ${Math.round(value)}, updated_at = now() where slug = ${slug}`;
      else if (body.action === "stock_add") await tx`update products set stock = greatest(0, stock + ${Math.round(value)}), updated_at = now() where slug = ${slug}`;
      else if (body.action === "activate") await tx`update products set active = true, updated_at = now() where slug = ${slug}`;
      else if (body.action === "deactivate") await tx`update products set active = false, updated_at = now() where slug = ${slug}`;
      else if (body.action === "compare_clear") await tx`update products set compare_price = null, updated_at = now() where slug = ${slug}`;
      changed++;
    }
    return changed;
  });
  await audit(Number(admin.id), "product.bulk", { action: body.action, value, count: result }, c.get("ip"));
  const [overrides, custom] = await Promise.all([productOverrides(), customProducts(true)]);
  return c.json({ changed: result, productOverrides: overrides, customProducts: custom });
});

app.get("/api/admin/orders", async (c) => {
  requireAdmin(c, "orders");
  const rows = await sql<OrderRow[]>`select * from orders order by created_at desc limit 500`;
  return c.json({ orders: rows.map(mapAdminOrder) });
});

app.get("/api/admin/orders/:code/events", async (c) => {
  requireAdmin(c, "orders");
  const rows = await sql<{ id: string; kind: string; detail: string; created_at: Date; email: string | null }[]>`
    select e.id, e.kind, e.detail, e.created_at, a.email from order_events e join orders o on o.id = e.order_id left join admins a on a.id = e.admin_id
    where o.code = ${c.req.param("code")} order by e.created_at desc limit 100`;
  return c.json({ events: rows.map((r) => ({ id: r.id, kind: r.kind, detail: r.detail, by: r.email, at: r.created_at.toISOString() })) });
});

app.post("/api/admin/orders/bulk", async (c) => {
  const admin = requireAdmin(c, "orders", true);
  const body = await readBody(c, z.object({ codes: z.array(z.string().max(20)).min(1).max(200), status: z.enum(ORDER_STATUSES) }));
  let changed = 0;
  await sql.begin(async (tx) => {
    for (const code of body.codes) {
      const [order] = await tx<OrderRow[]>`select * from orders where code = ${code} for update`;
      if (!order || order.status === body.status || order.status === "cancelled") continue;
      if (body.status === "cancelled") for (const item of order.items) await tx`update products set stock = stock + ${item.qty} where slug = ${item.slug}`;
      await tx`update orders set status = ${body.status}, updated_at = now() where id = ${order.id}`;
      await tx`insert into order_events (order_id, admin_id, kind, detail) values (${order.id}, ${admin.id}, 'status', ${`تغییر گروهی وضعیت به ${body.status}`})`;
      changed++;
    }
  });
  await audit(Number(admin.id), "order.bulk_status", { count: changed, status: body.status }, c.get("ip"));
  return c.json({ changed });
});

app.patch("/api/admin/orders/:code", async (c) => {
  const admin = requireAdmin(c, "orders", true);
  const code = c.req.param("code");
  const body = await readBody(c, z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    payment: z.enum(["paid", "pending", "cod", "refunded"]).optional(),
    tracking: z.string().trim().max(60).optional(),
    note: z.string().trim().max(1000).optional(),
  }));
  const updated = await sql.begin(async (tx) => {
    const [order] = await tx<OrderRow[]>`select * from orders where code = ${code} for update`;
    if (!order) throw new HttpError(404, "سفارش پیدا نشد.");
    if (body.status && order.status === "cancelled" && body.status !== "cancelled") throw new HttpError(409, "سفارش لغوشده قابل بازگشت نیست؛ سفارش جدید ثبت کنید.");
    if (body.status === "cancelled" && order.status !== "cancelled") {
      for (const item of order.items) await tx`update products set stock = stock + ${item.qty} where slug = ${item.slug}`;
    }
    const [row] = await tx<OrderRow[]>`update orders set
        status = coalesce(${body.status ?? null}, status),
        payment_status = coalesce(${body.payment ?? null}, payment_status),
        expires_at = case when ${body.payment === "paid" || body.status === "cancelled"} then null else expires_at end,
        tracking = coalesce(${body.tracking ?? null}, tracking),
        note = coalesce(${body.note ?? null}, note),
        updated_at = now()
      where id = ${order.id} returning *`;
    const detail = [
      body.status && body.status !== order.status ? `وضعیت: ${order.status} → ${body.status}` : null,
      body.payment && body.payment !== order.payment_status ? `پرداخت: ${order.payment_status} → ${body.payment}` : null,
      body.tracking && body.tracking !== order.tracking ? `کد رهگیری: ${body.tracking}` : null,
      body.note !== undefined && body.note !== order.note ? "یادداشت داخلی ویرایش شد" : null,
    ].filter(Boolean).join(" · ");
    if (detail) await tx`insert into order_events (order_id, admin_id, kind, detail) values (${order.id}, ${admin.id}, 'update', ${detail})`;
    return row;
  });
  await audit(Number(admin.id), "order.update", { code, ...body }, c.get("ip"));
  return c.json({ order: mapAdminOrder(updated) });
});

app.put("/api/admin/gateways/:id", async (c) => {
  const admin = requireAdmin(c, "payments", true);
  const id = c.req.param("id");
  if (!GATEWAY_IDS.includes(id as never)) return fail(c, 404, "درگاه نامعتبر است.");
  const body = await readBody(c, z.object({
    enabled: z.boolean(),
    mode: z.enum(["sandbox", "production"]),
    currency: z.enum(["IRT", "IRR"]),
    position: z.number().int().min(1).max(20),
    fields: z.record(z.string().max(500)).default({}),
    secrets: z.record(z.string().max(500)).default({}),
  }));
  const current = await loadGateway(id);
  const fields: Record<string, string> = { ...current.fields };
  for (const [k, v] of Object.entries(body.fields)) if (!k.startsWith("__")) fields[k] = v.trim();
  for (const [k, v] of Object.entries(body.secrets)) if ((SECRET_FIELDS[id] ?? []).includes(k) && v.trim()) fields[k] = v.trim();
  if (id === "card" && fields.cardNumber) fields.cardNumber = normalizeDigits(fields.cardNumber).replace(/\D/g, "");
  if (body.enabled) {
    const required = id === "card" ? ["owner", "cardNumber"] : REQUIRED_FIELDS[id as GatewayId];
    const missing = required.filter((f) => !fields[f]);
    if (missing.length && !(id === "zibal" && body.mode === "sandbox")) return fail(c, 400, `فیلدهای الزامی کامل نیست: ${missing.join("، ")}`);
    if (id === "card" && fields.cardNumber.length !== 16) return fail(c, 400, "شماره کارت باید ۱۶ رقم باشد.");
    if (id === "sadad") {
      const keyLen = Buffer.from(fields.secretKey ?? "", "base64").length;
      if (keyLen !== 24 && keyLen !== 16) return fail(c, 400, "کلید ترمینال سداد باید Base64 معتبر باشد.");
    }
  }
  const meta = { enabled: body.enabled, mode: body.mode, currency: body.currency, position: body.position };
  await sql`insert into vault (key, value_enc, meta) values (${`gateway:${id}`}, ${encrypt(JSON.stringify(fields))}, ${sql.json(meta as never)})
    on conflict (key) do update set value_enc = excluded.value_enc, meta = excluded.meta, updated_at = now()`;
  await audit(Number(admin.id), "gateway.update", { id, ...meta }, c.get("ip"));
  return c.json({ gateways: await adminGateways() });
});

/* ---------------------------------- media ---------------------------------- */
type MediaRow = { id: string; name: string; mime: string; size: number; width: number; height: number; alt: string; folder: string; tags: string[]; created_at: Date; updated_at: Date };
const mapMedia = (m: MediaRow) => ({
  id: m.id, name: m.name, mime: m.mime, size: m.size, width: m.width, height: m.height, alt: m.alt, folder: m.folder, tags: m.tags,
  dataUrl: `/media/${m.id}`, createdAt: m.created_at.toISOString(), updatedAt: m.updated_at.toISOString(),
});

app.get("/api/admin/media", async (c) => {
  requireAdmin(c, "media");
  const rows = await sql<MediaRow[]>`select id, name, mime, size, width, height, alt, folder, tags, created_at, updated_at from media order by created_at desc limit 1000`;
  return c.json({ media: rows.map(mapMedia) });
});

app.post("/api/admin/media", async (c) => {
  const admin = requireAdmin(c, "media", true);
  const limited = limit(c, `upload:${admin.id}`, 60, 3600_000);
  if (limited) return limited;
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return fail(c, 400, "فایلی ارسال نشده است.");
  if (file.size > 5 * 1024 * 1024) return fail(c, 413, "حجم تصویر باید کمتر از ۵ مگابایت باشد.");
  const input = Buffer.from(await file.arrayBuffer());
  let meta: sharp.Metadata;
  try { meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata(); } catch { return fail(c, 400, "فایل تصویر معتبر نیست."); }
  // Content-based check (not the filename/MIME the browser claims). SVG is refused: it can carry scripts.
  if (!meta.format || !["jpeg", "png", "webp", "gif", "avif", "heif"].includes(meta.format)) return fail(c, 400, "فقط JPG، PNG، WebP، GIF یا AVIF مجاز است.");
  // Re-encoding strips EXIF/GPS metadata and any embedded payload (polyglot files).
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 }).rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const id = randomToken(12);
  const name = String(form.name ?? file.name).replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120).replace(/\.[^.]+$/, "") + ".webp";
  const folder = String(form.folder ?? "عمومی").trim().slice(0, 60) || "عمومی";
  const [row] = await sql<MediaRow[]>`insert into media (id, name, mime, size, width, height, alt, folder, data)
    values (${id}, ${name}, 'image/webp', ${data.length}, ${info.width}, ${info.height}, ${name.replace(/\.webp$/, "")}, ${folder}, ${data})
    returning id, name, mime, size, width, height, alt, folder, tags, created_at, updated_at`;
  await audit(Number(admin.id), "media.upload", { id, name }, c.get("ip"));
  return c.json({ asset: mapMedia(row) });
});

app.patch("/api/admin/media/:id", async (c) => {
  requireAdmin(c, "media", true);
  const body = await readBody(c, z.object({ name: z.string().trim().min(1).max(120).optional(), alt: z.string().max(300).optional(), folder: z.string().trim().max(60).optional(), tags: z.array(z.string().max(40)).max(20).optional() }));
  const [row] = await sql<MediaRow[]>`update media set name = coalesce(${body.name ?? null}, name), alt = coalesce(${body.alt ?? null}, alt),
      folder = coalesce(${body.folder ?? null}, folder), tags = coalesce(${body.tags ? sql.json(body.tags) : null}, tags), updated_at = now()
    where id = ${c.req.param("id")} returning id, name, mime, size, width, height, alt, folder, tags, created_at, updated_at`;
  if (!row) return fail(c, 404, "تصویر پیدا نشد.");
  return c.json({ asset: mapMedia(row) });
});

app.delete("/api/admin/media/:id", async (c) => {
  const admin = requireAdmin(c, "media", true);
  const id = c.req.param("id");
  const [inUse] = await sql`select slug from products where image = ${`/media/${id}`} limit 1`;
  if (inUse) return fail(c, 409, `این تصویر روی محصول «${inUse.slug}» استفاده شده است.`);
  const [settingUse] = await sql`select key from settings where key in ('site_content', 'control') and position(${`/media/${id}`} in value::text) > 0 limit 1`;
  if (settingUse) return fail(c, 409, "این تصویر در محتوای یکی از صفحات استفاده شده است؛ ابتدا آن را از صفحه تغییر دهید.");
  await sql`delete from media where id = ${id}`;
  await audit(Number(admin.id), "media.delete", { id }, c.get("ip"));
  return c.json({ ok: true });
});

app.get("/media/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return c.notFound();
  const [row] = await sql<{ data: Buffer; mime: string }[]>`select data, mime from media where id = ${id}`;
  if (!row) return c.notFound();
  return new Response(new Uint8Array(row.data), {
    headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" },
  });
});

/* ------------------------------ admin coupons ------------------------------ */
type CouponRow = { code: string; label: string; percent: number; min_amount: number; max_uses: number | null; uses: number; active: boolean; created_at: Date };
const mapCoupon = (r: CouponRow) => ({ code: r.code, label: r.label, percent: r.percent, minAmount: r.min_amount, maxUses: r.max_uses, uses: r.uses, active: r.active, createdAt: r.created_at.toISOString() });
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/, "کد باید ۳ تا ۲۴ حرف انگلیسی بزرگ، عدد یا خط تیره باشد."),
  label: z.string().trim().max(60).default(""),
  percent: z.number().int().min(1).max(90),
  minAmount: z.number().int().min(0).max(10_000_000_000).default(0),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().default(null),
  active: z.boolean().default(true),
  uses: z.number().int().min(0).max(1_000_000).optional(),
});

app.get("/api/admin/coupons", async (c) => {
  requireAdmin(c, "coupons");
  const rows = await sql<CouponRow[]>`select * from coupons order by created_at desc`;
  return c.json({ coupons: rows.map(mapCoupon) });
});

app.post("/api/admin/coupons", async (c) => {
  const admin = requireAdmin(c, "coupons", true);
  const body = await readBody(c, couponSchema);
  try {
    const [row] = await sql<CouponRow[]>`insert into coupons (code, label, percent, min_amount, max_uses, active, uses)
      values (${body.code}, ${body.label}, ${body.percent}, ${body.minAmount}, ${body.maxUses}, ${body.active}, ${body.uses ?? 0}) returning *`;
    await audit(Number(admin.id), "coupon.create", { code: body.code }, c.get("ip"));
    return c.json({ coupon: mapCoupon(row) });
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "این کد تخفیف قبلاً ساخته شده است.");
    throw error;
  }
});

app.patch("/api/admin/coupons/:code", async (c) => {
  const admin = requireAdmin(c, "coupons", true);
  const code = c.req.param("code").toUpperCase();
  const body = await readBody(c, couponSchema.partial().omit({ code: true, uses: true }));
  const [row] = await sql<CouponRow[]>`update coupons set
      label = coalesce(${body.label ?? null}, label),
      percent = coalesce(${body.percent ?? null}, percent),
      min_amount = coalesce(${body.minAmount ?? null}, min_amount),
      max_uses = case when ${body.maxUses !== undefined} then ${body.maxUses ?? null}::int else max_uses end,
      active = coalesce(${body.active ?? null}, active)
    where code = ${code} returning *`;
  if (!row) return fail(c, 404, "کد تخفیف پیدا نشد.");
  await audit(Number(admin.id), "coupon.update", { code, ...body }, c.get("ip"));
  return c.json({ coupon: mapCoupon(row) });
});

app.delete("/api/admin/coupons/:code", async (c) => {
  const admin = requireAdmin(c, "coupons", true);
  const code = c.req.param("code").toUpperCase();
  const [row] = await sql<CouponRow[]>`delete from coupons where code = ${code} returning *`;
  if (!row) return fail(c, 404, "کد تخفیف پیدا نشد.");
  await audit(Number(admin.id), "coupon.delete", { code }, c.get("ip"));
  return c.json({ deleted: mapCoupon(row) });
});

/* ------------------------------ admin reviews ------------------------------ */
type ReviewRow = { id: string; slug: string; name: string; rating: number; comment: string; status: string; created_at: Date };
const mapReview = (r: ReviewRow) => ({ id: r.id, slug: r.slug, name: r.name, rating: r.rating, comment: r.comment, status: r.status, date: r.created_at.toISOString() });

app.get("/api/admin/reviews", async (c) => {
  requireAdmin(c, "reviews");
  const rows = await sql<ReviewRow[]>`select * from reviews order by created_at desc limit 500`;
  return c.json({ reviews: rows.map(mapReview) });
});

app.patch("/api/admin/reviews/:id", async (c) => {
  const admin = requireAdmin(c, "reviews", true);
  const body = await readBody(c, z.object({ status: z.enum(["pending", "approved", "rejected"]) }));
  const [row] = await sql<ReviewRow[]>`update reviews set status = ${body.status} where id = ${c.req.param("id")} returning *`;
  if (!row) return fail(c, 404, "نظر پیدا نشد.");
  await audit(Number(admin.id), "review.moderate", { id: row.id, status: body.status }, c.get("ip"));
  return c.json({ review: mapReview(row) });
});

app.delete("/api/admin/reviews/:id", async (c) => {
  const admin = requireAdmin(c, "reviews", true);
  await sql`delete from reviews where id = ${c.req.param("id")}`;
  await audit(Number(admin.id), "review.delete", { id: c.req.param("id") }, c.get("ip"));
  return c.json({ ok: true });
});

/* ------------------------------- admin staff ------------------------------- */
const permsSchema = z.record(z.enum(MODULES), z.object({ read: z.boolean(), write: z.boolean() }))
  .transform((perms) => Object.fromEntries(Object.entries(perms).map(([k, v]) => [k, { read: v.read || v.write, write: v.write }])));

function requireOwner(c: Ctx) {
  const admin = requireAdmin(c);
  if (admin.role !== "owner") throw new HttpError(403, "این عملیات فقط برای مدیر اصلی است.");
  return admin;
}

app.get("/api/admin/staff", async (c) => {
  requireOwner(c);
  const rows = await sql<{ id: string; email: string; name: string; active: boolean; permissions: Perms; totp_enabled: boolean; created_at: Date }[]>`
    select id, email, name, active, permissions, totp_enabled, created_at from admins where role = 'staff' order by created_at`;
  return c.json({ staff: rows.map((r) => ({ id: r.id, email: r.email, name: r.name, active: r.active, permissions: r.permissions, totpEnabled: r.totp_enabled, createdAt: r.created_at.toISOString() })) });
});

app.post("/api/admin/staff", async (c) => {
  const owner = requireOwner(c);
  const body = await readBody(c, z.object({
    name: z.string().trim().min(3).max(80), email,
    password: z.string().min(12, "رمز کارمند باید حداقل ۱۲ کاراکتر باشد.").max(200),
    permissions: permsSchema.default({}),
  }));
  try {
    const [row] = await sql<{ id: string }[]>`insert into admins (email, name, password_hash, role, permissions)
      values (${body.email}, ${body.name}, ${await hashPassword(body.password)}, 'staff', ${sql.json(body.permissions as never)}) returning id`;
    await audit(Number(owner.id), "staff.create", { id: row.id, email: body.email }, c.get("ip"));
    return c.json({ id: row.id });
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "این ایمیل قبلاً ثبت شده است.");
    throw error;
  }
});

app.patch("/api/admin/staff/:id", async (c) => {
  const owner = requireOwner(c);
  const body = await readBody(c, z.object({
    name: z.string().trim().min(3).max(80).optional(),
    active: z.boolean().optional(),
    permissions: permsSchema.optional(),
    password: z.string().min(12, "رمز جدید باید حداقل ۱۲ کاراکتر باشد.").max(200).optional(),
  }));
  const [target] = await sql<{ id: string; role: string }[]>`select id, role from admins where id = ${c.req.param("id")}`;
  if (!target || target.role !== "staff") return fail(c, 404, "کارمند پیدا نشد.");
  await sql`update admins set
      name = coalesce(${body.name ?? null}, name),
      active = coalesce(${body.active ?? null}, active),
      permissions = coalesce(${body.permissions ? sql.json(body.permissions) : null}, permissions),
      password_hash = coalesce(${body.password ? await hashPassword(body.password) : null}, password_hash),
      failed_logins = case when ${body.password !== undefined || body.active === false} then 0 else failed_logins end,
      locked_until = case when ${body.password !== undefined} then null else locked_until end
    where id = ${target.id}`;
  // Disabling or re-keying a staff account revokes every existing session immediately.
  if (body.password !== undefined || body.active === false) await sql`delete from sessions where kind = 'admin' and subject_id = ${target.id}`;
  await audit(Number(owner.id), "staff.update", { id: target.id, active: body.active, passwordReset: body.password !== undefined }, c.get("ip"));
  return c.json({ ok: true });
});

app.delete("/api/admin/staff/:id", async (c) => {
  const owner = requireOwner(c);
  const [target] = await sql<{ id: string; role: string }[]>`select id, role from admins where id = ${c.req.param("id")}`;
  if (!target || target.role !== "staff") return fail(c, 404, "کارمند پیدا نشد.");
  await sql`delete from sessions where kind = 'admin' and subject_id = ${target.id}`;
  await sql`delete from admins where id = ${target.id}`;
  await audit(Number(owner.id), "staff.delete", { id: target.id }, c.get("ip"));
  return c.json({ ok: true });
});

/* --------------------- owner-assisted customer password reset --------------- */
app.post("/api/admin/customers/reset-password", async (c) => {
  const owner = requireOwner(c);
  const limited = limit(c, `cust-reset:${owner.id}`, 10, 3600_000);
  if (limited) return limited;
  const body = await readBody(c, z.object({ phone }));
  const [user] = await sql<{ id: string; name: string }[]>`select id, name from users where phone = ${body.phone}`;
  if (!user) return fail(c, 404, "حساب کاربری با این شماره پیدا نشد.");
  // One-time password the owner reads to the verified caller; every old session is revoked.
  const tempPassword = `S${randomDigits(8)}x`;
  await sql`update users set password_hash = ${await hashPassword(tempPassword)}, failed_logins = 0, locked_until = null where id = ${user.id}`;
  await sql`delete from sessions where kind = 'user' and subject_id = ${user.id}`;
  await audit(Number(owner.id), "customer.password_reset", { userId: user.id }, c.get("ip"));
  return c.json({ name: user.name, tempPassword });
});

/* ------------------------------------ AI ------------------------------------ */
app.put("/api/admin/ai/keys", async (c) => {
  const admin = requireAdmin(c, "agents", true);
  const body = await readBody(c, z.object({ provider: z.enum(["openai", "anthropic"]), apiKey: z.string().trim().min(20).max(300) }));
  await sql`insert into vault (key, value_enc) values (${`ai:${body.provider}`}, ${encrypt(body.apiKey)})
    on conflict (key) do update set value_enc = excluded.value_enc, updated_at = now()`;
  await audit(Number(admin.id), "ai.key_saved", { provider: body.provider }, c.get("ip"));
  return c.json({ ok: true });
});

app.post("/api/admin/ai/run", async (c) => {
  const admin = requireAdmin(c, "agents");
  const limited = limit(c, `ai:${admin.id}`, 30, 60_000);
  if (limited) return limited;
  const body = await readBody(c, z.object({
    provider: z.enum(["openai", "anthropic"]),
    model: z.string().regex(/^[A-Za-z0-9._:-]{1,80}$/, "نام مدل نامعتبر است."),
    system: z.string().max(8000),
    input: z.string().min(1).max(40_000),
    temperature: z.number().min(0).max(1),
    maxTokens: z.number().int().min(16).max(4000),
  }));
  const [stored] = await sql<{ value_enc: string }[]>`select value_enc from vault where key = ${`ai:${body.provider}`}`;
  const apiKey = stored ? decrypt(stored.value_enc) : body.provider === "openai" ? config.openaiKey : config.anthropicKey;
  if (!apiKey) return fail(c, 400, "کلید API این سرویس روی سرور تنظیم نشده است.");
  const started = Date.now();
  // Fixed official endpoints only: the admin cannot point the server at arbitrary URLs (no SSRF).
  const response = body.provider === "openai"
    ? await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", signal: AbortSignal.timeout(90_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: body.model, temperature: body.temperature, max_tokens: body.maxTokens, messages: [{ role: "system", content: body.system }, { role: "user", content: body.input }] }),
      })
    : await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: AbortSignal.timeout(90_000),
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: body.model, system: body.system, temperature: body.temperature, max_tokens: body.maxTokens, messages: [{ role: "user", content: body.input }] }),
      });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) return fail(c, 502, String(data?.error?.message ?? `خطای سرویس هوش مصنوعی (HTTP ${response.status})`));
  const text = body.provider === "openai"
    ? String(data?.choices?.[0]?.message?.content ?? "")
    : (Array.isArray(data?.content) ? data.content : []).filter((b: { type?: string }) => b.type === "text").map((b: { text?: string }) => b.text ?? "").join("\n");
  const tokens = body.provider === "openai" ? data?.usage?.total_tokens ?? null : (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0) || null;
  await audit(Number(admin.id), "ai.run", { provider: body.provider, model: body.model, tokens }, c.get("ip"));
  return c.json({ text, tokens, durationMs: Date.now() - started });
});

app.get("/api/admin/audit", async (c) => {
  const admin = requireAdmin(c);
  if (admin.role !== "owner") return fail(c, 403, "فقط مدیر اصلی به گزارش امنیتی دسترسی دارد.");
  const rows = await sql`select l.id, l.action, l.meta, l.ip, l.created_at, a.email from audit_log l left join admins a on a.id = l.admin_id order by l.created_at desc limit 300`;
  return c.json({ entries: rows });
});

app.all("/api/*", (c) => fail(c, 404, "مسیر API پیدا نشد."));

/* --------------------------------- storefront -------------------------------- */
app.get("*", (c) => serveStatic(c.req.path, c.req.header("accept-encoding") ?? "", c.req.header("if-none-match")) ?? c.text("Not found", 404));
