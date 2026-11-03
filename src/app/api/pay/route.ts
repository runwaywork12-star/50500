import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { orders } from "@/db/schema";
import { getEnabledGateways, startOnlinePayment, type GatewayId } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureDb();
  const body = (await req.json().catch(() => null)) as { code?: unknown; result?: unknown; gateway?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.slice(0, 20) : "";
  if (!code) return Response.json({ error: "کد سفارش نامعتبر است" }, { status: 400 });

  // New flow: start a real gateway payment → { mode: 'redirect'|'page'|'manual', ... }
  if (typeof body?.gateway === "string" && body.gateway) {
    const gateway = body.gateway as GatewayId;
    if (!["sandbox", "zarinpal", "zibal", "manual"].includes(gateway)) {
      return Response.json({ error: "درگاه نامعتبر است" }, { status: 400 });
    }
    const [order] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
    if (!order) return Response.json({ error: "سفارش پیدا نشد" }, { status: 404 });
    if (order.paymentMethod !== "online") return Response.json({ error: "این سفارش پرداخت اینترنتی ندارد" }, { status: 400 });
    if (order.paymentStatus === "paid") return Response.json({ ok: true, mode: "paid" });
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    try {
      const started = await startOnlinePayment(order, gateway, `${proto}://${host}`);
      return Response.json({ ok: true, ...started });
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "خطا در اتصال به درگاه" }, { status: 502 });
    }
  }

  // Development-only simulator. It is unavailable in production and unless explicitly enabled.
  if (process.env.NODE_ENV !== "production" && body?.result === "success") {
    const enabled = await getEnabledGateways();
    if (!enabled.some((item) => item.id === "sandbox")) return Response.json({ error: "درگاه آزمایشی فعال نیست" }, { status: 403 });
    const [order] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
    if (!order) return Response.json({ error: "سفارش پیدا نشد" }, { status: 404 });
    if (order.paymentMethod !== "online") return Response.json({ error: "این سفارش پرداخت اینترنتی ندارد" }, { status: 400 });
    if (order.paymentStatus === "paid") return Response.json({ ok: true, status: "paid" });
    await db.update(orders).set({ paymentStatus: "paid", status: order.status === "pending" ? "confirmed" : order.status, updatedAt: new Date() })
      .where(and(eq(orders.id, order.id), inArray(orders.paymentStatus, ["pending", "failed"])));
    return Response.json({ ok: true, status: "paid", sandbox: true });
  }
  return Response.json({ error: "روش پرداخت نامعتبر است؛ درگاه پرداخت را انتخاب کنید" }, { status: 400 });
}
