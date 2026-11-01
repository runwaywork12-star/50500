import { cookies } from "next/headers";
import { ADMIN_COOKIE, createAdminSession, createStaffSession, getAdminPassword, passwordsMatch, assertAdminEnvironment, verifyAdminPassword, decryptTotpSecret, verifyTotpCode } from "@/lib/auth";
import { rateLimit, requestClientKey } from "@/lib/rate-limit";
import { ensureDb } from "@/db/bootstrap";
import { pool } from "@/db";

export const dynamic = "force-dynamic";

function setSessionCookie(value: string) {
  return cookies().then((store) => store.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  }));
}

export async function POST(req: Request) {
  const limit = rateLimit(`admin-login:${requestClientKey(req)}`, 8, 15 * 60 * 1000);
  if (!limit.allowed) return Response.json({ error: "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try { assertAdminEnvironment(); } catch { return Response.json({ error: "تنظیمات امنیتی مدیر روی سرور کامل نیست" }, { status: 503 }); }
  const body = (await req.json().catch(() => null)) as { password?: unknown; email?: unknown; totpCode?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (password.length > 200 || email.length > 254) return Response.json({ error: "اطلاعات ورود بیش از حد مجاز است" }, { status: 400 });

  // Legacy environment owner login remains available for the primary owner.
  if (!email && password && passwordsMatch(password, getAdminPassword())) {
    await ensureDb();
    const ownerSecurity = await pool.query<{ totp_enabled: boolean; totp_secret_enc: string | null }>("SELECT totp_enabled,totp_secret_enc FROM admin_owner_security WHERE id=1");
    const owner = ownerSecurity.rows[0];
    if (owner?.totp_enabled) {
      const code = typeof body?.totpCode === "string" ? body.totpCode.trim() : "";
      let valid = false;
      try { valid = !!owner.totp_secret_enc && verifyTotpCode(decryptTotpSecret(owner.totp_secret_enc), code); } catch { valid = false; }
      if (!valid) return Response.json({ error: "کد دومرحله‌ای مدیر اصلی معتبر نیست" }, { status: 401 });
    }
    await setSessionCookie(await createAdminSession());
    return Response.json({ ok: true, role: "owner" });
  }

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1) {
    return Response.json({ error: "ایمیل و رمز عبور را کامل وارد کنید" }, { status: 400 });
  }
  await ensureDb();
  const result = await pool.query<{ id: number; password_hash: string; is_active: boolean; full_name: string; role: string; permissions: string[]; totp_enabled: boolean; totp_secret_enc: string | null }>(
    "SELECT id,password_hash,is_active,full_name,role,permissions,totp_enabled,totp_secret_enc FROM admin_staff WHERE lower(email)=lower($1) LIMIT 1", [email],
  );
  const staff = result.rows[0];
  if (!staff || !staff.is_active || !verifyAdminPassword(password, staff.password_hash)) {
    return Response.json({ error: "ایمیل یا رمز عبور اشتباه است" }, { status: 401 });
  }
  if (staff.totp_enabled) {
    const code = typeof body?.totpCode === "string" ? body.totpCode.trim() : "";
    let valid = false;
    try { valid = !!staff.totp_secret_enc && verifyTotpCode(decryptTotpSecret(staff.totp_secret_enc), code); } catch { valid = false; }
    if (!valid) return Response.json({ error: "کد تأیید دومرحله‌ای معتبر نیست" }, { status: 401 });
  }
  const perms = Array.isArray(staff.permissions) ? staff.permissions : [];
  if (!perms.length) return Response.json({ error: "برای این حساب هیچ سطح دسترسی فعالی تعریف نشده است؛ با مدیر اصلی تماس بگیرید" }, { status: 403 });
  const session = await createStaffSession(Number(staff.id));
  await pool.query("UPDATE admin_staff SET last_login_at=now(),updated_at=now() WHERE id=$1", [staff.id]);
  await setSessionCookie(session);
  const destinations: [string, string][] = [
    ["dashboard:read", "/admin"], ["orders:read", "/admin/orders"], ["catalog:read", "/admin/products"],
    ["returns:read", "/admin/returns"], ["inventory:read", "/admin/inventory"], ["customers:read", "/admin/customers"],
    ["finance:read", "/admin/accounting"], ["payments:read", "/admin/payments"], ["content:read", "/admin/pages"],
    ["support:read", "/admin/messages"], ["analytics:read", "/admin/analytics"], ["affiliates:read", "/admin/affiliates"], ["integrations:read", "/admin/integrations"],
  ];
  const startPath = destinations.find(([permission]) => perms.includes(permission) || perms.includes(`${permission.split(":")[0]}:write`) || perms.includes(`${permission.split(":")[0]}:*`))?.[1] ?? "/admin/login";
  return Response.json({ ok: true, role: staff.role, name: staff.full_name, startPath });
}
