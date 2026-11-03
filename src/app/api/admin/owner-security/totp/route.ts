import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { rateLimit } from "@/lib/rate-limit";
import { createTotpSecret, decryptTotpSecret, encryptTotpSecret, isOwnerAdmin, verifyTotpCode } from "@/lib/auth";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });

type OwnerTotpRow = { totp_enabled: boolean; totp_secret_enc: string | null; totp_pending_secret_enc: string | null };

export async function GET() {
  if (!(await isOwnerAdmin())) return bad("فقط مدیر اصلی به این تنظیم دسترسی دارد", 403);
  await ensureDb();
  let result = await pool.query<OwnerTotpRow>("SELECT totp_enabled,totp_secret_enc,totp_pending_secret_enc FROM admin_owner_security WHERE id=1");
  const row = result.rows[0];
  if (!row) return bad("تنظیمات امنیتی مدیر اصلی پیدا نشد", 500);
  if (row.totp_enabled) return Response.json({ enabled: true });
  if (!row.totp_pending_secret_enc) {
    const secret = createTotpSecret();
    await pool.query("UPDATE admin_owner_security SET totp_pending_secret_enc=$1,updated_at=now() WHERE id=1 AND totp_enabled=false AND totp_pending_secret_enc IS NULL", [encryptTotpSecret(secret)]);
    result = await pool.query<OwnerTotpRow>("SELECT totp_enabled,totp_secret_enc,totp_pending_secret_enc FROM admin_owner_security WHERE id=1");
  }
  const current = result.rows[0];
  if (!current) return bad("تنظیمات امنیتی مدیر اصلی پیدا نشد", 500);
  if (current.totp_enabled) return Response.json({ enabled: true });
  if (!current.totp_pending_secret_enc) return bad("ساخت کلید راه‌اندازی ناموفق بود؛ صفحه را دوباره باز کنید", 409);
  const secret = decryptTotpSecret(current.totp_pending_secret_enc);
  const issuer = "50500 Admin";
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent("مدیر اصلی")}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  return Response.json({ enabled: false, secret, otpauthUrl });
}

export async function POST(req: Request) {
  if (!(await isOwnerAdmin())) return bad("فقط مدیر اصلی به این تنظیم دسترسی دارد", 403);
  const limit = rateLimit("admin-owner-totp", 10, 15 * 60 * 1000);
  if (!limit.allowed) return bad("تعداد تلاش‌های کد دومرحله‌ای بیش از حد مجاز است", 429);
  await ensureDb();
  const body = await req.json().catch(() => null) as { code?: unknown; action?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return bad("کد شش‌رقمی را وارد کنید");
  const result = await pool.query<OwnerTotpRow>("SELECT totp_enabled,totp_secret_enc,totp_pending_secret_enc FROM admin_owner_security WHERE id=1");
  const row = result.rows[0];
  if (!row) return bad("تنظیمات امنیتی مدیر اصلی پیدا نشد", 500);

  if (body?.action === "disable") {
    if (!row.totp_enabled || !row.totp_secret_enc || !verifyTotpCode(decryptTotpSecret(row.totp_secret_enc), code)) return bad("کد فعلی دومرحله‌ای درست نیست", 401);
    await pool.query("UPDATE admin_owner_security SET totp_enabled=false,totp_secret_enc=NULL,totp_pending_secret_enc=NULL,owner_session_version=owner_session_version+1,updated_at=now() WHERE id=1");
    await pool.query("UPDATE admin_owner_sessions SET revoked_at=now() WHERE revoked_at IS NULL");
    return Response.json({ ok: true, enabled: false, reauthenticate: true });
  }

  if (row.totp_enabled) return bad("تأیید دومرحله‌ای قبلاً فعال شده است");
  if (!row.totp_pending_secret_enc) return bad("ابتدا صفحه راه‌اندازی را دوباره باز کنید", 409);
  const secret = decryptTotpSecret(row.totp_pending_secret_enc);
  if (!verifyTotpCode(secret, code)) return bad("کد تأیید نادرست است؛ ساعت گوشی را روی تنظیم خودکار بگذارید", 401);
  await pool.query("UPDATE admin_owner_security SET totp_secret_enc=totp_pending_secret_enc,totp_pending_secret_enc=NULL,totp_enabled=true,owner_session_version=owner_session_version+1,updated_at=now() WHERE id=1");
  await pool.query("UPDATE admin_owner_sessions SET revoked_at=now() WHERE revoked_at IS NULL");
  return Response.json({ ok: true, enabled: true, reauthenticate: true });
}
