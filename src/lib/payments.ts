import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { orders, payments } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getSetting } from "./settings";

export type GatewayId = "sandbox" | "zarinpal" | "zibal" | "manual";

export const GATEWAY_META: Record<GatewayId, { name: string; desc: string }> = {
  sandbox: { name: "درگاه آزمایشی", desc: "شبیه‌ساز پرداخت (بدون کسر مبلغ)" },
  zarinpal: { name: "زرین‌پال", desc: "پرداخت امن اینترنتی" },
  zibal: { name: "زیبال", desc: "پرداخت امن اینترنتی" },
  manual: { name: "واریز کارت‌به‌کارت", desc: "واریز مستقیم و اعلام فیش" },
};

export type EnabledGateway = { id: GatewayId; name: string; desc: string; cardNumber?: string; cardOwner?: string };

export async function getEnabledGateways(): Promise<EnabledGateway[]> {
  const list: EnabledGateway[] = [];
  if (process.env.NODE_ENV !== "production" && (await getSetting("payments.sandbox_enabled")) === "true") {
    list.push({ id: "sandbox", ...GATEWAY_META.sandbox });
  }
  if ((await getSetting("payments.zarinpal_enabled")) === "true") {
    const merchant = await getSetting("payments.zarinpal_merchant");
    if (merchant.trim()) list.push({ id: "zarinpal", ...GATEWAY_META.zarinpal });
  }
  if ((await getSetting("payments.zibal_enabled")) === "true") {
    const merchant = await getSetting("payments.zibal_merchant");
    if (merchant.trim()) list.push({ id: "zibal", ...GATEWAY_META.zibal });
  }
  if ((await getSetting("payments.manual_enabled")) === "true") {
    list.push({
      id: "manual",
      ...GATEWAY_META.manual,
      cardNumber: await getSetting("payments.manual_card"),
      cardOwner: await getSetting("payments.manual_owner"),
    });
  }
  // Never silently enable a no-money sandbox when no real gateway is configured.
  return list;
}

type OrderRow = typeof orders.$inferSelect;

async function savePayment(data: typeof payments.$inferInsert) {
  const [row] = await db.insert(payments).values(data).returning();
  return row;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

export type StartResult =
  | { mode: "page" }
  | { mode: "redirect"; payUrl: string }
  | { mode: "manual"; cardNumber: string; cardOwner: string; amount: number };

export async function startOnlinePayment(order: OrderRow, gateway: GatewayId, baseUrl: string): Promise<StartResult> {
  await ensureDb();
  const enabled = await getEnabledGateways();
  if (!enabled.some((g) => g.id === gateway)) throw new Error("این درگاه فعال نیست");

  if (gateway === "sandbox") {
    if (process.env.NODE_ENV === "production") throw new Error("درگاه آزمایشی در محیط عملیاتی غیرفعال است");
    return { mode: "page" };
  }

  if (gateway === "manual") {
    const cardNumber = await getSetting("payments.manual_card");
    const cardOwner = await getSetting("payments.manual_owner");
    if (!cardNumber.trim()) throw new Error("شماره کارت در تنظیمات ثبت نشده است");
    await savePayment({ orderId: order.id, orderCode: order.code, gateway, amount: order.total, status: "awaiting_transfer", raw: {} });
    return { mode: "manual", cardNumber, cardOwner, amount: order.total };
  }

  if (gateway === "zarinpal") {
    const merchant = (await getSetting("payments.zarinpal_merchant")).trim();
    const sandbox = (await getSetting("payments.zarinpal_sandbox")) === "true";
    const host = sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
    const merchantId = merchant || (sandbox ? "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" : "");
    if (!merchantId) throw new Error("مرچنت کد زرین‌پال ثبت نشده است");
    const { ok, data } = await postJson(`${host}/pg/v4/payment/request.json`, {
      merchant_id: merchantId,
      amount: order.total,
      currency: "IRT",
      callback_url: `${baseUrl}/api/pay/callback/zarinpal?order=${order.code}`,
      description: `سفارش ${order.code} فروشگاه 50500`,
      metadata: { mobile: order.phone, order_id: order.code },
    });
    const inner = (data?.data ?? {}) as { code?: number; authority?: string; message?: string };
    if (!ok || inner.code !== 100 || !inner.authority) {
      throw new Error(typeof inner.message === "string" && inner.message ? `خطای زرین‌پال: ${inner.message}` : "خطا در اتصال به زرین‌پال");
    }
    await savePayment({ orderId: order.id, orderCode: order.code, gateway, amount: order.total, authority: inner.authority, status: "pending", raw: data as Record<string, unknown> });
    const payHost = sandbox ? "https://sandbox.zarinpal.com" : "https://www.zarinpal.com";
    return { mode: "redirect", payUrl: `${payHost}/pg/StartPay/${inner.authority}` };
  }

  // zibal (amounts in Rial)
  const merchant = (await getSetting("payments.zibal_merchant")).trim();
  if (!merchant) throw new Error("مرچنت زیبال ثبت نشده است");
  const { ok, data } = await postJson("https://gateway.zibal.ir/v1/request", {
    merchant,
    amount: order.total * 10,
    callbackUrl: `${baseUrl}/api/pay/callback/zibal?order=${order.code}`,
    orderId: order.code,
    mobile: order.phone,
    description: `سفارش ${order.code} فروشگاه 50500`,
  });
  const result = Number(data?.result);
  const trackId = String(data?.trackId ?? "");
  if (!ok || result !== 100 || !trackId) {
    throw new Error(typeof data?.message === "string" && data.message ? `خطای زیبال: ${data.message}` : "خطا در اتصال به زیبال");
  }
  await savePayment({ orderId: order.id, orderCode: order.code, gateway, amount: order.total, authority: trackId, status: "pending", raw: data as Record<string, unknown> });
  return { mode: "redirect", payUrl: `https://gateway.zibal.ir/start/${trackId}` };
}

export type VerifyResult = { ok: boolean; refId?: string; cardPan?: string; orderCancelled?: boolean; message: string };

async function markPaid(order: OrderRow, paymentId: number, refId: string, cardPan: string, raw: Record<string, unknown>): Promise<boolean> {
  // Serialize against unpaid-order expiry and admin cancellation. Record a verified
  // charge, but never resurrect an order that has already been cancelled.
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, order.id)).for("update").limit(1);
    if (!current) throw new Error("ORDER_NOT_FOUND");

    await tx.update(payments)
      .set({ status: "paid", refId, cardPan, raw, updatedAt: new Date() })
      .where(eq(payments.id, paymentId));

    if (current.status === "cancelled") {
      await tx.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, current.id));
      return true;
    }

    await tx.update(orders)
      .set({ paymentStatus: "paid", status: current.status === "pending" ? "confirmed" : current.status, updatedAt: new Date() })
      .where(and(eq(orders.id, current.id), inArray(orders.paymentStatus, ["pending", "failed"])));
    return false;
  });
}

async function markFailed(paymentId: number | null, order: OrderRow, raw: Record<string, unknown>) {
  if (paymentId) await db.update(payments).set({ status: "failed", raw, updatedAt: new Date() }).where(eq(payments.id, paymentId));
  await db.update(orders).set({ paymentStatus: "failed", updatedAt: new Date() }).where(and(eq(orders.id, order.id), eq(orders.paymentStatus, "pending")));
}

export async function verifyCallback(gateway: Exclude<GatewayId, "sandbox" | "manual">, order: OrderRow, params: URLSearchParams): Promise<VerifyResult> {
  await ensureDb();
  const callbackReference = gateway === "zarinpal" ? (params.get("Authority") || "") : (params.get("trackId") || "");
  if (!callbackReference) return { ok: false, message: "شناسه تراکنش در پاسخ درگاه وجود ندارد" };
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, order.id), eq(payments.gateway, gateway), eq(payments.authority, callbackReference), inArray(payments.status, ["pending", "failed"])))
    .limit(1);
  if (!payment) return { ok: false, message: "تراکنش متناظر با پاسخ درگاه یافت نشد" };

  if (gateway === "zarinpal") {
    const authority = params.get("Authority") || "";
    const status = params.get("Status") || "";
    if (status !== "OK" || !authority) {
      await markFailed(payment.id, order, { cancelled: true });
      return { ok: false, message: "پرداخت توسط شما لغو شد" };
    }
    if (authority !== payment.authority) {
      await markFailed(payment.id, order, { mismatch: true });
      return { ok: false, message: "اطلاعات بازگشتی معتبر نیست" };
    }
    const merchant = (await getSetting("payments.zarinpal_merchant")).trim();
    const sandbox = (await getSetting("payments.zarinpal_sandbox")) === "true";
    const host = sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
    const merchantId = merchant || (sandbox ? "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" : "");
    const { ok, data } = await postJson(`${host}/pg/v4/payment/verify.json`, { merchant_id: merchantId, amount: order.total, currency: "IRT", authority });
    const inner = (data?.data ?? {}) as { code?: number; ref_id?: number | string; card_pan?: string };
    if (ok && (inner.code === 100 || inner.code === 101) && inner.ref_id) {
      const refId = String(inner.ref_id);
      const orderCancelled = await markPaid(order, payment.id, refId, String(inner.card_pan ?? ""), data as Record<string, unknown>);
      return orderCancelled
        ? { ok: true, refId, orderCancelled: true, message: "پرداخت تأیید شد اما سفارش قبلاً لغو شده است؛ بازپرداخت باید بررسی شود" }
        : { ok: true, refId, message: "پرداخت با موفقیت انجام شد" };
    }
    await markFailed(payment.id, order, data as Record<string, unknown>);
    return { ok: false, message: "تایید پرداخت ناموفق بود؛ مبلغ (در صورت کسر) به حساب شما بازمی‌گردد" };
  }

  // zibal
  const success = params.get("success");
  const trackId = params.get("trackId") || "";
  if (success !== "1" || !trackId) {
    await markFailed(payment.id, order, { cancelled: true });
    return { ok: false, message: "پرداخت توسط شما لغو شد" };
  }
  if (trackId !== payment.authority) {
    await markFailed(payment.id, order, { mismatch: true });
    return { ok: false, message: "اطلاعات بازگشتی معتبر نیست" };
  }
  const merchant = (await getSetting("payments.zibal_merchant")).trim();
  const { ok, data } = await postJson("https://gateway.zibal.ir/v1/verify", { merchant, trackId });
  const result = Number(data?.result);
  // Zibal amounts are returned in Rial; our order totals and saved payment amounts are Toman.
  // Fail closed if the verification response does not contain the expected amount.
  const verifiedAmount = Number(data?.amount);
  const expectedAmount = order.total * 10;
  if (ok && (result === 100 || result === 201) && data?.refNumber &&
      Number.isFinite(verifiedAmount) && verifiedAmount === expectedAmount &&
      payment.amount === order.total) {
    const refId = String(data.refNumber);
    const orderCancelled = await markPaid(order, payment.id, refId, String((data as Record<string, unknown>).cardNumber ?? ""), data as Record<string, unknown>);
    return orderCancelled
      ? { ok: true, refId, orderCancelled: true, message: "پرداخت تأیید شد اما سفارش قبلاً لغو شده است؛ بازپرداخت باید بررسی شود" }
      : { ok: true, refId, message: "پرداخت با موفقیت انجام شد" };
  }
  await markFailed(payment.id, order, data as Record<string, unknown>);
  return { ok: false, message: "تایید پرداخت ناموفق بود" };
}

export async function getPayments(limit = 80) {
  await ensureDb();
  const { desc } = await import("drizzle-orm");
  return db.select().from(payments).orderBy(desc(payments.id)).limit(limit);
}
