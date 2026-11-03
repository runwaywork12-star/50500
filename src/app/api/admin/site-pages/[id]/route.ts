import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
import { normalizeSitePageBlocks } from "@/lib/site-page-blocks";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();const id=Number((await params).id);if(!Number.isInteger(id)||id<1)return bad("شناسه نامعتبر است");
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null;if(!b)return bad("درخواست نامعتبر است");
 const set:Record<string,unknown>={};for(const [key,col,max] of [["title","title",180],["intro","intro",1500],["seoTitle","seo_title",180],["seoDescription","seo_description",300]] as const)if(typeof b[key]==="string")set[col]=String(b[key]).trim().slice(0,max);
 if(typeof b.slug==="string"){const slug=b.slug.trim().toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80)return bad("نشانی صفحه معتبر نیست");set.slug=slug;}
 if(b.status==="draft"||b.status==="published")set.status=b.status;
 if(Array.isArray(b.blocks)){const blocks=normalizeSitePageBlocks(b.blocks);if(!blocks)return bad("بلوک‌ها، نشانی تصویر یا لینک دکمه معتبر نیستند");set.blocks=JSON.stringify(blocks);}
 const keys=Object.keys(set);if(!keys.length)return bad("تغییری ارسال نشده است");const values=keys.map(k=>set[k]);values.push(id);
 try{const r=await pool.query(`UPDATE site_pages SET ${keys.map((k,i)=>`"${k}"=$${i+1}`).join(",")},updated_at=now() WHERE id=$${values.length} RETURNING id,title,slug,status`,values);if(!r.rowCount)return bad("صفحه پیدا نشد",404);await logAdminAudit({action:"page_updated",resource:"site_pages",resourceId:id,summary:`ویرایش صفحه ${r.rows[0].title}`});return Response.json({ok:true,page:r.rows[0]});}
 catch(e){if((e as {code?:string})?.code==="23505")return bad("این نشانی صفحه قبلاً استفاده شده است",409);throw e;}
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return bad("شناسه نامعتبر است");
  const result = await pool.query("DELETE FROM site_pages WHERE id=$1 RETURNING id,title,slug", [id]);
  if (!result.rowCount) return bad("صفحه پیدا نشد", 404);
  await logAdminAudit({ action: "page_deleted", resource: "site_pages", resourceId: id, summary: `حذف صفحه ${result.rows[0].title} (${result.rows[0].slug})` });
  return Response.json({ ok: true });
}
