import { randomInt, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { normalizePhone, sendCustomerOtp } from "@/lib/customer-auth";
import { rateLimit, requestClientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export async function POST(req: Request) {
  const ipLimit = rateLimit(`customer-otp-ip:${requestClientKey(req)}`, 10, 15 * 60 * 1000);
  if (!ipLimit.allowed) return NextResponse.json({ error: "تعداد درخواست‌ها زیاد است؛ بعداً دوباره تلاش کن." }, { status: 429 });
  const body = await req.json().catch(() => null) as { phone?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
  if (!phone) return NextResponse.json({ error: "شماره موبایل معتبر وارد کن؛ مانند 09123456789." }, { status: 400 });
  const phoneLimit = rateLimit(`customer-otp-phone:${phone}`, 4, 15 * 60 * 1000);
  if (!phoneLimit.allowed) return NextResponse.json({ error: "برای این شماره بیش از حد درخواست داده شده؛ کمی بعد تلاش کن." }, { status: 429 });
  await ensureDb();
  const code = String(randomInt(100000, 1000000));
  await pool.query("INSERT INTO customer_otps(phone,code_hash,expires_at) VALUES($1,$2,now()+interval '5 minutes')", [phone, hash(code)]);
  try {
    const delivery = await sendCustomerOtp(phone, code);
    return NextResponse.json({ ok: true, message: "اگر شماره معتبر باشد، کد ورود ارسال می‌شود.", ...(delivery.devCode ? { devCode: delivery.devCode, devOnly: true } : {}) });
  } catch (error) {
    await pool.query("UPDATE customer_otps SET used_at=now() WHERE phone=$1 AND used_at IS NULL", [phone]);
    const msg = error instanceof Error && error.message === "SMS_NOT_CONFIGURED" ? "سرویس پیامک هنوز تنظیم نشده است." : "ارسال پیامک انجام نشد؛ تنظیمات سرویس پیامک را بررسی کن.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
