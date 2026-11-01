import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
export async function GET(req: Request){
 if(!(await isAdminRequest(req)))return Response.json({error:"دسترسی غیرمجاز"},{status:401});await ensureDb();
 const client=await pool.connect();
 const snapshot:Record<string,unknown>={format:"50500-admin-snapshot-v1",createdAt:new Date().toISOString(),notice:"Contains customer personal data and financial records. Store securely. This is a logical JSON snapshot, not a physical point-in-time PostgreSQL backup. Password hashes, sessions, OTPs, API tokens, raw gateway payloads, upload binaries and encrypted AI/payment secrets are excluded."};
 const queries:Record<string,string>={
  brands:"SELECT * FROM brands",car_models:"SELECT * FROM car_models",categories:"SELECT * FROM categories",products:"SELECT * FROM products",
  orders:"SELECT * FROM orders",order_items:"SELECT * FROM order_items",
  payments:"SELECT id,order_id,order_code,gateway,amount,ref_id,status,created_at,updated_at FROM payments",
  admin_audit_events:"SELECT id,actor,action,resource,resource_id,summary,created_at FROM admin_audit_events",
  customers:"SELECT id,phone,full_name,email,is_active,created_at,updated_at FROM customers",
  admin_staff:"SELECT id,full_name,email,role,permissions,is_active,created_at,updated_at FROM admin_staff",
  coupons:"SELECT * FROM coupons",finance_entries:"SELECT * FROM finance_entries",finance_accounts:"SELECT * FROM finance_accounts",finance_journals:"SELECT * FROM finance_journals",finance_journal_lines:"SELECT * FROM finance_journal_lines",
  blog_posts:"SELECT * FROM blog_posts",suppliers:"SELECT * FROM suppliers",purchase_orders:"SELECT * FROM purchase_orders",purchase_order_items:"SELECT * FROM purchase_order_items",stock_movements:"SELECT * FROM stock_movements",return_requests:"SELECT * FROM return_requests",affiliates:"SELECT * FROM affiliates",affiliate_commissions:"SELECT * FROM affiliate_commissions",site_pages:"SELECT * FROM site_pages",
  site_settings:"SELECT key,value,updated_at FROM site_settings WHERE key !~* '(secret|password|token|api.?key|merchant)'"
 };
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  for(const [key,query] of Object.entries(queries)){const result=await client.query(query);snapshot[key]=result.rows;}
  await client.query("COMMIT");
 }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
 await logAdminAudit({action:"backup_export",resource:"system",summary:"خروجی Snapshot داده‌های عملیاتی؛ بدون هش رمز و توکن‌ها"});
 const body=JSON.stringify(snapshot,null,2);return new Response(body,{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="50500-snapshot-${new Date().toISOString().slice(0,10)}.json"`,"Cache-Control":"no-store"}});
}
