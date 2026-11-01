import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { createCustomerSession, normalizePhone } from "@/lib/customer-auth";
import { rateLimit, requestClientKey } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export async function POST(req: Request) {
  const limit = rateLimit(`customer-verify:${requestClientKey(req)}`, 12, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "تلاش‌های زیاد؛ کمی بعد دوباره امتحان کن." }, { status: 429 });
  const body = await req.json().catch(() => null) as { phone?: unknown; code?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!phone || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "شماره یا کد تأیید معتبر نیست." }, { status: 400 });
  await ensureDb();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const otp = await client.query(`SELECT id, code_hash FROM customer_otps WHERE phone=$1 AND used_at IS NULL AND expires_at>now() AND attempts<5 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [phone]);
    if (!otp.rowCount || otp.rows[0].code_hash !== hash(code)) {
      if (otp.rowCount) await client.query("UPDATE customer_otps SET attempts=attempts+1 WHERE id=$1", [otp.rows[0].id]);
      await client.query("COMMIT");
      return NextResponse.json({ error: "کد اشتباه است یا منقضی شده؛ دوباره درخواست کد بده." }, { status: 401 });
    }
    await client.query("UPDATE customer_otps SET used_at=now() WHERE id=$1", [otp.rows[0].id]);
    const result = await client.query(`INSERT INTO customers(phone) VALUES($1) ON CONFLICT(phone) DO UPDATE SET updated_at=now() WHERE customers.is_active=true RETURNING id`, [phone]);
    if (!result.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "این حساب غیرفعال است؛ با پشتیبانی تماس بگیر." }, { status: 403 }); }
    await client.query("COMMIT");
    await createCustomerSession(result.rows[0].id);
    return NextResponse.json({ ok: true, redirect: "/account" });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "ورود انجام نشد؛ دوباره تلاش کن." }, { status: 500 });
  } finally { client.release(); }
}
