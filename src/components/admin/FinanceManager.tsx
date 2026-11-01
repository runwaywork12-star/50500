"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpLeft, Download, LoaderCircle, Plus, RefreshCw, ShieldAlert, XCircle } from "lucide-react";

type Entry = { id: number; type: "income" | "expense"; category: string; title: string; amount: number; reference: string; note: string; happenedAt: string; isVoided: boolean };
type Stats = { paidSales: number; grossMargin: number; otherIncome: number; expenses: number; netEstimate: number; legacyCostRows: number };
const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const money = (n: number) => `${fa(Math.round(n))} تومان`;
async function request(url: string, method = "GET", body?: unknown) {
  const r = await fetch(url, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "خطا در ارتباط با سرور"); return d;
}

export function FinanceManager() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ type: "expense", category: "تبلیغات", title: "", amount: "", reference: "", note: "", happenedAt: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    setLoading(true); setError("");
    try { const d = await request("/api/admin/finance"); setStats(d.stats); setEntries(d.entries ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : "دریافت اطلاعات حسابداری ناموفق بود"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await request("/api/admin/finance", "POST", { ...form, amount: Number(form.amount), happenedAt: new Date(`${form.happenedAt}T12:00:00`).toISOString() });
      setForm((f) => ({ ...f, title: "", amount: "", reference: "", note: "" }));
      setNotice("سند مالی ثبت شد."); await load(); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "ثبت سند ناموفق بود"); }
    finally { setSaving(false); }
  };

  const toggleVoid = async (entry: Entry) => {
    const action = entry.isVoided ? "فعال‌سازی مجدد" : "ابطال";
    if (!window.confirm(`سند «${entry.title}» ${action} شود؟`)) return;
    try { await request(`/api/admin/finance/${entry.id}`, "PATCH", { isVoided: !entry.isVoided }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "عملیات ناموفق بود"); }
  };

  const exportCsv = () => {
    const cell = (v: unknown) => { let raw = String(v ?? "").replace(/[\r\n]+/g, " "); if (/^[\s]*[=+@-]/.test(raw)) raw = "\'" + raw; return `"${raw.replace(/"/g, '""')}"`; };
    const lines = [["شناسه", "نوع", "دسته", "عنوان", "مبلغ تومان", "مرجع", "یادداشت", "تاریخ", "وضعیت"], ...entries.map((e) => [e.id, e.type === "income" ? "درآمد" : "هزینه", e.category, e.title, e.amount, e.reference, e.note, e.happenedAt, e.isVoided ? "باطل" : "فعال"])];
    const blob = new Blob(["\uFEFF" + lines.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "50500-finance-ledger.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const kpis = stats ? [
    { label: "فروش ثبت‌شده و پرداخت‌شده", value: stats.paidSales, icon: ArrowDownLeft },
    { label: "حاشیه ناخالص تخمینی با ارسال", value: stats.grossMargin, icon: ArrowUpLeft },
    { label: "سایر درآمدهای ثبت‌شده", value: stats.otherIncome, icon: ArrowDownLeft },
    { label: "هزینه‌های ثبت‌شده", value: stats.expenses, icon: ArrowUpLeft },
    { label: "مانده عملیاتی تخمینی", value: stats.netEstimate, icon: ArrowUpLeft },
  ] : [];

  return <div className="grid gap-6">
    {stats && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{kpis.map((k) => <div key={k.label} className="surface rounded-2xl p-4"><p className="text-xs text-white/50">{k.label}</p><p className="mt-3 text-xl font-black">{money(k.value)}</p></div>)}</div>}
    {stats && <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100"><ShieldAlert className="mt-1 size-5 shrink-0"/><div>این گزارش، فروش را از سفارش‌های پرداخت‌شده و هزینه‌ها را از اسناد دستی ثبت‌شده محاسبه می‌کند. هزینه کالا برای سفارش‌های قدیمی از بهای تمام‌شده فعلی/قابل‌دسترس برآورد شده است؛ تعداد ردیف قدیمی نیازمند بررسی: <b>{fa(stats.legacyCostRows)}</b>. کارمزد درگاه، هزینه واقعی ارسال و تبلیغات باید به‌عنوان هزینه ثبت شوند تا مانده عملیاتی دقیق‌تر شود.</div></div>}
    <section className="surface rounded-3xl p-5 sm:p-6">
      <div className="mb-4"><h2 className="text-lg font-black">ثبت سند درآمد یا هزینه</h2><p className="mt-1 text-xs leading-6 text-white/50">برای کارمزد درگاه، تبلیغات، حقوق، ارسال، خرید مواد اولیه، اجاره یا درآمدهای متفرقه ثبت مالی بساز.</p></div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-xs text-white/60">نوع سند<select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}><option value="expense">هزینه</option><option value="income">درآمد متفرقه</option></select></label>
        <label className="grid gap-1 text-xs text-white/60">دسته‌بندی<select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{(form.type === "expense" ? ["تبلیغات", "کارمزد درگاه", "هزینه ارسال", "خرید مواد اولیه", "حقوق و دستمزد", "اجاره و شارژ", "بسته‌بندی", "مالیات و عوارض", "سایر هزینه‌ها"] : ["درآمد متفرقه", "تسویه حضوری", "سایر درآمدها"]).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="grid gap-1 text-xs text-white/60">عنوان سند<input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required minLength={2} placeholder="مثلاً هزینه تبلیغات مهر" /></label>
        <label className="grid gap-1 text-xs text-white/60">مبلغ (تومان)<input className="input" inputMode="numeric" type="number" min="1" max="2000000000" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required /></label>
        <label className="grid gap-1 text-xs text-white/60">تاریخ<input className="input" type="date" value={form.happenedAt} onChange={(e) => setForm((f) => ({ ...f, happenedAt: e.target.value }))} required /></label>
        <label className="grid gap-1 text-xs text-white/60">شماره رسید / مرجع<input className="input" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} /></label>
        <label className="grid gap-1 text-xs text-white/60 sm:col-span-2">یادداشت<textarea className="input min-h-10" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></label>
        <div className="flex items-end"><button className="btn btn-primary w-full px-4 py-3" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin"/> : <Plus className="size-4"/>} ثبت سند</button></div>
      </form>
    </section>
    <section className="surface overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="font-black">دفتر ثبت مالی</h2><p className="mt-1 text-xs text-white/45">سند باطل‌شده از محاسبات حذف می‌شود اما برای حفظ سابقه باقی می‌ماند.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="btn btn-ghost border border-white/10 px-3 py-2 text-xs"><Download className="size-4"/> خروجی CSV</button><button onClick={load} className="btn btn-ghost border border-white/10 px-3 py-2 text-xs"><RefreshCw className="size-4"/> تازه‌سازی</button></div></div>
      {error && <p className="mx-5 mb-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-white/[0.04] text-xs text-white/50"><tr><th className="p-3 text-start">تاریخ</th><th className="p-3 text-start">نوع</th><th className="p-3 text-start">عنوان</th><th className="p-3 text-start">دسته</th><th className="p-3 text-start">مبلغ</th><th className="p-3 text-start">مرجع</th><th className="p-3 text-start">عملیات</th></tr></thead><tbody>{entries.map((e) => <tr key={e.id} className={`border-t border-white/5 ${e.isVoided ? "opacity-40" : ""}`}><td className="p-3 text-xs">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(e.happenedAt))}</td><td className="p-3"><span className={e.type === "income" ? "text-emerald-300" : "text-rose-300"}>{e.type === "income" ? "درآمد" : "هزینه"}</span></td><td className="p-3"><b>{e.title}</b>{e.note && <p className="mt-1 text-xs text-white/40">{e.note}</p>}</td><td className="p-3 text-xs text-white/55">{e.category}</td><td className="p-3 font-bold">{money(e.amount)}</td><td className="p-3 text-xs text-white/50">{e.reference || "—"}</td><td className="p-3"><button onClick={() => void toggleVoid(e)} className="btn btn-ghost border border-white/10 px-2.5 py-1.5 text-xs">{e.isVoided ? "بازگردانی" : <><XCircle className="size-3.5"/> ابطال سند</>}</button></td></tr>)}</tbody></table>{loading && <p className="p-6 text-center text-sm text-white/45">در حال دریافت دفتر مالی…</p>}{!loading && !entries.length && <p className="p-8 text-center text-sm text-white/45">هنوز سند درآمد یا هزینه‌ای ثبت نشده است.</p>}</div>
    </section>
  </div>;
}
