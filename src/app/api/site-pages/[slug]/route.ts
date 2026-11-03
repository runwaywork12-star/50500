import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 await ensureDb();const slug=(await params).slug;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return Response.json({error:"صفحه پیدا نشد"},{status:404});
 const r=await pool.query("SELECT slug,title,intro,blocks,seo_title,seo_description FROM site_pages WHERE slug=$1 AND status='published' LIMIT 1",[slug]);
 if(!r.rowCount)return Response.json({error:"صفحه پیدا نشد"},{status:404});
 return Response.json({page:r.rows[0]},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300"}});
}
