import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();const id=Number((await params).id);if(!Number.isInteger(id)||id<1)return bad("شناسه نامعتبر است");
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null;if(!b)return bad("درخواست نامعتبر است");const status=["pending","active","paused"].includes(String(b.status))?String(b.status):null;const pct=b.commissionPercent===undefined?null:Number(b.commissionPercent);const notes=typeof b.notes==="string"?b.notes.trim().slice(0,1200):undefined;
 if(!status&&pct===null&&notes===undefined)return bad("تغییری ارسال نشده است");if(pct!==null&&(!Number.isFinite(pct)||pct<0||pct>50))return bad("پورسانت باید بین صفر تا ۵۰ درصد باشد");
 const sets:string[]=[];const vals:unknown[]=[];const add=(col:string,v:unknown)=>{vals.push(v);sets.push(`${col}=$${vals.length}`)};if(status)add("status",status);if(pct!==null)add("commission_percent",pct);if(notes!==undefined)add("notes",notes);vals.push(id);
 const r=await pool.query(`UPDATE affiliates SET ${sets.join(",")},updated_at=now() WHERE id=$${vals.length} RETURNING name`,vals);if(!r.rowCount)return bad("همکار فروش پیدا نشد",404);await logAdminAudit({action:"affiliate_updated",resource:"affiliates",resourceId:id,summary:`ویرایش همکار فروش ${r.rows[0].name}`});return Response.json({ok:true});
}
