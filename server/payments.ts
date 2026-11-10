import { createCipheriv } from "node:crypto";
import { config } from "./config";

/**
 * Gateway adapters. Security rules applied by the caller (app.ts):
 *  - the amount always comes from the database order, never from the client;
 *  - a payment is marked paid only after a server-to-server verify succeeds
 *    AND the verified amount equals the expected amount;
 *  - settlement runs in a row-locked transaction and is idempotent;
 *  - a bank reference can settle only one payment (unique index).
 */
export type GatewayId = "zarinpal" | "zibal" | "sep" | "sadad";
export type GatewayMode = "sandbox" | "production";
export type Creds = Record<string, string>;

export type StartInput = { paymentId: number; amountToman: number; callbackUrl: string; mobile: string; description: string; creds: Creds; mode: GatewayMode };
export type StartResult = { authority: string; redirectUrl: string };
export type CallbackInfo = { success: boolean; authority: string | null; reference: string | null };
export type VerifyInput = { paymentId: number; amountToman: number; authority: string; reference: string | null; creds: Creds; mode: GatewayMode };
export type VerifyResult = { ok: boolean; refId: string | null; cardPan: string | null; message: string; raw: unknown };

export const GATEWAY_NAMES: Record<GatewayId, string> = { zarinpal: "زرین‌پال", zibal: "زیبال", sep: "سپ (بانک سامان)", sadad: "سداد بانک ملی" };
export const REQUIRED_FIELDS: Record<GatewayId, string[]> = {
  zarinpal: ["merchantId"],
  zibal: ["merchantId"],
  sep: ["terminalId"],
  sadad: ["merchantId", "terminalId", "secretKey"],
};
/** Hosts the browser is allowed to be redirected to. */
export const REDIRECT_HOSTS = ["payment.zarinpal.com", "sandbox.zarinpal.com", "www.zarinpal.com", "gateway.zibal.ir", "sep.shaparak.ir", "sadad.shaparak.ir"];

class GatewayError extends Error {}

/** In tests (never production) every gateway URL is rewritten to a local mock server. */
function url(gateway: GatewayId, real: string) {
  if (!config.paymentTestBase) return real;
  const parsed = new URL(real);
  return `${config.paymentTestBase.replace(/\/$/, "")}/${gateway}${parsed.pathname}${parsed.search}`;
}

async function postJson(target: string, body: unknown): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new GatewayError("ارتباط با درگاه برقرار نشد");
  }
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") throw new GatewayError(`پاسخ نامعتبر از درگاه (HTTP ${response.status})`);
  return data;
}

const toRial = (toman: number) => toman * 10;
const str = (v: unknown) => (v === undefined || v === null ? null : String(v));

/* -------------------------------- Zarinpal -------------------------------- */
const zarinpalBase = (mode: GatewayMode) => (mode === "sandbox" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com");

/* --------------------------------- Sadad ---------------------------------- */
// SignData = Base64(TripleDES-ECB-PKCS7(data, Base64Decode(TerminalKey)))
function sadadSign(data: string, keyB64: string) {
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 24 && key.length !== 16) throw new GatewayError("کلید ترمینال سداد معتبر نیست");
  const cipher = createCipheriv(key.length === 24 ? "des-ede3" : "des-ede", key, null);
  return Buffer.concat([cipher.update(data, "utf8"), cipher.final()]).toString("base64");
}

export const gateways: Record<GatewayId, {
  start(input: StartInput): Promise<StartResult>;
  parseCallback(params: Record<string, string>): CallbackInfo;
  verify(input: VerifyInput): Promise<VerifyResult>;
}> = {
  zarinpal: {
    async start({ amountToman, callbackUrl, mobile, description, creds, mode }) {
      const data = await postJson(url("zarinpal", `${zarinpalBase(mode)}/pg/v4/payment/request.json`), {
        merchant_id: creds.merchantId, amount: amountToman, currency: "IRT", description, callback_url: callbackUrl, metadata: { mobile },
      });
      const d = data.data as Record<string, unknown> | undefined;
      if (!d || Number(d.code) !== 100 || typeof d.authority !== "string") throw new GatewayError("درخواست پرداخت زرین‌پال رد شد");
      return { authority: d.authority, redirectUrl: url("zarinpal", `${zarinpalBase(mode)}/pg/StartPay/${encodeURIComponent(d.authority)}`) };
    },
    parseCallback: (p) => ({ success: p.Status === "OK", authority: p.Authority ?? null, reference: null }),
    async verify({ amountToman, authority, creds, mode }) {
      const data = await postJson(url("zarinpal", `${zarinpalBase(mode)}/pg/v4/payment/verify.json`), { merchant_id: creds.merchantId, amount: amountToman, authority });
      const d = data.data as Record<string, unknown> | undefined;
      const code = Number(d?.code);
      // 100 = verified now, 101 = already verified earlier (idempotent retry).
      if (d && (code === 100 || code === 101)) return { ok: true, refId: str(d.ref_id), cardPan: str(d.card_pan), message: "OK", raw: data };
      return { ok: false, refId: null, cardPan: null, message: "تأیید پرداخت زرین‌پال ناموفق بود", raw: data };
    },
  },

  zibal: {
    async start({ paymentId, amountToman, callbackUrl, mobile, description, creds, mode }) {
      const data = await postJson(url("zibal", "https://gateway.zibal.ir/v1/request"), {
        merchant: mode === "sandbox" ? "zibal" : creds.merchantId, amount: toRial(amountToman), callbackUrl, orderId: String(paymentId), mobile, description,
      });
      if (Number(data.result) !== 100 || !data.trackId) throw new GatewayError("درخواست پرداخت زیبال رد شد");
      const trackId = String(data.trackId);
      return { authority: trackId, redirectUrl: url("zibal", `https://gateway.zibal.ir/start/${encodeURIComponent(trackId)}`) };
    },
    parseCallback: (p) => ({ success: p.success === "1", authority: p.trackId ?? null, reference: null }),
    async verify({ amountToman, authority, creds, mode }) {
      const data = await postJson(url("zibal", "https://gateway.zibal.ir/v1/verify"), { merchant: mode === "sandbox" ? "zibal" : creds.merchantId, trackId: Number(authority) });
      const result = Number(data.result);
      // 100 = verified, 201 = already verified.
      if ((result === 100 || result === 201) && Number(data.amount) === toRial(amountToman)) {
        return { ok: true, refId: str(data.refNumber), cardPan: str(data.cardNumber), message: "OK", raw: data };
      }
      return { ok: false, refId: null, cardPan: null, message: result === 100 ? "مبلغ تأییدشده با سفارش برابر نیست" : "تأیید پرداخت زیبال ناموفق بود", raw: data };
    },
  },

  sep: {
    async start({ paymentId, amountToman, callbackUrl, mobile, creds }) {
      const data = await postJson(url("sep", "https://sep.shaparak.ir/onlinepg/onlinepg"), {
        action: "token", TerminalId: creds.terminalId, Amount: toRial(amountToman), ResNum: String(paymentId), RedirectUrl: callbackUrl, CellNumber: mobile,
      });
      if (Number(data.status) !== 1 || typeof data.token !== "string") throw new GatewayError(`درخواست توکن سپ رد شد${data.errorDesc ? `: ${String(data.errorDesc)}` : ""}`);
      return { authority: data.token, redirectUrl: url("sep", `https://sep.shaparak.ir/OnlinePG/SendToken?token=${encodeURIComponent(data.token)}`) };
    },
    // Status 2 = success. ResNum is our payment id; RefNum is SEP's digital receipt.
    parseCallback: (p) => ({ success: p.State === "OK" && p.Status === "2", authority: p.Token ?? null, reference: p.RefNum ?? null }),
    async verify({ paymentId, amountToman, reference, creds }) {
      if (!reference) return { ok: false, refId: null, cardPan: null, message: "رسید دیجیتال سپ دریافت نشد", raw: null };
      const body = { RefNum: reference, TerminalNumber: Number(creds.terminalId) };
      const data = await postJson(url("sep", "https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction"), body);
      const detail = data.TransactionDetail as Record<string, unknown> | undefined;
      const success = data.Success === true || Number(data.ResultCode) === 0;
      if (success && detail && Number(detail.OrginalAmount) === toRial(amountToman)) {
        return { ok: true, refId: reference, cardPan: str(detail.MaskedPan), message: "OK", raw: data };
      }
      if (success) {
        // Verified but wrong amount: reverse immediately so the customer is refunded.
        await postJson(url("sep", "https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/ReverseTransaction"), body).catch(() => null);
        return { ok: false, refId: null, cardPan: null, message: `مبلغ تراکنش ${paymentId} مغایرت داشت و برگشت داده شد`, raw: data };
      }
      return { ok: false, refId: null, cardPan: null, message: "تأیید پرداخت سپ ناموفق بود", raw: data };
    },
  },

  sadad: {
    async start({ paymentId, amountToman, callbackUrl, mobile, creds }) {
      const amount = toRial(amountToman);
      const data = await postJson(url("sadad", "https://sadad.shaparak.ir/vpg/api/v0/Request/PaymentRequest"), {
        MerchantId: creds.merchantId, TerminalId: creds.terminalId, Amount: amount, OrderId: paymentId,
        LocalDateTime: new Date().toISOString(), ReturnUrl: callbackUrl, UserId: mobile,
        SignData: sadadSign(`${creds.terminalId};${paymentId};${amount}`, creds.secretKey),
      });
      if (Number(data.ResCode) !== 0 || typeof data.Token !== "string") throw new GatewayError(`درخواست پرداخت سداد رد شد${data.Description ? `: ${String(data.Description)}` : ""}`);
      return { authority: data.Token, redirectUrl: url("sadad", `https://sadad.shaparak.ir/VPG/Purchase?Token=${encodeURIComponent(data.Token)}`) };
    },
    parseCallback: (p) => ({ success: p.ResCode === "0", authority: p.token ?? p.Token ?? null, reference: p.OrderId ?? null }),
    async verify({ paymentId, amountToman, authority, reference, creds }) {
      if (reference !== null && reference !== String(paymentId)) return { ok: false, refId: null, cardPan: null, message: "شناسه سفارش سداد مطابقت ندارد", raw: null };
      const data = await postJson(url("sadad", "https://sadad.shaparak.ir/vpg/api/v0/Advice/Verify"), { Token: authority, SignData: sadadSign(authority, creds.secretKey) });
      if (Number(data.ResCode) === 0 && Number(data.Amount) === toRial(amountToman) && String(data.OrderId) === String(paymentId)) {
        return { ok: true, refId: str(data.RetrivalRefNo) ?? str(data.SystemTraceNo), cardPan: null, message: "OK", raw: data };
      }
      return { ok: false, refId: null, cardPan: null, message: "تأیید پرداخت سداد ناموفق بود", raw: data };
    },
  },
};

export function isGatewayError(error: unknown): error is GatewayError {
  return error instanceof GatewayError;
}
