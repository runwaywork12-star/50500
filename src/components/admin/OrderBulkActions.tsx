"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, RefreshCw, SquareCheckBig } from "lucide-react";
import { useRouter } from "next/navigation";

type Row = { id: number; code: string; status: string; paymentStatus: string };
const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const rank: Record<string, number> = { pending: 0, confirmed: 1, producing: 2, shipped: 3, delivered: 4 };
const targets = [
  { value: "confirmed", label: "تأیید شده" },
  { value: "producing", label: "در حال تولید" },
  { value: "shipped", label: "ارسال شده" },
  { value: "delivered", label: "تحویل شده" },
];

export function OrderBulkActions({ orders }: { orders: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [target, setTarget] = useState("confirmed");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selectable = useMemo(() => orders
    .filter((o) => (o.paymentStatus === "paid" || o.paymentStatus === "cod") && o.status in rank && o.status !== "delivered")
    .map((o) => o.id).slice(0, 100), [orders]);
  const selectedOrders = useMemo(() => orders.filter((o) => selected.includes(o.id)), [orders, selected]);
  const maxSelectedRank = selectedOrders.reduce((max, o) => Math.max(max, rank[o.status] ?? 99), -1);
  const availableTargets = targets.filter((t) => rank[t.value] > maxSelectedRank);
  const all = selectable.length > 0 && selectable.every((id) => selected.includes(id));
  useEffect(() => {
    if (availableTargets.length && !availableTargets.some((t) => t.value === target)) setTarget(availableTargets[0].value);
  }, [availableTargets, target]);
  const toggleAll = () => setSelected(all ? [] : selectable);
  const toggle = (id: number) => setSelected((v) => v.includes(id) ? v.filter((x) => x !== id) : v.length >= 100 ? v : [...v, id]);
  const run = async () => {
    setNotice(""); setError("");
    if (!selected.length) { setError("ابتدا سفارش‌های موردنظر را انتخاب کن."); return; }
    if (!window.confirm(`وضعیت ${fa(selected.length)} سفارش پرداخت‌شده/پرداخت در محل به «${targets.find((x) => x.value === target)?.label}» تغییر کند؟ این عملیات گروهی قابل برگشت خودکار نیست.`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/orders/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected, status: target }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تغییر گروهی انجام نشد");
      setNotice(`${fa(data.updated)} سفارش به‌روزرسانی شد.`); setSelected([]); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در عملیات گروهی"); }
    finally { setBusy(false); }
  };
  return <section className="surface grid gap-3 rounded-2xl p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-sm font-black"><SquareCheckBig className="size-4 text-brand-300"/> عملیات گروهی سفارش‌ها</h2><p className="mt-1 text-xs text-white/45">فقط سفارش‌های پرداخت‌شده یا پرداخت در محل قابل انتخاب‌اند. لغو، بازپرداخت و تغییر وضعیت پرداخت باید جداگانه بررسی شود.</p></div>
      <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={all} onChange={toggleAll}/> انتخاب همه سفارش‌های قابل پیشبرد ({fa(selectable.length)})</label>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <select className="input !w-auto min-w-44" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="وضعیت مقصد گروهی" disabled={!selected.length || !availableTargets.length}>{availableTargets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
      <button className="btn btn-primary px-4 py-2.5 text-xs" onClick={() => void run()} disabled={busy || !selected.length}>{busy ? <LoaderCircle className="size-4 animate-spin"/> : <RefreshCw className="size-4"/>} تغییر وضعیت {fa(selected.length)} سفارش</button>
      <button className="btn btn-ghost border border-white/10 px-3 py-2 text-xs" onClick={() => setSelected([])} disabled={busy || !selected.length}>پاک‌کردن انتخاب</button>
    </div>
    {notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    {selected.length > 0 && <p className="text-xs text-white/45">مقصد انتخاب‌شده باید برای همه سفارش‌ها مرحله بعدی باشد؛ حداکثر ۱۰۰ سفارش در هر عملیات.</p>}
    {orders.length > 0 && <div className="flex flex-wrap gap-2">{orders.map((o) => { const eligible = selectable.includes(o.id); return <label key={o.id} className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${selected.includes(o.id) ? "border-brand-400/40 bg-brand-500/10" : "border-white/10 text-white/55"}`}><input type="checkbox" checked={selected.includes(o.id)} disabled={!eligible || busy || (!selected.includes(o.id) && selected.length >= 100)} onChange={() => toggle(o.id)} /><span>#{o.code}</span><span className="text-white/35">{eligible ? "قابل پیشبرد" : o.status === "delivered" ? "تحویل‌شده" : "غیرقابل انتخاب"}</span></label>; })}</div>}
  </section>;
}
