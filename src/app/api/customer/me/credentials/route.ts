import { NextResponse } from "next/server";
import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { getCustomer, hashCustomerPassword } from "@/lib/customer-auth";
import { rateLimit, requestClientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const limit = rateLimit(`customer-credentials:${requestClientKey(req)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "تعداد تلاش‌ها زیاد است؛ بعداً دوباره تلاش کن." }, { status: 429 });
  const customer = await getCustomer();
  if (!customer) return NextResponse.json({ error: "برای ادامه ابتدا وارد حساب شو." }, { status: 401 });
  if (customer.email) return NextResponse.json({ error: "ایمیل این حساب قبلاً تنظیم شده است." }, { status: 409 });
  const body = await req.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (email.length > 254 || !EMAIL_RE.test(email)) return NextResponse.json({ error: "ایمیل معتبر وارد کن." }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد." }, { status: 400 });
  await ensureDb();
  const passwordHash = await hashCustomerPassword(password);
  try {
    const updated = await pool.query(
      `UPDATE customers SET email=$1, password_hash=$2, updated_at=now()
       WHERE id=$3 AND email IS NULL RETURNING id`,
      [email, passwordHash, customer.id],
    );
    if (!updated.rowCount) return NextResponse.json({ error: "حساب در همین زمان تغییر کرده است؛ صفحه را تازه کن." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "این ایمیل قبلاً در حساب دیگری استفاده شده است." }, { status: 409 });
    }
    console.error("customer credential upgrade failed", error);
    return NextResponse.json({ error: "ذخیره اطلاعات ورود انجام نشد." }, { status: 500 });
  }
}
