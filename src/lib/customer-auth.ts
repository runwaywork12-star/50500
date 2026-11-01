import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";

export const CUSTOMER_COOKIE = "store50500_customer";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const normalizePhone = (raw: string) => {
  let p = raw.replace(/[\s()-]/g, "");
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  if (p.startsWith("0098")) p = "0" + p.slice(4);
  if (!/^09\d{9}$/.test(p)) return null;
  return p;
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function getCustomer() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  await ensureDb();
  const result = await pool.query(
    `SELECT c.id, c.phone, c.email, c.full_name AS "fullName", c.created_at AS "createdAt"
     FROM customer_sessions s JOIN customers c ON c.id=s.customer_id
     WHERE s.token_hash=$1 AND s.expires_at > now() AND c.is_active=true LIMIT 1`,
    [hash(token)],
  );
  return result.rows[0] ?? null;
}

export async function createCustomerSession(customerId: number) {
  await ensureDb();
  const token = randomBytes(32).toString("base64url");
  await pool.query("INSERT INTO customer_sessions (customer_id, token_hash, expires_at) VALUES ($1,$2,now()+ interval '30 days')", [customerId, hash(token)]);
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_SECONDS });
}

export async function sendCustomerOtp(phone: string, code: string) {
  const url = process.env.SMS_API_URL;
  const key = process.env.SMS_API_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV !== "production") return { delivered: false, devCode: code };
    throw new Error("SMS_NOT_CONFIGURED");
  }
  const response = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ receptor: phone, message: `کد ورود ۵۰۵۰۰: ${code}` }), cache: "no-store",
  });
  if (!response.ok) throw new Error("SMS_SEND_FAILED");
  return { delivered: true };
}


function derivePassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

export async function hashCustomerPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await derivePassword(password, salt);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyCustomerPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algorithm, salt, digestHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !digestHex || !/^[a-f0-9]{128}$/i.test(digestHex)) return false;
  const expected = Buffer.from(digestHex, "hex");
  const actual = await derivePassword(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
