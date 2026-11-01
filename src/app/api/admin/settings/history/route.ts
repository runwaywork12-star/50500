import { desc } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { siteSettingHistory } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(req: Request){if(!(await isAdminRequest(req)))return Response.json({error:"دسترسی غیرمجاز"},{status:401});await ensureDb();return Response.json(await db.select().from(siteSettingHistory).orderBy(desc(siteSettingHistory.changedAt)).limit(200));}
