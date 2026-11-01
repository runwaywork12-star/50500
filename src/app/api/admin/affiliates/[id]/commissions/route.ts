import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();
 const affiliateId=Number((await params).id);if(!Number.isInteger(affiliateId)||affiliateId<1)return bad("شناسه همکار نامعتبر است");
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null;const orderCode=typeof b?.orderCode==="string"?b.orderCode.trim():"";
 if(!orderCode)return bad("کد سفارش را وارد کنید");
 const client=await pool.connect();let commissionId=0;
 try{await client.query("BEGIN");const a=await client.query("SELECT id,commission_percent FROM affiliates WHERE id=$1 AND status='active' FOR UPDATE",[affiliateId]);if(!a.rowCount)throw new Error("AFFILIATE_NOT_ACTIVE");
 const o=await client.query("SELECT id,code,subtotal,discount,payment_status,status FROM orders WHERE code=$1 FOR SHARE",[orderCode]);if(!o.rowCount)throw new Error("ORDER_NOT_FOUND");const order=o.rows[0];if(order.status==='cancelled'||!['paid','cod'].includes(order.payment_status)||(order.payment_status==='cod'&&order.status!=='delivered'))throw new Error("ORDER_NOT_SETTLED");
 const base=Math.max(0,Number(order.subtotal)-Number(order.discount));if(base<=0)throw new Error("BASE_INVALID");const rate=Number(a.rows[0].commission_percent);const amount=Math.round(base*rate/100);
 const ins=await client.query(`INSERT INTO affiliate_commissions(affiliate_id,order_id,order_code,base_amount,rate_percent,amount) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[affiliateId,order.id,order.code,base,rate,amount]);commissionId=Number(ins.rows[0].id);await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK");if(e instanceof Error){if(e.message==="AFFILIATE_NOT_ACTIVE")return bad("همکار فروش فعال پیدا نشد",404);if(e.message==="ORDER_NOT_FOUND")return bad("سفارش پیدا نشد",404);if(e.message==="ORDER_NOT_SETTLED")return bad("پورسانت فقط برای سفارش پرداخت‌شده یا سفارش پرداخت در محلِ تحویل‌شده ثبت می‌شود",409);if(e.message==="BASE_INVALID")return bad("مبنای پورسانت صفر است");}if((e as {code?:string})?.code==="23505")return bad("برای این سفارش قبلاً پورسانت ثبت شده است",409);throw e;}finally{client.release();}
 await logAdminAudit({action:"affiliate_commission_created",resource:"affiliate_commissions",resourceId:commissionId,summary:`ثبت پورسانت سفارش ${orderCode}`});return Response.json({ok:true,id:commissionId});
}
