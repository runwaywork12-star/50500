import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { orders, payments } from "@/db/schema";
import { isAdminPermission, isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });

/** Confirm a manually transferred payment only after an admin has checked the bank receipt. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  if (!(await isAdminPermission("payments:write"))) return bad("برای تأیید واریز، مجوز مدیریت پرداخت لازم است", 403);
  await ensureDb();
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) return bad("شناسه سفارش نامعتبر است");

  try {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.status === "cancelled") throw new Error("ORDER_CANCELLED");
      if (order.paymentStatus === "paid") throw new Error("ALREADY_PAID");
      if (order.paymentMethod !== "online") throw new Error("NOT_ONLINE_ORDER");

      const [attempt] = await tx.select().from(payments)
        .where(and(eq(payments.orderId, orderId), eq(payments.gateway, "manual"), eq(payments.status, "awaiting_transfer")))
        .orderBy(desc(payments.id)).limit(1);
      if (!attempt) throw new Error("NO_PENDING_TRANSFER");
      if (attempt.amount !== order.total) throw new Error("AMOUNT_MISMATCH");

      await tx.update(payments).set({
        status: "paid",
        raw: { confirmedByAdmin: true, confirmedAt: new Date().toISOString(), note: "Manual bank transfer checked by an administrator" },
        updatedAt: new Date(),
      }).where(eq(payments.id, attempt.id));
      await tx.update(orders).set({
        paymentStatus: "paid",
        status: order.status === "pending" ? "confirmed" : order.status,
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") return bad("سفارش پیدا نشد", 404);
    if (code === "ORDER_CANCELLED") return bad("سفارش لغو شده است؛ ابتدا وضعیت سفارش و واریز را بررسی کنید", 409);
    if (code === "ALREADY_PAID") return bad("این سفارش قبلاً پرداخت‌شده ثبت شده است", 409);
    if (code === "NOT_ONLINE_ORDER") return bad("این عملیات فقط برای سفارش‌های پرداخت آنلاین/کارت‌به‌کارت است", 409);
    if (code === "NO_PENDING_TRANSFER") return bad("برای این سفارش واریز کارت‌به‌کارت در انتظار تأیید پیدا نشد", 409);
    if (code === "AMOUNT_MISMATCH") return bad("مبلغ واریز ثبت‌شده با مبلغ سفارش یکسان نیست", 409);
    throw error;
  }
  return Response.json({ ok: true });
}
