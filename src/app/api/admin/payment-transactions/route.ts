import { desc } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { payments } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  await ensureDb();
  // Never expose the raw gateway payload or secrets to the admin browser.
  const rows = await db.select({
    id: payments.id,
    orderCode: payments.orderCode,
    gateway: payments.gateway,
    amount: payments.amount,
    refId: payments.refId,
    cardPan: payments.cardPan,
    status: payments.status,
    createdAt: payments.createdAt,
    updatedAt: payments.updatedAt,
  }).from(payments).orderBy(desc(payments.createdAt), desc(payments.id)).limit(250);
  return Response.json({ rows });
}
