import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { config } from "./config";

/* ------------------------------- passwords -------------------------------- */
// scrypt (memory-hard) with per-password salt; parameters are stored with the hash.
const SCRYPT = { N: 1 << 15, r: 8, p: 1 };
const MAXMEM = 96 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize("NFKC"), salt, keylen, { ...opts, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash used when an account does not exist, so response time does not reveal it. */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("timing-equaliser-not-a-real-password");
  await verifyPassword(password, await dummyHash);
}

export function passwordPolicy(password: string): string | null {
  if (password.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  if (password.length > 128) return "رمز عبور بیش از حد طولانی است.";
  if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/\d|[۰-۹]/.test(password)) return "رمز عبور باید شامل حرف و عدد باشد.";
  return null;
}

/* --------------------------------- tokens --------------------------------- */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export function randomDigits(length: number) {
  let out = String(randomInt(1, 10));
  while (out.length < length) out += String(randomInt(0, 10));
  return out;
}
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ------------------------- encryption at rest (vault) ---------------------- */
// AES-256-GCM, key derived from APP_SECRET with HKDF. Used for gateway credentials, AI keys, TOTP secrets.
const vaultKey = Buffer.from(hkdfSync("sha256", config.appSecret, "50500.shop/vault", "aes-256-gcm v1", 32));

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unsupported vault payload");
  const decipher = createDecipheriv("aes-256-gcm", vaultKey, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/* ---------------------------------- TOTP ---------------------------------- */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(input: string) {
  const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Invalid base32");
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
export const generateTotpSecret = () => base32Encode(randomBytes(20));

function totpAt(secret: string, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** Returns the matched time-step counter (for replay protection) or null. */
export function verifyTotp(secret: string, code: string, lastUsedCounter = -1): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const now = Math.floor(Date.now() / 30_000);
  for (const step of [0, -1, 1]) {
    const counter = now + step;
    if (counter <= lastUsedCounter) continue;
    if (safeEqual(totpAt(secret, counter), code)) return counter;
  }
  return null;
}
export const totpUri = (secret: string, account: string) =>
  `otpauth://totp/${encodeURIComponent(`50500.shop:${account}`)}?secret=${secret}&issuer=${encodeURIComponent("50500.shop")}&algorithm=SHA1&digits=6&period=30`;

/* ------------------------------ rate limiting ----------------------------- */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000).unref();

/** Fixed-window limiter. Returns seconds to wait when the limit is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  return { ok: true };
}

/* -------------------------------- helpers --------------------------------- */
export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
export function normalizePhone(value: string) {
  let digits = normalizeDigits(value).replace(/\D/g, "");
  if (digits.startsWith("0098")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("98") && digits.length === 12) digits = `0${digits.slice(2)}`;
  else if (digits.length === 10 && digits.startsWith("9")) digits = `0${digits}`;
  return digits;
}
export const maskPhone = (phone: string) => (phone.length >= 11 ? `${phone.slice(0, 4)}***${phone.slice(-4)}` : "***");
