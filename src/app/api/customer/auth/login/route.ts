import { NextResponse } from "next/server";
import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { createCustomerSession, verifyCustomerPassword } from "@/lib/customer-auth";
import { rateLimit, requestClientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const limit = rateLimit(`customer-password-login:${requestClientKey(req)}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "تلاش‌های ورود زیاد است؛ ۱۵ دقیقه دیگر دوباره امتحان کن." }, { status: 429 });
  const body = await req.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (email.length > 254 || !EMAIL_RE.test(email) || !password || password.length > 128) {
    return NextResponse.json({ error: "ایمیل یا رمز عبور معتبر نیست." }, { status: 400 });
  }
  await ensureDb();
  const result = await pool.query<{ id: number; password_hash: string | null; is_active: boolean }>(
    `SELECT id, password_hash, is_active FROM customers WHERE lower(email)=lower($1) LIMIT 1`, [email],
  );
  const row = result.rows[0];
  const valid = await verifyCustomerPassword(password, row?.password_hash);
  if (!row || !row.is_active || !valid) {
    return NextResponse.json({ error: "ایمیل یا رمز عبور اشتباه است." }, { status: 401 });
  }
  await createCustomerSession(row.id);
  return NextResponse.json({ ok: true, redirect: "/account" });
}
