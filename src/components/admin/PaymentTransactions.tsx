"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, LoaderCircle, Download } from "lucide-react";

type Row = { id: number; orderCode: string; gateway: string; amount: number; refId: string; cardPan: string; status: string; createdAt: string; updatedAt: string };
const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const money = (n: number) => `${fa(n)} تومان`;
const gatewayName: Record<string, string> = { zarinpal: "زرین‌پال", zibal: "زیبال", manual: "کارت‌به‌کارت", sandbox: "آزمایشی" };
const statusName: Record<string, string> = { paid: "موفق", pending: "در انتظار", failed: "ناموفق", refunded: "بازپرداخت‌شده", cancelled: "لغوشده" };

export function PaymentTransactions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [gateway, setGateway] = useState("all");
  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/payment-transactions", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "دریافت تراکنش‌ها ناموفق بود");
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت تراکنش‌ها"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => rows.filter((r) => (status === "all" || r.status === status) && (gateway === "all" || r.gateway === gateway)), [rows, status, gateway]);
  const exportCsv = () => {
    const cell = (v: unknown) => { let raw = String(v ?? "").replace(/[\r\n]+/g, " "); if (/^[\s]*[=+@-]/.test(raw)) raw = "'" + raw; return `"${raw.replace(/"/g, '""')}"`; };
    const data = [["شناسه", "کد سفارش", "درگاه", "مبلغ تومان", "شناسه مرجع", "کارت", "وضعیت", "زمان ایجاد"], ...visible.map((r) => [r.id, r.orderCode, gatewayName[r.gateway] || r.gateway, r.amount, r.refId, r.cardPan, statusName[r.status] || r.status, r.createdAt])];
    const blob = new Blob(["\uFEFF" + data.map((line) => line.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "50500-payment-transactions.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return <section className="surface overflow-hidden rounded-3xl">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="font-black">تراکنش‌های پرداخت</h2><p className="mt-1 text-xs text-white/45">۲۵۰ تلاش پرداخت اخیر؛ اطلاعات خام درگاه یا داده محرمانه در این جدول نمایش داده نمی‌شود.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="btn btn-ghost border border-white/10 px-3 py-2 text-xs" disabled={!visible.length}><Download className="size-4"/> خروجی CSV</button><button onClick={() => void load()} className="btn btn-ghost border border-white/10 px-3 py-2 text-xs" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin"/> : <RefreshCw className="size-4"/>} تازه‌سازی</button></div></div>
    <div className="flex flex-wrap gap-2 px-5 pb-4"><select className="input !w-auto min-w-40" value={gateway} onChange={(e) => setGateway(e.target.value)}><option value="all">همه درگاه‌ها</option>{Object.entries(gatewayName).map(([v, label]) => <option value={v} key={v}>{label}</option>)}</select><select className="input !w-auto min-w-40" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">همه وضعیت‌ها</option>{Object.entries(statusName).map(([v, label]) => <option value={v} key={v}>{label}</option>)}</select><span className="self-center text-xs text-white/45">{fa(visible.length)} تراکنش</span></div>
    {error && <p className="mx-5 mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-white/[.04] text-xs text-white/45"><tr><th className="p-3 text-start">زمان</th><th className="p-3 text-start">سفارش</th><th className="p-3 text-start">درگاه</th><th className="p-3 text-start">مبلغ</th><th className="p-3 text-start">مرجع</th><th className="p-3 text-start">کارت</th><th className="p-3 text-start">وضعیت</th></tr></thead><tbody>{visible.map((r) => <tr key={r.id} className="border-t border-white/5"><td className="p-3 text-xs">{new Date(r.createdAt).toLocaleString("fa-IR")}</td><td className="p-3 font-bold" dir="ltr">#{r.orderCode}</td><td className="p-3">{gatewayName[r.gateway] || r.gateway}</td><td className="p-3 font-bold">{money(r.amount)}</td><td className="p-3 text-xs" dir="ltr">{r.refId || "—"}</td><td className="p-3 text-xs" dir="ltr">{r.cardPan || "—"}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs ${r.status === "paid" ? "bg-emerald-400/10 text-emerald-200" : r.status === "failed" ? "bg-rose-400/10 text-rose-200" : "bg-amber-400/10 text-amber-200"}`}>{statusName[r.status] || r.status}</span></td></tr>)}</tbody></table>{!loading && !visible.length && <p className="p-7 text-center text-sm text-white/45">تراکنشی با این فیلتر پیدا نشد.</p>}{loading && <p className="p-6 text-center text-sm text-white/45">در حال دریافت تراکنش‌ها…</p>}</div>
  </section>;
}
