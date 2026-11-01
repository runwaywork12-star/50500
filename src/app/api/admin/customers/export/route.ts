import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";
const cell = (v: unknown) => {
  let raw = String(v ?? "").replace(/[\r\n]+/g, " ");
  if (/^[\s]*[=+@-]/.test(raw)) raw = "'" + raw;
  return '"' + raw.replace(/"/g, '""') + '"';
};
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  await ensureDb();
  const { rows } = await pool.query(`WITH s AS (SELECT phone,max(customer_name) customer_name,count(*)::int order_count,coalesce(sum(total) FILTER(WHERE status<>'cancelled' AND payment_status IN ('paid','cod')),0)::bigint paid_total,max(created_at) last_order_at FROM orders GROUP BY phone) SELECT coalesce(c.phone,s.phone) phone,coalesce(nullif(c.full_name,''),s.customer_name,'') full_name,coalesce(c.email,'') email,coalesce(c.is_active,true) is_active,coalesce(s.order_count,0)::int order_count,coalesce(s.paid_total,0)::bigint paid_total,s.last_order_at FROM customers c FULL OUTER JOIN s ON s.phone=c.phone ORDER BY s.last_order_at DESC NULLS LAST LIMIT 10000`);
  const header = ["موبایل", "نام", "ایمیل", "وضعیت", "تعداد سفارش", "مجموع پرداخت قطعی تومان", "آخرین سفارش"];
  const csv = "\uFEFF" + [header, ...rows.map((r) => [r.phone,r.full_name,r.email,r.is_active?"فعال":"مسدود",r.order_count,r.paid_total,r.last_order_at])].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename*=UTF-8''50500-customers.csv", "Cache-Control": "no-store" } });
}
