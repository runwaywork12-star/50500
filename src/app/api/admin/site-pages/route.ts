import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
import { normalizeSitePageBlocks } from "@/lib/site-page-blocks";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function GET(req: Request){if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();const r=await pool.query("SELECT * FROM site_pages ORDER BY updated_at DESC");return Response.json({rows:r.rows});}
export async function POST(req:Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();const b=await req.json().catch(()=>null) as Record<string,unknown>|null;
 const slug=typeof b?.slug==="string"?b.slug.trim().toLowerCase():"";const title=typeof b?.title==="string"?b.title.trim().slice(0,180):"";const intro=typeof b?.intro==="string"?b.intro.trim().slice(0,1500):"";const blocks=normalizeSitePageBlocks(b?.blocks??[]);const seoTitle=typeof b?.seoTitle==="string"?b.seoTitle.trim().slice(0,180):"";const seoDescription=typeof b?.seoDescription==="string"?b.seoDescription.trim().slice(0,300):"";
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length<2||slug.length>80)return bad("نشانی صفحه فقط باید شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");if(title.length<2||!blocks)return bad("عنوان یا بلوک‌های صفحه معتبر نیستند");
 try{const r=await pool.query(`INSERT INTO site_pages(slug,title,intro,blocks,seo_title,seo_description,status) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7) RETURNING *`,[slug,title,intro,JSON.stringify(blocks),seoTitle,seoDescription,b?.status==="published"?"published":"draft"]);await logAdminAudit({action:"page_created",resource:"site_pages",resourceId:r.rows[0].id,summary:`ایجاد صفحه ${title}`});return Response.json({ok:true,page:r.rows[0]});}
 catch(e){if((e as {code?:string})?.code==="23505")return bad("این نشانی صفحه قبلاً استفاده شده است",409);throw e;}
}
