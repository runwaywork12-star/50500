import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { ADMIN_PERMISSION_OPTIONS, hashAdminPassword, isOwnerAdmin } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const allowed = new Set<string>(ADMIN_PERMISSION_OPTIONS.map((p) => p.key));
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwnerAdmin())) return bad("فقط مدیر اصلی اجازه مدیریت کارکنان را دارد", 403);
  await ensureDb();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return bad("شناسه نامعتبر است");
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return bad("درخواست نامعتبر است");
  const sets: string[] = []; const values: unknown[] = [];
  const add = (col: string, value: unknown) => { values.push(value); sets.push(`"${col}"=$${values.length}`); };
  if (typeof body.fullName === "string") { const v=body.fullName.trim().slice(0,100); if(v.length<2)return bad("نام معتبر نیست"); add("full_name",v); }
  if (typeof body.isActive === "boolean") add("is_active",body.isActive);
  if (body.role !== undefined) {
    if (typeof body.role !== "string" || !["manager","orders","catalog","content","finance","support","analyst","custom"].includes(body.role)) return bad("نقش انتخاب‌شده معتبر نیست");
    add("role",body.role);
  }
  if (Array.isArray(body.permissions)) {
    const nextPermissions = [...new Set(body.permissions.filter((x):x is string=>typeof x === "string"&&allowed.has(x)))];
    if (!nextPermissions.length) return bad("هر کارمند باید حداقل یک مجوز داشته باشد");
    add("permissions",JSON.stringify(nextPermissions));
  }
  if (typeof body.password === "string" && body.password) { if(body.password.length<12||body.password.length>200)return bad("رمز عبور باید حداقل ۱۲ کاراکتر باشد"); add("password_hash",hashAdminPassword(body.password)); }
  if (!sets.length) return bad("تغییری ارسال نشده است");
  values.push(id);
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const result=await client.query(`UPDATE admin_staff SET ${sets.join(",")},updated_at=now() WHERE id=$${values.length} RETURNING id,email,full_name,is_active`,values);
    if(!result.rowCount){await client.query("ROLLBACK");return bad("کارمند پیدا نشد",404);}
    if (body.isActive===false || typeof body.password === "string") await client.query("UPDATE admin_staff_sessions SET revoked_at=now() WHERE staff_id=$1 AND revoked_at IS NULL",[id]);
    await client.query("COMMIT");
    await logAdminAudit({action:"admin_staff_updated",resource:"admin_staff",resourceId:id,summary:`به‌روزرسانی حساب ${result.rows[0].email}`});
    return Response.json({ok:true,staff:result.rows[0]});
  } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwnerAdmin())) return bad("فقط مدیر اصلی اجازه مدیریت کارکنان را دارد",403);
  await ensureDb(); const id=Number((await params).id); if(!Number.isInteger(id)||id<1)return bad("شناسه نامعتبر است");
  const result=await pool.query("UPDATE admin_staff SET is_active=false,updated_at=now() WHERE id=$1 RETURNING id,email",[id]);
  if(!result.rowCount)return bad("کارمند پیدا نشد",404);
  await pool.query("UPDATE admin_staff_sessions SET revoked_at=now() WHERE staff_id=$1 AND revoked_at IS NULL",[id]);
  await logAdminAudit({action:"admin_staff_disabled",resource:"admin_staff",resourceId:id,summary:`غیرفعال‌سازی حساب ${result.rows[0].email}`});
  return Response.json({ok:true});
}
