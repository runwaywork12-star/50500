import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function GET(req: Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();
 const [affiliates,commissions]=await Promise.all([
  pool.query(`SELECT a.*,count(c.id)::int AS commission_count,coalesce(sum(c.amount) FILTER(WHERE c.status IN ('pending','approved')),0)::bigint AS payable,coalesce(sum(c.amount) FILTER(WHERE c.status='paid'),0)::bigint AS paid_total FROM affiliates a LEFT JOIN affiliate_commissions c ON c.affiliate_id=a.id GROUP BY a.id ORDER BY a.created_at DESC`),
  pool.query(`SELECT c.*,a.name AS affiliate_name FROM affiliate_commissions c JOIN affiliates a ON a.id=c.affiliate_id ORDER BY c.created_at DESC LIMIT 300`)
 ]);
 return Response.json({affiliates:affiliates.rows,commissions:commissions.rows});
}
export async function POST(req:Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null;if(!b)return bad("درخواست نامعتبر است");
 const name=typeof b.name==="string"?b.name.trim().slice(0,160):"";const code=typeof b.code==="string"?b.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,40):"";
 const phone=typeof b.phone==="string"?b.phone.trim().slice(0,30):"";const email=typeof b.email==="string"?b.email.trim().slice(0,160):"";const pct=Number(b.commissionPercent);const notes=typeof b.notes==="string"?b.notes.trim().slice(0,1200):"";
 if(name.length<2||code.length<3||!Number.isFinite(pct)||pct<0||pct>50)return bad("نام، کد حداقل سه‌کاراکتری و درصد پورسانت معتبر لازم است");
 try{const r=await pool.query(`INSERT INTO affiliates(name,phone,email,code,commission_percent,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[name,phone,email,code,pct,notes]);await logAdminAudit({action:"affiliate_created",resource:"affiliates",resourceId:r.rows[0].id,summary:`ثبت همکار فروش ${name}`});return Response.json({ok:true,affiliate:r.rows[0]});}
 catch(e){if((e as {code?:string})?.code==="23505")return bad("کد همکاری قبلاً استفاده شده است",409);throw e;}
}
