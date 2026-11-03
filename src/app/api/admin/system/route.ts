import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(req: Request){
 if(!(await isAdminRequest(req)))return Response.json({error:"دسترسی غیرمجاز"},{status:401});await ensureDb();
 const [db,counts]=await Promise.all([
  pool.query<{version:string;database:string}>('SELECT current_setting(\'server_version\') AS version,current_database() AS database'),
  pool.query(`SELECT
    (SELECT count(*)::int FROM products) AS products,
    (SELECT count(*)::int FROM orders) AS orders,
    (SELECT count(*)::int FROM customers) AS customers,
    (SELECT count(*)::int FROM uploads) AS uploads,
    (SELECT count(*)::int FROM finance_entries) AS finance_entries,
    (SELECT count(*)::int FROM return_requests) AS returns,
    (SELECT count(*)::int FROM purchase_orders) AS purchase_orders,
    (SELECT count(*)::int FROM suppliers) AS suppliers,
    (SELECT count(*)::int FROM affiliates) AS affiliates,
    (SELECT count(*)::int FROM site_pages) AS custom_pages,
    (SELECT count(*)::int FROM admin_audit_events) AS audit_events,
    (SELECT count(*)::int FROM admin_staff WHERE is_active=true) AS active_admin_staff,
    (SELECT count(*)::int FROM finance_journals WHERE status='posted') AS posted_journals`)
 ]);
 return Response.json({ok:true,checkedAt:new Date().toISOString(),database:db.rows[0],counts:counts.rows[0],environment:process.env.NODE_ENV||"unknown",node:process.version});
}
