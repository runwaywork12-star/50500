import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { orders } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const rank: Record<string, number> = { pending: 0, confirmed: 1, producing: 2, shipped: 3, delivered: 4 };

/** Safe bulk progression only. Cancelling, refunding and changing payment state remain single-order workflows. */
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !Array.isArray(body.ids)) return bad("فهرست سفارش‌ها معتبر نیست");
  const ids = Array.from(new Set(body.ids.map(Number))).filter((id) => Number.isInteger(id) && id > 0);
  const target = typeof body.status === "string" ? body.status : "";
  if (!ids.length || ids.length > 100) return bad("برای تغییر گروهی بین ۱ تا ۱۰۰ سفارش انتخاب کنید");
  if (!(target in rank) || target === "pending") return bad("وضعیت مقصد مجاز نیست؛ فقط می‌توان وضعیت سفارش را به جلو برد");

  try {
    const updated = await db.transaction(async (tx) => {
      const rows = await tx.select({ id: orders.id, status: orders.status, paymentStatus: orders.paymentStatus })
        .from(orders).where(inArray(orders.id, ids)).for("update");
      if (rows.length !== ids.length) throw new Error("ORDER_NOT_FOUND");
      for (const row of rows) {
        if (!(row.status in rank) || rank[target] <= rank[row.status]) throw new Error("INVALID_TRANSITION");
        if (row.paymentStatus !== "paid" && row.paymentStatus !== "cod") throw new Error("PAYMENT_NOT_SETTLED");
      }
      const result = await tx.update(orders).set({ status: target, updatedAt: new Date() })
        .where(and(inArray(orders.id, ids), inArray(orders.status, Object.keys(rank)), inArray(orders.paymentStatus, ["paid", "cod"])))
        .returning({ id: orders.id });
      if (result.length !== ids.length) throw new Error("CONCURRENT_UPDATE");
      return result.length;
    });
    await logAdminAudit({ action: "orders_bulk_progressed", resource: "orders", resourceId: ids.join(","), summary: `پیشبرد گروهی ${updated} سفارش به وضعیت ${target}` });
    return Response.json({ ok: true, updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") return bad("برخی سفارش‌ها دیگر وجود ندارند؛ فهرست را تازه کنید", 409);
    if (code === "INVALID_TRANSITION") return bad("وضعیت انتخاب‌شده برای همه سفارش‌ها مرحله بعدی نیست؛ لغو یا بازگشت گروهی مجاز نیست", 409);
    if (code === "PAYMENT_NOT_SETTLED") return bad("فقط سفارش‌های پرداخت‌شده یا پرداخت در محل قابل پیشبرد گروهی هستند", 409);
    if (code === "CONCURRENT_UPDATE") return bad("وضعیت یکی از سفارش‌ها هم‌زمان تغییر کرده؛ فهرست را تازه کنید", 409);
    return bad("به‌روزرسانی گروهی سفارش‌ها انجام نشد", 500);
  }
}
