import crypto from "node:crypto";
import * as OTPAuth from "otpauth";
import { q, tx } from "./db.mjs";

const PROD = process.env.NODE_ENV === "production";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
export const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

/** Production fails closed rather than silently running with weak secrets. */
export function assertProductionSecrets() {
  const problems = [];
  if (PROD) {
    if (ADMIN_PASSWORD.length < 16) problems.push("ADMIN_PASSWORD must be at least 16 characters");
    if (ADMIN_SECRET.length < 32) problems.push("ADMIN_SECRET must be at least 32 random characters");
    if (!process.env.DATABASE_URL) problems.push("DATABASE_URL is required");
    if (!process.env.PUBLIC_ORIGIN?.startsWith("https://")) problems.push("PUBLIC_ORIGIN must be an https:// URL");
  }
  if (problems.length) throw new Error("Unsafe configuration:\n- " + problems.join("\n- "));
}

/* ---------------------------- password hashing ---------------------------- */
const SCRYPT = { N: 1 << 15, r: 8, p: 1, keylen: 64 };
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, { ...SCRYPT, maxmem: 128 * 1024 * 1024 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}
export function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, salt, key] = String(stored).split("$");
    if (scheme !== "scrypt") return false;
    const expected = Buffer.from(key, "base64");
    const actual = crypto.scryptSync(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, {
      N: Number(N), r: Number(r), p: Number(p), maxmem: 128 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}

/* ------------------------------ AES-256-GCM ------------------------------- */
const vaultKey = () => crypto.createHash("sha256").update(ADMIN_SECRET || "dev-only-insecure-key").digest();
export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", vaultKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${enc.toString("base64")}`;
}
export function decryptSecret(blob) {
  const [iv, tag, data] = String(blob).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/* -------------------------------- sessions -------------------------------- */
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const SESSION_COOKIE = "s50500";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 12);

export async function createSession(res, { kind, subject, ip, userAgent }) {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrf = crypto.randomBytes(24).toString("base64url");
  await q(
    `INSERT INTO sessions(token_hash,kind,subject,csrf,ip,user_agent,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,now() + ($7 || ' hours')::interval)`,
    [sha256(token), kind, subject, csrf, ip ?? null, (userAgent ?? "").slice(0, 200), String(TTL_HOURS)],
  );
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, secure: PROD, sameSite: "lax", path: "/",
    maxAge: TTL_HOURS * 3600_000,
  });
  return { csrf };
}

export async function readSession(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const { rows } = await q(
    "SELECT kind,subject,csrf FROM sessions WHERE token_hash=$1 AND expires_at > now()",
    [sha256(token)],
  );
  return rows[0] ?? null;
}

export async function destroySession(req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await q("DELETE FROM sessions WHERE token_hash=$1", [sha256(token)]);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function revokeSubjectSessions(kind, subject) {
  await q("DELETE FROM sessions WHERE kind=$1 AND subject=$2", [kind, subject]);
}

/** Double-submit CSRF: cookie is HttpOnly, so the header must come from JS. */
export function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const sent = req.get("x-csrf-token");
  if (!req.session || !sent || sent.length !== req.session.csrf.length ||
      !crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(req.session.csrf))) {
    return res.status(403).json({ error: "درخواست نامعتبر است (CSRF). صفحه را دوباره بارگذاری کنید." });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session || !["admin", "staff"].includes(req.session.kind)) {
    return res.status(401).json({ error: "نشست مدیریت معتبر نیست؛ دوباره وارد شوید." });
  }
  next();
}

/* ---------------------------------- TOTP ---------------------------------- */
export function newTotp(email) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ issuer: "50500", label: email, algorithm: "SHA1", digits: 6, period: 30, secret });
  return { secret: secret.base32, uri: totp.toString() };
}
export function checkTotp(base32, code) {
  if (!base32 || !/^\d{6}$/.test(String(code ?? ""))) return false;
  const totp = new OTPAuth.TOTP({ issuer: "50500", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(base32) });
  return totp.validate({ token: String(code), window: 1 }) !== null;
}

/* ------------------------------- login guard ------------------------------ */
const attempts = new Map();
export function loginGuard(key, max = 6, windowMs = 10 * 60_000) {
  const now = Date.now();
  const rec = attempts.get(key) ?? { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  rec.count += 1;
  attempts.set(key, rec);
  return { allowed: rec.count <= max, retryInSec: Math.max(0, Math.ceil((rec.resetAt - now) / 1000)) };
}
export function clearLoginGuard(key) { attempts.delete(key); }

/* ------------------------------ misc helpers ------------------------------ */
export const clientIp = (req) =>
  (req.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.socket.remoteAddress || null;

export async function audit(actor, module, action, ip, meta = {}) {
  await q("INSERT INTO audit_log(actor,module,action,ip,meta) VALUES($1,$2,$3,$4,$5)",
    [actor, module, action, ip, JSON.stringify(meta)]).catch(() => {});
}

/** Cancels stale unpaid orders and releases their stock atomically. */
export async function expireUnpaidOrders(ttlMinutes = 30) {
  return tx(async (c) => {
    const { rows } = await c.query(
      `UPDATE orders SET status='cancelled', payment_status='pending'
       WHERE payment_status='pending' AND payment_method='online'
         AND expires_at IS NOT NULL AND expires_at < now() AND status='pending'
       RETURNING code`,
    );
    for (const row of rows) {
      await c.query(
        `UPDATE products p SET stock = p.stock + i.qty
         FROM order_items i WHERE i.order_code=$1 AND i.slug = p.slug`,
        [row.code],
      );
    }
    return rows.length;
  });
}
