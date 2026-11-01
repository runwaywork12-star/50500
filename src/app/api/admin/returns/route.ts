import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function GET(req: Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401); await ensureDb();
 const result=await pool.query(`SELECT r.*,o.total AS order_total,o.payment_status FROM return_requests r JOIN orders o ON o.id=r.order_id ORDER BY r.requested_at DESC LIMIT 300`);
 return Response.json({rows:result.rows});
}
export async function POST(req:Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401); await ensureDb();
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null;
 const orderCode=typeof b?.orderCode==="string"?b.orderCode.trim().slice(0,80):"";
 const reason=typeof b?.reason==="string"?b.reason.trim().slice(0,1200):"";
 const amount=Math.floor(Number(b?.refundAmount||0)); const adminNote=typeof b?.adminNote==="string"?b.adminNote.trim().slice(0,1000):"";
 if(!orderCode||reason.length<4||!Number.isSafeInteger(amount)||amount<0)return bad("کد سفارش، دلیل مرجوعی و مبلغ معتبر لازم است");
 const order=await pool.query("SELECT id,code,customer_name,phone,total,payment_status,status FROM orders WHERE code=$1 LIMIT 1",[orderCode]);
 if(!order.rowCount)return bad("سفارش پیدا نشد",404);
 const o=order.rows[0]; if(o.payment_status!=='paid'&&o.payment_status!=='cod')return bad("برای سفارش پرداخت‌نشده پرونده بازپرداخت ثبت نمی‌شود",409);
 if(amount>Number(o.total))return bad("مبلغ بازپرداخت نمی‌تواند از مبلغ سفارش بیشتر باشد");
 const items=await pool.query("SELECT product_id,title,quantity,unit_price,unit_cost,options FROM order_items WHERE order_id=$1",[o.id]);
 let inserted;
 try {
  inserted=await pool.query(`INSERT INTO return_requests(order_id,order_code,customer_name,phone,reason,items,refund_amount,admin_note)
   VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8) RETURNING *`,[o.id,o.code,o.customer_name,o.phone,reason,JSON.stringify(items.rows),amount,adminNote]);
 } catch(e) {
  if((e as {code?:string})?.code==="23505")return bad("برای این سفارش قبلاً پرونده مرجوعی کامل ثبت شده است",409);
  throw e;
 }
 await logAdminAudit({action:"return_created",resource:"returns",resourceId:inserted.rows[0].id,summary:`ثبت پرونده مرجوعی سفارش ${o.code}`});
 return Response.json({ok:true,row:inserted.rows[0]});
}
