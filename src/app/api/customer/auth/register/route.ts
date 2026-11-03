import { NextResponse } from "next/server";
import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { createCustomerSession, hashCustomerPassword, normalizePhone } from "@/lib/customer-auth";
import { rateLimit, requestClientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(req: Request) {
  const limit = rateLimit(`customer-register:${requestClientKey(req)}`, 6, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "تعداد ثبت‌نام‌ها زیاد است؛ کمی بعد دوباره تلاش کن." }, { status: 429 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  const fullName = clean(body.fullName, 90);
  const email = clean(body.email, 254).toLowerCase();
  const phone = normalizePhone(clean(body.phone, 24));
  const password = typeof body.password === "string" ? body.password : "";
  if (fullName.length < 3) return NextResponse.json({ error: "نام و نام خانوادگی را وارد کن." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "ایمیل معتبر وارد کن." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "شماره موبایل معتبر وارد کن؛ مانند 09123456789." }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "رمز عبور باید حداقل ۸ و حداکثر ۱۲۸ کاراکتر باشد." }, { status: 400 });

  await ensureDb();
  const passwordHash = await hashCustomerPassword(password);
  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO customers (phone, full_name, email, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [phone, fullName, email, passwordHash],
    );
    await createCustomerSession(result.rows[0].id);
    return NextResponse.json({ ok: true, redirect: "/account" }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "این ایمیل یا شماره موبایل قبلاً ثبت شده است. وارد حساب شو یا از ورود پیامکی استفاده کن." }, { status: 409 });
    }
    console.error("customer registration failed", error);
    return NextResponse.json({ error: "ثبت‌نام انجام نشد؛ تنظیمات دیتابیس را بررسی کن." }, { status: 500 });
  }
}
