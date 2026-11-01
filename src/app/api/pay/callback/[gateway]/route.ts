import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { orders } from "@/db/schema";
import { verifyCallback } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await params;
  const url = new URL(req.url);
  const code = (url.searchParams.get("order") || "").slice(0, 20);
  if ((gateway !== "zarinpal" && gateway !== "zibal") || !code) redirect("/track?error=1");
  await ensureDb();
  const [order] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  if (!order) redirect("/track?error=1");
  try {
    const result = await verifyCallback(gateway as "zarinpal" | "zibal", order, url.searchParams);
    redirect(result.orderCancelled ? `/order/${code}?refund=1` : result.ok ? `/order/${code}?paid=1` : `/order/${code}?failed=1`);
  } catch {
    redirect(`/order/${code}?failed=1`);
  }
}
