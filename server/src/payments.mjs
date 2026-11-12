import crypto from "node:crypto";
import { q, tx } from "./db.mjs";
import { decryptSecret, encryptSecret } from "./security.mjs";

/**
 * Money rule #1: the amount ALWAYS comes from the database, never the browser.
 * Money rule #2: a redirect back from the bank is not proof of payment — the
 *                server must verify (and for Mellat, settle) before marking paid.
 */

export async function loadGateway(id) {
  const { rows } = await q("SELECT value FROM settings WHERE key=$1", [`gateway:${id}`]);
  return rows[0]?.value ?? null;
}
export async function saveGateway(id, cfg, secrets = {}) {
  const vault = { ...cfg };
  for (const [k, v] of Object.entries(secrets)) if (v) vault[`enc_${k}`] = encryptSecret(v);
  await q(
    "INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, at=now()",
    [`gateway:${id}`, JSON.stringify(vault)],
  );
}
const readSecret = (cfg, key) => (cfg?.[`enc_${key}`] ? decryptSecret(cfg[`enc_${key}`]) : "");

export async function orderAmount(code) {
  const { rows } = await q("SELECT total, payment_status FROM orders WHERE code=$1", [code]);
  if (!rows[0]) throw new Error("سفارش یافت نشد");
  if (rows[0].payment_status === "paid") throw new Error("این سفارش قبلاً پرداخت شده است");
  return Number(rows[0].total);
}

/* ================================ ZARINPAL ================================ */
const zpHost = (sandbox) => (sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com");

export async function zarinpalStart({ code, cfg, callbackUrl }) {
  const amount = await orderAmount(code);
  const res = await fetch(`${zpHost(cfg.mode === "sandbox")}/pg/v4/payment/request.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      merchant_id: cfg.fields.merchantId,
      amount, // IRT (تومان) — confirm against your merchant contract
      currency: "IRT",
      description: `سفارش ${code} — 50500.shop`,
      callback_url: callbackUrl,
      metadata: { order_id: code },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  if (data?.data?.code !== 100 || !data.data.authority) {
    throw new Error(`زرین‌پال: ${data?.errors?.message ?? "شروع پرداخت ناموفق بود"} (${data?.data?.code ?? data?.errors?.code ?? "?"})`);
  }
  const authority = data.data.authority;
  await q("INSERT INTO payments(order_code,gateway,authority,amount,raw) VALUES($1,'zarinpal',$2,$3,$4)",
    [code, authority, amount, JSON.stringify(data)]);
  return { url: `${zpHost(cfg.mode === "sandbox")}/pg/StartPay/${authority}`, authority };
}

export async function zarinpalVerify({ authority, status, cfg }) {
  const { rows } = await q("SELECT order_code, amount FROM payments WHERE gateway='zarinpal' AND authority=$1 ORDER BY id DESC LIMIT 1", [authority]);
  const attempt = rows[0];
  if (!attempt) throw new Error("تراکنش ناشناخته است");
  if (String(status).toUpperCase() !== "OK") {
    await q("UPDATE payments SET state='failed', raw=raw || $2 WHERE gateway='zarinpal' AND authority=$1", [authority, JSON.stringify({ status })]);
    return { ok: false, code: attempt.order_code };
  }
  const res = await fetch(`${zpHost(cfg.mode === "sandbox")}/pg/v4/payment/verify.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ merchant_id: cfg.fields.merchantId, amount: Number(attempt.amount), authority }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  const okCode = data?.data?.code;
  if (okCode === 100 || okCode === 101) {
    await markPaid(attempt.order_code, "zarinpal", String(data.data.ref_id), data.data.card_pan, data);
    return { ok: true, code: attempt.order_code, refId: String(data.data.ref_id) };
  }
  await q("UPDATE payments SET state='failed', raw=raw || $2 WHERE gateway='zarinpal' AND authority=$1", [authority, JSON.stringify(data)]);
  return { ok: false, code: attempt.order_code };
}

/* ========================= BEHPARDAKHT MELLAT (SOAP) ====================== */
const MELLAT_WSDL = "https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl";
const MELLAT_NS = "http://interfaces.core.sw.bps.com/";

function soap(method, fields) {
  const body = Object.entries(fields).map(([k, v]) => `<ns:${k}>${escapeXml(v)}</ns:${k}>`).join("");
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="${MELLAT_NS}">
 <soapenv:Header/><soapenv:Body><ns:${method}>${body}</ns:${method}></soapenv:Body>
</soapenv:Envelope>`;
}
const escapeXml = (v) => String(v ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

async function mellatCall(method, fields) {
  const res = await fetch(MELLAT_WSDL, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" },
    body: soap(method, fields),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  const ret = text.match(/<return>([\s\S]*?)<\/return>/)?.[1] ?? "";
  return decodeEntities(ret).trim();
}
const decodeEntities = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** bpPayRequest returns "refId" on success; amount is in RIAL for Mellat. */
export async function mellatStart({ code, cfg, callbackUrl }) {
  const totalIRT = await orderAmount(code);
  const amount = cfg.currency === "IRT" ? totalIRT * 10 : totalIRT;
  const orderId = Number(String(Date.now()).slice(-12));
  const refId = await mellatCall("bpPayRequest", {
    terminalId: cfg.fields.terminalId,
    userName: cfg.fields.userName,
    userPassword: readSecret(cfg, "password"),
    orderId,
    amount,
    localDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    localTime: new Date().toTimeString().slice(0, 8).replace(/:/g, ""),
    additionalData: `order:${code}`,
    callBackUrl: callbackUrl,
    payerId: 0,
  });
  const [resCode, token] = refId.split(",");
  if (resCode !== "0" || !token) throw new Error(`به پرداخت ملت: شروع پرداخت ناموفق بود (کد ${resCode})`);
  await q("INSERT INTO payments(order_code,gateway,authority,amount,currency,raw) VALUES($1,'mellat',$2,$3,$4,$5)",
    [code, token, amount, "IRR", JSON.stringify({ orderId, resCode })]);
  return { url: `https://bpm.shaparak.ir/pgwchannel/startpay.mellat?RefId=${encodeURIComponent(token)}`, authority: token };
}

/** Bank POSTs ResCode / RefId / SaleOrderId / SaleReferenceId / CardHolderPan. */
export async function mellatVerify({ refId, resCode, saleOrderId, saleReferenceId, cardHolderPan, cfg }) {
  const { rows } = await q("SELECT order_code, amount FROM payments WHERE gateway='mellat' AND authority=$1 ORDER BY id DESC LIMIT 1", [refId]);
  const attempt = rows[0];
  if (!attempt) throw new Error("تراکنش ناشناخته است");
  if (String(resCode) !== "0") {
    await q("UPDATE payments SET state='failed', raw=raw || $2 WHERE gateway='mellat' AND authority=$1", [refId, JSON.stringify({ resCode })]);
    return { ok: false, code: attempt.order_code };
  }
  const creds = {
    terminalId: cfg.fields.terminalId,
    userName: cfg.fields.userName,
    userPassword: readSecret(cfg, "password"),
    orderId: saleOrderId,
    saleOrderId,
    saleReferenceId,
  };
  const verified = await mellatCall("bpVerifyRequest", creds);
  if (verified !== "0") {
    await q("UPDATE payments SET state='needs_review', raw=raw || $2 WHERE gateway='mellat' AND authority=$1", [refId, JSON.stringify({ verified })]);
    return { ok: false, code: attempt.order_code };
  }
  // Settlement is mandatory — verification alone does not move the money.
  const settled = await mellatCall("bpSettleRequest", creds);
  if (settled !== "0" && settled !== "45") { // 45 = already settled
    await q("UPDATE payments SET state='needs_review', raw=raw || $2 WHERE gateway='mellat' AND authority=$1", [refId, JSON.stringify({ settled })]);
    return { ok: false, code: attempt.order_code };
  }
  await markPaid(attempt.order_code, "mellat", String(saleReferenceId), cardHolderPan, { resCode, verified, settled });
  return { ok: true, code: attempt.order_code, refId: String(saleReferenceId) };
}

/* ============================== shared commit ============================= */
async function markPaid(code, gateway, refId, cardPan, raw) {
  await tx(async (c) => {
    // Idempotency: a replayed bank callback must never double-credit.
    const dupe = await c.query("SELECT 1 FROM payments WHERE gateway=$1 AND ref_id=$2 AND state IN ('verified','settled')", [gateway, refId]);
    if (dupe.rowCount) return;
    const order = await c.query("SELECT status, payment_status FROM orders WHERE code=$1 FOR UPDATE", [code]);
    const late = order.rows[0]?.status === "cancelled";
    await c.query(
      `UPDATE payments SET state=$3, ref_id=$4, card_pan=$5, verified_at=now(), raw=raw || $6
       WHERE id = (SELECT id FROM payments WHERE order_code=$1 AND gateway=$2 ORDER BY id DESC LIMIT 1)`,
      [code, gateway, gateway === "mellat" ? "settled" : "verified", refId, maskPan(cardPan), JSON.stringify(raw)],
    );
    await c.query(
      `UPDATE orders SET payment_status=$2, status=CASE WHEN status='pending' THEN 'confirmed' ELSE status END WHERE code=$1`,
      [code, late ? "paid_review" : "paid"],
    );
    await c.query("INSERT INTO audit_log(actor,module,action,meta) VALUES('gateway','پرداخت',$1,$2)",
      [`تأیید و تسویه پرداخت سفارش ${code} از طریق ${gateway}`, JSON.stringify({ refId, late })]);
  });
}
const maskPan = (pan) => (pan ? String(pan).replace(/\D/g, "").replace(/^(\d{6})\d+(\d{4})$/, "$1******$2") : null);

export function newOrderToken() { return crypto.randomBytes(24).toString("base64url"); }
