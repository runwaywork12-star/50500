import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Ctx){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401); await ensureDb();
 const id=Number((await params).id); if(!Number.isInteger(id)||id<1)return bad("شناسه نامعتبر است");
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null; if(!b)return bad("درخواست نامعتبر است");
 const fields:Record<string,unknown>={};
 for(const [key,max] of [["name",160],["company",160],["phone",30],["email",160],["address",1000],["notes",1500]] as const)if(typeof b[key]==="string")fields[key]=String(b[key]).trim().slice(0,max);
 if(typeof b.isActive==="boolean")fields.is_active=b.isActive;
 if("email" in fields && fields.email && !/^\S+@\S+\.\S+$/.test(String(fields.email)))return bad("ایمیل معتبر نیست");
 const keys=Object.keys(fields); if(!keys.length)return bad("تغییری ارسال نشده است");
 const cols=keys.map(k=>`"${k}"=$${keys.indexOf(k)+1}`); const vals=keys.map(k=>fields[k]); vals.push(id);
 const r=await pool.query(`UPDATE suppliers SET ${cols.join(",")},updated_at=now() WHERE id=$${vals.length} RETURNING id,name`,vals);
 if(!r.rowCount)return bad("تأمین‌کننده پیدا نشد",404);
 await logAdminAudit({action:"supplier_updated",resource:"suppliers",resourceId:id,summary:`ویرایش تأمین‌کننده ${r.rows[0].name}`});
 return Response.json({ok:true});
}
