import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { ADMIN_PERMISSION_OPTIONS, hashAdminPassword, isOwnerAdmin } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const allowed = new Set<string>(ADMIN_PERMISSION_OPTIONS.map((p) => p.key));

export async function GET() {
  if (!(await isOwnerAdmin())) return bad("فقط مدیر اصلی اجازه مدیریت کارکنان را دارد", 403);
  await ensureDb();
  const staff = await pool.query("SELECT id,full_name,email,role,permissions,is_active,totp_enabled,last_login_at,created_at FROM admin_staff ORDER BY created_at DESC");
  return Response.json({ rows: staff.rows, permissions: ADMIN_PERMISSION_OPTIONS });
}

export async function POST(req: Request) {
  if (!(await isOwnerAdmin())) return bad("فقط مدیر اصلی اجازه ساخت حساب کارمند را دارد", 403);
  await ensureDb();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = typeof body?.role === "string" && ["manager","orders","catalog","content","finance","support","analyst","custom"].includes(body.role) ? body.role : "custom";
  const permissions = Array.isArray(body?.permissions) ? [...new Set(body.permissions.filter((x): x is string => typeof x === "string" && allowed.has(x)))] : [];
  if (fullName.length < 2) return bad("نام کارمند معتبر نیست");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("ایمیل معتبر نیست");
  if (password.length < 12 || password.length > 200) return bad("رمز عبور باید حداقل ۱۲ کاراکتر باشد");
  if (permissions.length === 0) return bad("حداقل یک سطح دسترسی انتخاب کنید");
  try {
    const result = await pool.query("INSERT INTO admin_staff(full_name,email,password_hash,role,permissions) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id,full_name,email,role,permissions,is_active,created_at", [fullName,email,hashAdminPassword(password),role,JSON.stringify(permissions)]);
    const row = result.rows[0];
    await logAdminAudit({ action: "admin_staff_created", resource: "admin_staff", resourceId: row.id, summary: `ایجاد حساب کارمند ${email}` });
    return Response.json({ ok: true, staff: row });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return bad("این ایمیل قبلاً ثبت شده است", 409);
    throw error;
  }
}
