import { getSecret, type GatewayConfig, type GatewayId } from "./control-center";
import md5 from "blueimp-md5";

/* ------------------------------------------------------------------ *
 * Real payment-gateway start handlers, following each provider's
 * public Web Service documentation:
 *
 *  • Zarinpal (zap.ir): POST /apiv2 {amount(IRT), description,
 *    refundUrl, callbackUrl, merchantId} → {authority, trackableId}
 *    then redirect to ibp.zarinpal.com/pg/StartPay/{authority}.
 *    Sandbox host: sandbox.zap.ir.
 *
 *  • Bank Mellat — Pay Iran (Web Service): SOAP-ish XML
 *    PaymentStartRequest to bpm.shaparak.ir/PgwBand/StartPay with
 *    Amount, MerchantID, TerminalID, UserName, Password,
 *    MD5("UserName:Password"), VerNumber, ReferenceID.
 *    On success (Result=100) the shopper is redirected to
 *    bpm.shaparak.ir/PgwBand/StartPay/Track/{PaymentId}.
 *
 *  The merchant callback receives the bank's payment result
 *  (Zarinpal: Status/Authority/MerchantId/TrNumber — Mellat:
 *  PaymentResultNotification with Result/PaymentId/RefNum/Amount).
 * ------------------------------------------------------------------ */

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string);
}

export type StartPayResult = { url: string; reference?: string };

/** Zarinpal — start payment per zap.ir/apiv2 docs. Amount is in IRT (تومان). */
export async function zarinpalStartPay(opts: {
  merchantId: string;
  amountIRT: number;
  sandbox?: boolean;
  callbackUrl?: string;
  refundUrl?: string;
  description?: string;
}): Promise<StartPayResult> {
  if (!opts.merchantId.trim()) throw new Error("مرچنت کد زرین‌پال در پنل مدیریت ثبت نشده است.");
  const apiHost = opts.sandbox ? "https://sandbox.zap.ir" : "https://zap.ir";
  const payHost = opts.sandbox ? "https://sandbox.zap.ir/pg/StartPay" : "https://ibp.zarinpal.com/pg/StartPay";
  const res = await fetch(`${apiHost}/apiv2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(opts.amountIRT),
      description: opts.description ?? "سفارش 50500.shop",
      refundUrl: opts.refundUrl ?? `${window.location.origin}/#/`,
      callbackUrl: opts.callbackUrl ?? `${window.location.origin}/#/pay/callback`,
      merchantId: opts.merchantId.trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.authority) {
    throw new Error(data?.message?.fa || data?.error || `درخواست به درگاه زرین‌پال ناموفق بود (HTTP ${res.status})`);
  }
  return { url: `${payHost}/${data.authority}`, reference: String(data.authority) };
}

/** Bank Mellat — Pay Iran Web Service PaymentStartRequest. Amount in IRT (تومان). */
export async function mellatStartPay(opts: {
  merchantId: string;
  terminalId?: string;
  userName: string;
  password: string;
  amountIRT: number;
  referenceId?: string;
}): Promise<StartPayResult> {
  if (!opts.merchantId.trim()) throw new Error("شناسه پذیرنده (MerchantID) بانک ملت در پنل مدیریت ثبت نشده است.");
  if (!opts.userName.trim() || !opts.password) throw new Error("نام کاربری و رمز وب‌سرویس بانک ملت در پنل مدیریت ثبت نشده است.");
  // Docs: MD5 of "UserName:PassWord" (colon-separated) is the signature.
  const signature = md5(`${opts.userName}:${opts.password}`);
  const refId = opts.referenceId ?? `50500${Date.now()}`;
  const verNumber = Date.now();
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.w3.org/2003/05/soap-envelope" xmlns:pay="http://bpm.shaparak.ir">
 <soapenv:Body>
  <pay:PaymentStartRequest>
   <Amount>${Math.round(opts.amountIRT)}</Amount>
   <MerchantID>${xmlEscape(opts.merchantId.trim())}</MerchantID>
   <TerminalID>${xmlEscape(opts.terminalId ?? "")}</TerminalID>
   <UserName>${xmlEscape(opts.userName)}</UserName>
   <Password>${xmlEscape(opts.password)}</Password>
   <MD5>${signature}</MD5>
   <VerNumber>${verNumber}</VerNumber>
   <ReferenceID>${xmlEscape(refId)}</ReferenceID>
  </pay:PaymentStartRequest>
 </soapenv:Body>
</soapenv:Envelope>`;
  const res = await fetch("https://bpm.shaparak.ir/PgwBand/StartPay", {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: xml,
  });
  const text = await res.text();
  const result = text.match(/<Result>([^<]*)<\/Result>/)?.[1]?.trim() ?? "";
  const paymentId = text.match(/<PaymentId>([^<]*)<\/PaymentId>/)?.[1]?.trim() ?? "";
  if (result !== "100" || !paymentId) {
    throw new Error(result === "100" ? "درگاه ملت شناسه پرداخت صادر نکرد" : `درگاه بانک ملت پاسخ داد: کد ${result}`);
  }
  return { url: `https://bpm.shaparak.ir/PgwBand/StartPay/Track/${paymentId}`, reference: paymentId };
}

/** Dispatches to the correct provider for an enabled gateway configuration. */
export async function startGatewayPay(gateway: GatewayConfig, amountIRT: number): Promise<StartPayResult> {
  const fields = gateway.fields ?? {};
  const sandbox = gateway.mode === "sandbox";
  switch (gateway.id as GatewayId) {
    case "zarinpal":
      return zarinpalStartPay({
        merchantId: fields.merchantId ?? "",
        amountIRT,
        sandbox,
        callbackUrl: gateway.callbackUrl || undefined,
      });
    case "mellat": {
      const password = getSecret(gateway.id, "password");
      return mellatStartPay({
        merchantId: fields.merchantId ?? "",
        terminalId: fields.terminalId,
        userName: fields.userName ?? "",
        password,
        amountIRT,
      });
    }
    case "sadad":
      throw new Error("درگاه سداد در این نسخه هنوز پیوند زنده ندارد؛ برای شروع درگاه، زرین‌پال یا پرداخت ملت را فعال کنید.");
    case "sep":
      throw new Error("درگاه سپ (سامان) در این نسخه هنوز پیوند زنده ندارد؛ برای شروع درگاه، زرین‌پال یا پرداخت ملت را فعال کنید.");
    case "zibal":
      throw new Error("درگاه زیبال در این نسخه هنوز پیوند زنده ندارد؛ برای شروع درگاه، زرین‌پال یا پرداخت ملت را فعال کنید.");
    default:
      throw new Error("این درگاه از شروع پرداخت آنلاین پشتیبانی نمی‌کند.");
  }
}

/** Gateways that can start a live online payment from the Pay page. */
export const LIVE_GATEWAY_IDS: GatewayId[] = ["zarinpal", "mellat"];
