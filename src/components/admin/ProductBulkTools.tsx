"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LoaderCircle, RefreshCw, Search, WandSparkles } from "lucide-react";

type Row = { id: number; title: string; slug: string; price: number; stock: number; isActive: boolean; isFeatured: boolean; categoryName: string };
async function request(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "خطا در اجرای عملیات");
  return data;
}
const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);

export function ProductBulkTools({ categories }: { categories: { id: number; name: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [pricePercent, setPricePercent] = useState("");
  const [stockDelta, setStockDelta] = useState("");
  const [active, setActive] = useState("");
  const [featured, setFeatured] = useState("");
  const [targetCategory, setTargetCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const load = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const params = new URLSearchParams(); if (q.trim()) params.set("q", q.trim()); if (categoryId) params.set("categoryId", categoryId);
      const data = await request(`/api/admin/products/bulk?${params.toString()}`);
      setRows(data.rows ?? []); setSelected([]);
      if (data.truncated) setNotice("فهرست به ۵۰۰ کالا محدود شده؛ برای انتخاب دقیق‌تر فیلتر را محدودتر کن.");
    } catch (e) { setError(e instanceof Error ? e.message : "دریافت کالاها ناموفق بود"); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(); /* initial list only */ }, []);

  const toggleAll = () => setSelected(selected.length === rows.length ? [] : rows.map((r) => r.id));
  const toggle = (id: number) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const apply = async () => {
    if (!selected.length) { setError("ابتدا کالاهای موردنظر را انتخاب کن."); return; }
    if (selected.length > 250) { setError("ویرایش گروهی هر بار حداکثر روی ۲۵۰ کالا انجام می‌شود؛ برای خروجی CSV می‌توانی تا ۵۰۰ کالا انتخاب کنی."); return; }
    const body: Record<string, unknown> = { ids: selected };
    if (pricePercent.trim()) body.pricePercent = Number(pricePercent);
    if (stockDelta.trim()) body.stockDelta = Number(stockDelta);
    if (active) body.isActive = active === "true";
    if (featured) body.isFeatured = featured === "true";
    if (targetCategory) body.categoryId = Number(targetCategory);
    if (Object.keys(body).length === 1) { setError("حداقل یک عملیات برای اجرا انتخاب کن."); return; }
    const summary = [pricePercent ? `تغییر قیمت ${pricePercent}٪` : "", stockDelta ? `تغییر موجودی ${stockDelta}` : "", active ? `وضعیت ${active === "true" ? "فعال" : "غیرفعال"}` : "", featured ? `ویژه ${featured === "true" ? "بله" : "خیر"}` : "", targetCategory ? "تغییر دسته" : ""].filter(Boolean).join("، ");
    if (!window.confirm(`این تغییرات روی ${fa(selected.length)} کالا اعمال شود؟\n${summary}`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("/api/admin/products/bulk", "POST", body);
      setNotice(`${fa(result.updated)} کالا با موفقیت به‌روزرسانی شد.`);
      setPricePercent(""); setStockDelta(""); setActive(""); setFeatured(""); setTargetCategory("");
      await load(); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "ویرایش گروهی ناموفق بود"); }
    finally { setBusy(false); }
  };


  const importCsv = async () => {
    if (!importFile) { setError("ابتدا فایل CSV را انتخاب کن."); return; }
    if (!window.confirm("اطلاعات قیمت، بهای تمام‌شده، موجودی و وضعیت انتشار محصولات موجود از روی CSV جایگزین می‌شود. ادامه می‌دهی؟")) return;
    const form = new FormData(); form.set("file", importFile); setImporting(true); setError(""); setNotice("");
    try { const r = await fetch("/api/admin/products/import", { method: "POST", body: form, cache: "no-store" }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "ورود فایل ناموفق بود"); setNotice(`${fa(d.updated)} محصول از CSV به‌روزرسانی شد.`); setImportFile(null); await load(); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "ورود فایل ناموفق بود"); }
    finally { setImporting(false); }
  };

  const exportSelected = () => {
    if (!selected.length) { setError("برای خروجی، ابتدا حداقل یک کالا انتخاب کن."); return; }
    if (selected.length > 500) { setError("خروجی هر بار حداکثر ۵۰۰ کالا است."); return; }
    window.location.href = `/api/admin/products/export?ids=${selected.join(",")}`;
  };

  return <section className="surface grid gap-4 rounded-3xl p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 font-black"><WandSparkles className="size-5 text-brand-300" /> ویرایش و خروجی گروهی کالاها</h2><p className="mt-1 text-xs leading-6 text-white/50">کالاها را فیلتر و انتخاب کن؛ سپس قیمت، موجودی، دسته‌بندی و وضعیت چند کالا را هم‌زمان تغییر بده یا CSV بگیر.</p></div>
      <span className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60">انتخاب‌شده: {fa(selected.length)}</span>
    </div>
    <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="grid gap-2 sm:grid-cols-[1fr_220px_auto]">
      <label className="relative"><Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-white/35"/><input className="input pe-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام یا شناسه کالا" /></label>
      <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">همه دسته‌ها</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="btn btn-ghost border border-white/10 px-4" type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin"/> : <RefreshCw className="size-4"/>} بارگذاری</button>
    </form>
    {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-white/[0.04] text-xs text-white/55"><tr><th className="p-3 text-center"><input type="checkbox" aria-label="انتخاب همه" checked={rows.length > 0 && selected.length === rows.length} onChange={toggleAll}/></th><th className="p-3 text-start">کالا</th><th className="p-3 text-start">دسته</th><th className="p-3 text-start">قیمت</th><th className="p-3 text-start">موجودی</th><th className="p-3 text-start">وضعیت</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-white/5"><td className="p-3 text-center"><input type="checkbox" checked={selectedSet.has(r.id)} onChange={() => toggle(r.id)} aria-label={`انتخاب ${r.title}`}/></td><td className="p-3"><span className="block font-bold">{r.title}</span><span className="text-[10px] text-white/35">#{fa(r.id)} · {r.slug}</span></td><td className="p-3 text-xs text-white/55">{r.categoryName}</td><td className="p-3">{fa(r.price)} تومان</td><td className="p-3">{fa(r.stock)}</td><td className="p-3 text-xs">{r.isActive ? "فعال" : "غیرفعال"}{r.isFeatured ? " · ویژه" : ""}</td></tr>)}</tbody>
      </table>
      {!rows.length && <p className="p-6 text-center text-sm text-white/45">کالایی با این فیلتر پیدا نشد.</p>}
    </div>
    <div className="grid gap-3 rounded-2xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-black">ورود گروهی CSV</p><p className="mt-1 text-xs text-white/45">فقط کالاهای موجود را با ستون slug تطبیق می‌دهد؛ محصول جدید ایجاد نمی‌کند.</p></div><a className="btn btn-ghost border border-white/10 px-3 py-2 text-xs" href="/api/admin/products/import">دانلود قالب CSV</a></div>
      <div className="flex flex-wrap items-center gap-2"><input type="file" accept=".csv,text/csv" className="input max-w-sm" onChange={e=>setImportFile(e.target.files?.[0]??null)}/><button type="button" className="btn btn-ghost border border-white/10" onClick={()=>void importCsv()} disabled={importing||!importFile}>{importing?<LoaderCircle className="size-4 animate-spin"/>:<Download className="size-4"/>} ورود و به‌روزرسانی CSV</button></div>
    </div>
    <div className="grid gap-3 rounded-2xl border border-white/10 p-4">
      <p className="text-sm font-black">عملیات روی کالاهای انتخاب‌شده</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1 text-xs text-white/60">تغییر درصدی قیمت (+ افزایش / - کاهش)<input className="input" type="number" min="-90" max="300" step="0.5" value={pricePercent} onChange={(e) => setPricePercent(e.target.value)} placeholder="مثلاً ۱۰ یا ۱۵-" /></label>
        <label className="grid gap-1 text-xs text-white/60">تغییر تعداد موجودی (+ / -)<input className="input" type="number" min="-5000" max="5000" step="1" value={stockDelta} onChange={(e) => setStockDelta(e.target.value)} placeholder="مثلاً ۲۰ یا ۵-" /></label>
        <label className="grid gap-1 text-xs text-white/60">وضعیت انتشار<select className="input" value={active} onChange={(e) => setActive(e.target.value)}><option value="">بدون تغییر</option><option value="true">فعال‌کردن</option><option value="false">غیرفعال‌کردن</option></select></label>
        <label className="grid gap-1 text-xs text-white/60">محصول ویژه<select className="input" value={featured} onChange={(e) => setFeatured(e.target.value)}><option value="">بدون تغییر</option><option value="true">ویژه‌کردن</option><option value="false">برداشتن از ویژه‌ها</option></select></label>
        <label className="grid gap-1 text-xs text-white/60">انتقال دسته‌بندی<select className="input" value={targetCategory} onChange={(e) => setTargetCategory(e.target.value)}><option value="">بدون تغییر</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={exportSelected} className="btn btn-ghost border border-white/10 px-4"><Download className="size-4"/> خروجی CSV انتخاب‌شده‌ها</button><button type="button" onClick={apply} disabled={busy || !selected.length} className="btn btn-primary px-5">{busy ? <LoaderCircle className="size-4 animate-spin"/> : <WandSparkles className="size-4"/>} اجرای ویرایش گروهی</button></div>
    </div>
  </section>;
}
