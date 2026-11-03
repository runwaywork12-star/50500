import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function GET(req: Request){
  if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);
  await ensureDb();
  const result=await pool.query(`SELECT s.*,count(po.id)::int AS purchase_count,coalesce(sum(po.total_cost) FILTER(WHERE po.status<>'cancelled'),0)::bigint AS purchase_total
    FROM suppliers s LEFT JOIN purchase_orders po ON po.supplier_id=s.id GROUP BY s.id ORDER BY s.is_active DESC,s.name`);
  return Response.json({rows:result.rows});
}
export async function POST(req:Request){
  if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);
  await ensureDb();
  const b=await req.json().catch(()=>null) as Record<string,unknown>|null;
  const name=typeof b?.name==="string"?b.name.trim().slice(0,160):"";
  const phone=typeof b?.phone==="string"?b.phone.trim().slice(0,30):"";
  const email=typeof b?.email==="string"?b.email.trim().slice(0,160):"";
  const company=typeof b?.company==="string"?b.company.trim().slice(0,160):"";
  const address=typeof b?.address==="string"?b.address.trim().slice(0,1000):"";
  const notes=typeof b?.notes==="string"?b.notes.trim().slice(0,1500):"";
  if(name.length<2)return bad("نام تأمین‌کننده الزامی است");
  if(email && !/^\S+@\S+\.\S+$/.test(email))return bad("ایمیل معتبر نیست");
  const {rows}=await pool.query("INSERT INTO suppliers(name,company,phone,email,address,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[name,company,phone,email,address,notes]);
  await logAdminAudit({action:"supplier_created",resource:"suppliers",resourceId:rows[0].id,summary:`ثبت تأمین‌کننده ${name}`});
  return Response.json({ok:true,supplier:rows[0]});
}
