import type { GatewayConfig, GatewayId } from "./control-center";

/* ------------------------------------------------------------------ *
 * Payment-gateway handlers.
 *
 *  • Zarinpal — current REST API (v4, zarinpal.com/docs):
 *      POST …/pg/v4/payment/request.json  → data.authority
 *      redirect to …/pg/StartPay/{authority}
 *      after the bank returns (?Authority=…&Status=OK) →
 *      POST …/pg/v4/payment/verify.json   → data.code 100 | 101
 *    Amounts are sent with currency "IRT" (تومان).
 *
 *  • Bank Mellat (Pay Iran) — PaymentStartRequest must be signed with the
 *    web-service password and called server-to-server. A browser cannot
 *    make that call safely (password exposure + CORS), so it is only
 *    reachable through the 50500 API server (server/src).
 * ------------------------------------------------------------------ */

export type StartPayResult = { url: string; reference?: string };

const ZARINPAL_API = { live: "https://payment.zarinpal.com/pg/v4/payment", sandbox: "https://sandbox.zarinpal.com/pg/v4/payment" };
const ZARINPAL_START = { live: "https://www.zarinpal.com/pg/StartPay", sandbox: "https://sandbox.zarinpal.com/pg/StartPay" };

type ZarinpalEnvelope = { data?: { code?: number; message?: string; authority?: string; ref_id?: number | string }; errors?: unknown };

async function zarinpalPost(url: string, body: Record<string, unknown>): Promise<ZarinpalEnvelope> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("اتصال به زرین‌پال برقرار نشد. این درگاه باید از طریق سرور 50500 فراخوانی شود.");
  }
  const json = (await res.json().catch(() => ({}))) as ZarinpalEnvelope;
  return json;
}

/** Zarinpal v4 — start payment. `amountIRT` is in تومان. */
export async function zarinpalStartPay(opts: {
  merchantId: string;
  amountIRT: number;
  sandbox?: boolean;
  callbackUrl?: string;
  description?: string;
  orderCode?: string;
}): Promise<StartPayResult> {
  const merchantId = opts.merchantId.trim();
  if (!merchantId) throw new Error("مرچنت کد زرین‌پال در پنل مدیریت ثبت نشده است.");
  const base = opts.sandbox ? ZARINPAL_API.sandbox : ZARINPAL_API.live;
  const json = await zarinpalPost(`${base}/request.json`, {
    merchant_id: merchantId,
    amount: Math.round(opts.amountIRT),
    currency: "IRT",
    description: opts.description ?? "سفارش 50500.shop",
    callback_url: opts.callbackUrl ?? `${window.location.origin}/#/pay/callback`,
    metadata: opts.orderCode ? { order_id: opts.orderCode } : {},
  });
  const authority = json.data?.authority;
  if (json.data?.code !== 100 || !authority) {
    const reason = json.data?.message ?? (Array.isArray(json.errors) && json.errors.length ? "خطای زرین‌پال" : "پاسخ نامعتبر");
    throw new Error(`درخواست پرداخت زرین‌پال ناموفق بود: ${reason}`);
  }
  return { url: `${opts.sandbox ? ZARINPAL_START.sandbox : ZARINPAL_START.live}/${authority}`, reference: authority };
}

/** Zarinpal v4 — verify a returned payment. Returns the bank reference on success. */
export async function zarinpalVerify(opts: {
  merchantId: string;
  amountIRT: number;
  authority: string;
  sandbox?: boolean;
}): Promise<{ ok: true; refId: string } | { ok: false; error: string }> {
  const base = opts.sandbox ? ZARINPAL_API.sandbox : ZARINPAL_API.live;
  const json = await zarinpalPost(`${base}/verify.json`, {
    merchant_id: opts.merchantId.trim(),
    amount: Math.round(opts.amountIRT),
    currency: "IRT",
    authority: opts.authority,
  });
  // 100 = verified now, 101 = already verified (idempotent success).
  if (json.data?.code === 100 || json.data?.code === 101) {
    return { ok: true, refId: String(json.data?.ref_id ?? opts.authority) };
  }
  return { ok: false, error: json.data?.message ?? "تأیید پرداخت ناموفق بود." };
}

/** Bank Mellat — not callable from the browser (see header). */
export async function mellatStartPay(): Promise<StartPayResult> {
  throw new Error("پرداخت ملت باید از طریق سرور 50500 انجام شود؛ در این نسخهٔ مرورگری فعال نیست.");
}

/** Dispatches to the correct provider for an enabled gateway configuration. */
export async function startGatewayPay(gateway: GatewayConfig, amountIRT: number, orderCode?: string): Promise<StartPayResult> {
  const fields = gateway.fields ?? {};
  const sandbox = gateway.mode === "sandbox";
  switch (gateway.id as GatewayId) {
    case "zarinpal":
      return zarinpalStartPay({
        merchantId: fields.merchantId ?? "",
        amountIRT,
        sandbox,
        callbackUrl: gateway.callbackUrl || undefined,
        orderCode,
      });
    case "mellat":
      return mellatStartPay();
    default:
      throw new Error("این درگاه در نسخهٔ مرورگری پشتیبانی نمی‌شود؛ از زرین‌پال یا پرداخت کارت‌به‌کارت استفاده کنید.");
  }
}

/** Gateways that can start a live payment directly from the browser. */
export const LIVE_GATEWAY_IDS: GatewayId[] = ["zarinpal"];
