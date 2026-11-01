import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 if(!(await isAdminRequest(req)))return Response.json({error:"دسترسی غیرمجاز"},{status:401});await ensureDb();
 const url=new URL(req.url);const resource=(url.searchParams.get("resource")||"").trim().slice(0,80);const limit=Math.min(500,Math.max(1,Number(url.searchParams.get("limit"))||200));
 const params:unknown[]=[];let where="";if(resource){params.push(resource);where="WHERE resource=$1";}params.push(limit);
 const rows=await pool.query(`SELECT id,actor,action,resource,resource_id,summary,created_at FROM admin_audit_events ${where} ORDER BY created_at DESC LIMIT $${params.length}`,params);
 return Response.json({rows:rows.rows});
}
