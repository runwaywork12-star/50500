import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";

export const ADMIN_COOKIE = "store50500_admin";
const SESSION_SECONDS = 60 * 60 * 8;
const STAFF_PERMISSION_KEYS = [
  "dashboard:read",
  "catalog:read", "catalog:write",
  "orders:read", "orders:write",
  "returns:read", "returns:write",
  "inventory:read", "inventory:write",
  "customers:read", "customers:write",
  "finance:read", "finance:write",
  "payments:read", "payments:write",
  "content:read", "content:write",
  "support:read", "support:write",
  "analytics:read",
  "affiliates:read", "affiliates:write",
  "integrations:read", "integrations:write",
] as const;
export type StaffPermission = typeof STAFF_PERMISSION_KEYS[number];
export type AdminContext = { kind: "owner"; name: "مدیر اصلی"; permissions: ["*"] } | { kind: "staff"; id: number; name: string; email: string; role: string; permissions: string[] };

export function assertAdminEnvironment(): void {
  if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 16 || !process.env.ADMIN_SECRET || process.env.ADMIN_SECRET.length < 32)) {
    throw new Error("Production requires ADMIN_PASSWORD (16+ chars) and ADMIN_SECRET (32+ chars)");
  }
}
export function getAdminPassword(): string {
  assertAdminEnvironment();
  const password = process.env.ADMIN_PASSWORD;
  if (password) return password;
  if (process.env.NODE_ENV === "production") throw new Error("ADMIN_PASSWORD is required in production");
  return "admin50500";
}
function getSecret(): string {
  assertAdminEnvironment();
  const secret = process.env.ADMIN_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("ADMIN_SECRET is required in production");
  return "development-only-" + (process.env.ADMIN_PASSWORD || "admin50500") + "-do-not-deploy";
}
function sign(payload: string): string { return createHmac("sha256", getSecret()).update(payload).digest("base64url"); }
export function passwordsMatch(candidate: string, expected: string): boolean {
  const a = createHmac("sha256", "password-compare").update(candidate).digest();
  const b = createHmac("sha256", "password-compare").update(expected).digest();
  return timingSafeEqual(a, b);
}
export async function createAdminSession(): Promise<string> {
  await ensureDb();
  const security = await pool.query<{ owner_session_version: number }>("SELECT owner_session_version FROM admin_owner_security WHERE id=1");
  const version = Number(security.rows[0]?.owner_session_version ?? 1);
  const expiry = Date.now() + SESSION_SECONDS * 1000;
  const token = randomBytes(32).toString("base64url");
  const payload = `${expiry}.${version}.${token}`;
  await pool.query("DELETE FROM admin_owner_sessions WHERE expires_at < now() - interval '30 days' OR revoked_at < now() - interval '30 days'");
  await pool.query("INSERT INTO admin_owner_sessions(token_hash,expires_at) VALUES($1,$2)", [hashSessionToken(token), new Date(expiry)]);
  return `owner.${payload}.${sign(payload)}`;
}
async function validOwnerSession(value: string): Promise<boolean> {
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== "owner") return false; // V20 owner cookies are invalidated on upgrade.
  const payload = parts.slice(1, 4).join(".");
  const expected = Buffer.from(sign(payload)); const actual = Buffer.from(parts[4]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  const expiry = Number(parts[1]); const version = Number(parts[2]); const token = parts[3];
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now() || !Number.isSafeInteger(version) || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return false;
  await ensureDb();
  const session = await pool.query(
    `SELECT s.id FROM admin_owner_sessions s JOIN admin_owner_security a ON a.id=1
      WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND a.owner_session_version=$2 LIMIT 1`,
    [hashSessionToken(token), version],
  );
  return !!session.rowCount;
}
function hashSessionToken(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}
export function verifyAdminPassword(password: string, encoded: string): boolean {
  const [scheme, salt, expectedHex] = encoded.split("$");
  if (scheme !== "scrypt" || !salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = scryptSync(password, salt, 64); const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function totpEncryptionKey(): Buffer { return scryptSync(getSecret(), "50500-admin-totp-v1", 32); }
export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", totpEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
export function decryptTotpSecret(value: string): string {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("رمز دومرحله‌ای ذخیره‌شده معتبر نیست");
  const decipher = createDecipheriv("aes-256-gcm", totpEncryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
function base32Encode(bytes: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = 0; let value = 0; let out = "";
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(text: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = 0; let value = 0; const out: number[] = [];
  for (const ch of text.toUpperCase().replace(/=+$/,"")) { const n = alphabet.indexOf(ch); if (n < 0) throw new Error("کلید دومرحله‌ای نامعتبر است"); value = (value << 5) | n; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
export function createTotpSecret(): string { return base32Encode(randomBytes(20)); }
export function verifyTotpCode(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret); const counter = Math.floor(now / 30000);
  for (let drift = -1; drift <= 1; drift++) {
    const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter + drift));
    const digest = createHmac("sha1", key).update(buf).digest(); const offset = digest[digest.length - 1] & 15;
    const binary = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
    const expected = Buffer.from((binary % 1_000_000).toString().padStart(6, "0"));
    const actual = Buffer.from(code);
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) return true;
  }
  return false;
}

export async function createStaffSession(staffId: number): Promise<string> {
  await ensureDb();
  await pool.query("DELETE FROM admin_staff_sessions WHERE staff_id=$1 AND ((expires_at < now() - interval '30 days') OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days'))", [staffId]);
  const token = randomBytes(32).toString("base64url");
  await pool.query("INSERT INTO admin_staff_sessions(staff_id, token_hash, expires_at) VALUES($1,$2,now() + interval '8 hours')", [staffId, hashSessionToken(token)]);
  return `staff.${token}`;
}
export async function revokeAdminSession(value?: string): Promise<void> {
  if (!value || value.length > 200) return;
  if (value.startsWith("staff.")) {
    const token = value.slice(6); if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return;
    await ensureDb();
    await pool.query("UPDATE admin_staff_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL", [hashSessionToken(token)]);
    return;
  }
  if (value.startsWith("owner.")) {
    const parts = value.split("."); const token = parts[3];
    if (parts.length !== 5 || !/^[A-Za-z0-9_-]{40,60}$/.test(token || "")) return;
    await ensureDb();
    await pool.query("UPDATE admin_owner_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL", [hashSessionToken(token)]);
  }
}
export async function getAdminContext(): Promise<AdminContext | null> {
  try {
    assertAdminEnvironment();
    const store = await cookies(); const value = store.get(ADMIN_COOKIE)?.value;
    if (!value) return null;
    if (!value.startsWith("staff.")) return (await validOwnerSession(value)) ? { kind: "owner", name: "مدیر اصلی", permissions: ["*"] } : null;
    const token = value.slice(6); if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
    await ensureDb();
    const result = await pool.query<{id:number;full_name:string;email:string;role:string;permissions:string[]}>(
      `SELECT u.id,u.full_name,u.email,u.role,u.permissions
         FROM admin_staff_sessions s JOIN admin_staff u ON u.id=s.staff_id
        WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.is_active=true LIMIT 1`,
      [hashSessionToken(token)],
    );
    const row = result.rows[0];
    if (!row) return null;
    // Keep a coarse last-seen timestamp without writing on every request.
    await pool.query("UPDATE admin_staff_sessions SET last_seen_at=now() WHERE token_hash=$1 AND last_seen_at < now() - interval '5 minutes'", [hashSessionToken(token)]);
    return { kind: "staff", id: row.id, name: row.full_name, email: row.email, role: row.role, permissions: Array.isArray(row.permissions) ? row.permissions : [] };
  } catch { return null; }
}
export async function isAdmin(): Promise<boolean> { return (await getAdminContext()) !== null; }
export async function isOwnerAdmin(): Promise<boolean> { return (await getAdminContext())?.kind === "owner"; }

function routePermission(req: Request): { module: string; action: "read" | "write" } | null {
  const path = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, "");
  const first = path.split("/")[0] || "";
  const method = req.method.toUpperCase();
  const action: "read" | "write" = method === "GET" || method === "HEAD" ? "read" : "write";
  const groups: Record<string, string> = {
    products: "catalog", "vehicle-catalog": "catalog", inventory: "inventory", suppliers: "inventory", purchasing: "inventory",
    orders: "orders", "order-export": "orders", returns: "returns", customers: "customers", finance: "finance",
    payments: "payments", "payment-transactions": "payments", blog: "content", "site-pages": "content", settings: "content", uploads: "content",
    coupons: "content", reviews: "support", messages: "support", analytics: "analytics", affiliates: "affiliates",
    tokens: "integrations", ai: "integrations", "system": "security", audit: "security", staff: "security",
  };
  const module = groups[first];
  return module ? { module, action } : null;
}
export async function isAdminPermission(permission: string): Promise<boolean> {
  const context = await getAdminContext();
  if (!context) return false;
  if (context.kind === "owner") return true;
  const module = permission.split(":")[0];
  return context.permissions.includes(permission) || context.permissions.includes(`${module}:*`) || (permission.endsWith(":read") && context.permissions.includes(`${module}:write`));
}

export async function isAdminRequest(req: Request): Promise<boolean> {
  const context = await getAdminContext();
  if (!context) return false;
  if (context.kind === "owner") return true;
  const required = routePermission(req);
  if (!required) return false;
  return context.permissions.includes(`${required.module}:${required.action}`) || context.permissions.includes(`${required.module}:*`) || (required.action === "read" && context.permissions.includes(`${required.module}:write`));
}
export const ADMIN_PERMISSION_OPTIONS: { key: StaffPermission; label: string }[] = [
  { key: "dashboard:read", label: "داشبورد و آمار کلی" },
  { key: "catalog:read", label: "مشاهده محصولات و خودروها" }, { key: "catalog:write", label: "ویرایش محصولات و خودروها" },
  { key: "orders:read", label: "مشاهده سفارش‌ها" }, { key: "orders:write", label: "مدیریت سفارش‌ها" },
  { key: "returns:read", label: "مشاهده مرجوعی‌ها" }, { key: "returns:write", label: "مدیریت مرجوعی‌ها" },
  { key: "inventory:read", label: "مشاهده انبار و خرید" }, { key: "inventory:write", label: "مدیریت انبار و خرید" },
  { key: "customers:read", label: "مشاهده مشتریان" }, { key: "customers:write", label: "مدیریت مشتریان" },
  { key: "finance:read", label: "مشاهده امور مالی" }, { key: "finance:write", label: "ثبت و ویرایش امور مالی" },
  { key: "payments:read", label: "مشاهده تراکنش‌ها" }, { key: "payments:write", label: "مدیریت پرداخت‌ها" },
  { key: "content:read", label: "مشاهده محتوا و تنظیمات" }, { key: "content:write", label: "ویرایش محتوا و تنظیمات" },
  { key: "support:read", label: "مشاهده پیام‌ها و نظرات" }, { key: "support:write", label: "پاسخ و مدیریت پیام‌ها و نظرات" },
  { key: "analytics:read", label: "مشاهده تحلیل‌ها" },
  { key: "affiliates:read", label: "مشاهده همکاران فروش" }, { key: "affiliates:write", label: "مدیریت همکاران فروش" },
  { key: "integrations:read", label: "مشاهده یکپارچه‌سازی‌ها" }, { key: "integrations:write", label: "مدیریت کلیدها و یکپارچه‌سازی‌ها" },
];

export async function requireAdminPermission(permission: string): Promise<void> {
  const context = await getAdminContext();
  if (!context) { redirect("/admin/login"); return; }
  if (context.kind === "owner") return;
  const module = permission.split(":")[0];
  const allowed = context.permissions.includes(permission) || context.permissions.includes(`${module}:*`) || (permission.endsWith(":read") && context.permissions.includes(`${module}:write`));
  if (!allowed) notFound();
}

export async function requireAdminSelf(): Promise<AdminContext> {
  const context = await getAdminContext();
  if (!context) { redirect("/admin/login"); throw new Error("Unauthenticated"); }
  if (context.kind !== "staff") { redirect("/admin"); throw new Error("Staff account required"); }
  return context;
}
