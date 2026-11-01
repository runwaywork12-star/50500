import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });

const customerQuery = `
  WITH order_stats AS (
    SELECT phone, max(customer_name) AS customer_name,
           count(*)::int AS order_count,
           count(*) FILTER (WHERE status <> 'cancelled' AND payment_status IN ('paid','cod'))::int AS paid_order_count,
           coalesce(sum(total) FILTER (WHERE status <> 'cancelled' AND payment_status IN ('paid','cod')),0)::bigint AS paid_total,
           max(created_at) AS last_order_at
      FROM orders GROUP BY phone
  )
  SELECT coalesce(c.id,0)::int AS id,
         coalesce(c.phone, s.phone) AS phone,
         coalesce(nullif(c.full_name,''), s.customer_name, '') AS full_name,
         coalesce(c.email,'') AS email,
         coalesce(c.is_active,true) AS is_active,
         c.created_at AS account_created_at,
         coalesce(s.order_count,0)::int AS order_count,
         coalesce(s.paid_order_count,0)::int AS paid_order_count,
         coalesce(s.paid_total,0)::bigint AS paid_total,
         s.last_order_at
    FROM customers c FULL OUTER JOIN order_stats s ON s.phone=c.phone
`;

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const params: unknown[] = [];
  let where = "";
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
    where = `WHERE coalesce(c.phone, s.phone, '') ILIKE $1 OR coalesce(nullif(c.full_name, ''), s.customer_name, '') ILIKE $1 OR coalesce(c.email, '') ILIKE $1`;
  }
  const result = await pool.query(`${customerQuery} ${where} ORDER BY last_order_at DESC NULLS LAST LIMIT 500`, params);
  return Response.json({ rows: result.rows, truncated: result.rows.length === 500 });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 20) : "";
  if (!/^09\d{9}$/.test(phone) || typeof body?.isActive !== "boolean") return bad("اطلاعات تغییر وضعیت مشتری معتبر نیست");
  const updated = await pool.query("UPDATE customers SET is_active=$1, updated_at=now() WHERE phone=$2 RETURNING id", [body.isActive, phone]);
  if (!updated.rowCount) return bad("حساب ثبت‌شده‌ای برای این شماره وجود ندارد", 404);
  await logAdminAudit({ action: body.isActive ? "customer_activated" : "customer_blocked", resource: "customers", resourceId: phone, summary: `تغییر وضعیت حساب مشتری ${phone}` });
  return Response.json({ ok: true });
}
