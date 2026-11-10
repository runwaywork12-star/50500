import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, CheckCircle2, CheckSquare, Download, ExternalLink, Image as ImageIcon, LoaderCircle, Package, Pencil, Percent, Plus, Search, Square, Trash2, Upload, X } from "lucide-react";
import { money, type AdminProduct, type AdminState } from "@/lib/admin";
import { api, isServerMode } from "@/lib/api";
import { getProducts } from "@/lib/catalog";
import { getCustomProducts, resetProductOverridesCache, setCustomProducts, setProductOverride, type CustomProduct } from "@/lib/product-overrides";
import { ManagedImage } from "@/components/ManagedImage";
import { contentMediaReference } from "@/lib/media-library";
import { cn, fa } from "@/lib/format";
import { Badge, EmptyState, Field, Notice, Toggle } from "./ControlUi";
import { MediaPicker } from "./MediaPicker";

type BulkAction = "price_percent" | "price_set" | "stock_set" | "stock_add" | "activate" | "deactivate" | "compare_clear";
const BULK_LABEL: Record<BulkAction, string> = {
  price_percent: "تغییر قیمت به درصد", price_set: "قیمت ثابت برای همه", stock_set: "موجودی ثابت", stock_add: "افزودن/کسر موجودی",
  activate: "فعال‌سازی", deactivate: "غیرفعال‌سازی", compare_clear: "حذف قیمت قبل از تخفیف",
};
const emptyDraft: CustomProduct = { slug: "", title: "", category: "accessories", price: 0, comparePrice: null, stock: 10, image: null, body: "", brandName: null, active: true };
const slugify = (text: string) => text.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "").replace(/[\s\u0600-\u06FF]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export function ProductsPanel({ state, onChange, onToast, onLog }: { state: AdminState; onChange: (p: AdminState["products"]) => void; onToast: (m: string) => void; onLog?: (action: string, module: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "inactive" | "discounted">("all");
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "stock-asc">("default");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ action: BulkAction; value: string }>({ action: "price_percent", value: "10" });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [imageFor, setImageFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const perPage = 12;

  const filtered = useMemo(() => {
    let list = state.products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (filter === "low" && !(p.stock > 0 && p.stock <= 5)) return false;
      if (filter === "out" && p.stock !== 0) return false;
      if (filter === "inactive" && p.active) return false;
      if (filter === "discounted" && !(p.comparePrice && p.comparePrice > p.price)) return false;
      if (q.trim() && !`${p.title} ${p.brandName ?? ""} ${p.slug}`.includes(q.trim())) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "stock-asc") list = [...list].sort((a, b) => a.stock - b.stock);
    return list;
  }, [state.products, cat, filter, sort, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = filtered.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);
  const stats = {
    total: state.products.length, active: state.products.filter((p) => p.active).length,
    low: state.products.filter((p) => p.stock > 0 && p.stock <= 5).length, out: state.products.filter((p) => p.stock === 0).length,
    value: state.products.reduce((s, p) => s + p.stock * p.price, 0),
  };

  const update = (slug: string, patch: Partial<AdminProduct>) => {
    onChange(state.products.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));
    const { title, body, price, comparePrice, stock, image, active, cost } = patch;
    setProductOverride(slug, { title, body, price, comparePrice, stock, image, active, cost });
  };

  const refreshFromCatalog = (custom?: CustomProduct[]) => {
    if (custom) setCustomProducts(custom);
    resetProductOverridesCache();
    const costs = new Map(state.products.map((p) => [p.slug, p.cost]));
    onChange(getProducts(true).map((p) => ({ slug: p.slug, title: p.title, body: p.body, price: p.price, comparePrice: p.comparePrice, stock: p.stock, category: p.category, brandName: p.brandName, image: p.image, active: p.active, cost: costs.get(p.slug) ?? 0 })));
  };

  const toggle = (slug: string) => setSelected((set) => { const next = new Set(set); next.has(slug) ? next.delete(slug) : next.add(slug); return next; });
  const allOnPage = current.length > 0 && current.every((p) => selected.has(p.slug));

  const applyBulk = async () => {
    const slugs = [...selected];
    const value = Number(bulk.value);
    const needsValue = !["activate", "deactivate", "compare_clear"].includes(bulk.action);
    if (needsValue && !Number.isFinite(value)) { onToast("مقدار عددی معتبر وارد کنید"); return; }
    if (!window.confirm(`«${BULK_LABEL[bulk.action]}»${needsValue ? ` با مقدار ${bulk.value}` : ""} روی ${fa(slugs.length)} محصول اعمال شود؟`)) return;
    setBulkBusy(true);
    try {
      if (isServerMode()) {
        const res = await api<{ changed: number; productOverrides: Record<string, unknown>; customProducts: CustomProduct[] }>("/api/admin/products/bulk", { method: "POST", body: { slugs, action: bulk.action, value } });
        try { localStorage.setItem("50500_product_overrides_v1", JSON.stringify(res.productOverrides)); } catch { /* ignore */ }
        refreshFromCatalog(res.customProducts);
        onToast(`${fa(res.changed)} محصول به‌روزرسانی شد`);
      } else {
        for (const slug of slugs) {
          const p = state.products.find((x) => x.slug === slug); if (!p) continue;
          const patch: Partial<AdminProduct> =
            bulk.action === "price_percent" ? { price: Math.max(1000, Math.round((p.price * (1 + value / 100)) / 10000) * 10000) }
            : bulk.action === "price_set" ? { price: Math.round(value) } : bulk.action === "stock_set" ? { stock: Math.round(value) }
            : bulk.action === "stock_add" ? { stock: Math.max(0, p.stock + Math.round(value)) } : bulk.action === "activate" ? { active: true }
            : bulk.action === "deactivate" ? { active: false } : { comparePrice: null };
          setProductOverride(slug, patch);
        }
        refreshFromCatalog();
        onToast(`${fa(slugs.length)} محصول به‌روزرسانی شد`);
      }
      onLog?.(`ویرایش گروهی ${fa(slugs.length)} محصول: ${BULK_LABEL[bulk.action]}`, "محصولات");
      setSelected(new Set());
    } catch (e) { onToast(e instanceof Error ? e.message : "ویرایش گروهی ناموفق بود"); }
    finally { setBulkBusy(false); }
  };

  const exportCsv = () => {
    const rows = [["slug", "title", "category", "price", "compare_price", "stock", "active", "brand"], ...filtered.map((p) => [p.slug, p.title, p.category, p.price, p.comparePrice ?? "", p.stock, p.active ? "1" : "0", p.brandName ?? ""])];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "50500-products.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    onToast(`${fa(filtered.length)} محصول خروجی گرفته شد`);
  };

  /** CSV import: only price / stock / active of existing slugs are updated (safe, no deletes). */
  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    const header = lines.shift()?.split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase()) ?? [];
    const idx = (name: string) => header.indexOf(name);
    if (idx("slug") < 0) { onToast("ستون slug در فایل پیدا نشد"); return; }
    let changed = 0;
    for (const line of lines) {
      const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
      const slug = cells[idx("slug")];
      if (!slug || !state.products.some((p) => p.slug === slug)) continue;
      const patch: Partial<AdminProduct> = {};
      if (idx("price") >= 0 && cells[idx("price")]) patch.price = Number(cells[idx("price")]);
      if (idx("stock") >= 0 && cells[idx("stock")]) patch.stock = Number(cells[idx("stock")]);
      if (idx("active") >= 0 && cells[idx("active")]) patch.active = cells[idx("active")] === "1";
      if (idx("compare_price") >= 0) patch.comparePrice = cells[idx("compare_price")] ? Number(cells[idx("compare_price")]) : null;
      if (Object.keys(patch).length) { update(slug, patch); changed++; }
    }
    onToast(`${fa(changed)} محصول از فایل CSV به‌روزرسانی شد`);
    onLog?.(`ورود CSV: ${fa(changed)} محصول`, "محصولات");
  };

  const removeCustom = async (p: AdminProduct) => {
    if (!window.confirm(`محصول «${p.title}» حذف شود؟`)) return;
    try {
      if (isServerMode()) await api(`/api/admin/products/${encodeURIComponent(p.slug)}`, { method: "DELETE" });
      refreshFromCatalog(getCustomProducts().filter((c) => c.slug !== p.slug));
      onToast("محصول حذف شد");
    } catch (e) { onToast(e instanceof Error ? e.message : "حذف ناموفق بود"); }
  };
  const isCustom = (slug: string) => getCustomProducts().some((c) => c.slug === slug);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-black">محصولات</h1><p className="mt-1 text-xs tdim">{fa(filtered.length)} کالا در نمایش از {fa(stats.total)}</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => importRef.current?.click()} className="btn btn-ghost px-4 py-2.5 text-xs"><Upload className="size-4" /> ورود CSV</button>
          <input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} />
          <button onClick={exportCsv} className="btn btn-ghost px-4 py-2.5 text-xs"><Download className="size-4" /> خروجی CSV</button>
          <button onClick={() => setCreating(true)} className="btn btn-primary px-4 py-2.5 text-xs"><Plus className="size-4" /> محصول جدید</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-5">
        {[
          { label: "کل کالاها", value: fa(stats.total), icon: Package },
          { label: "فعال", value: fa(stats.active), icon: CheckCircle2 },
          { label: "کم‌موجود (≤۵)", value: fa(stats.low), icon: AlertTriangle, tone: stats.low ? "text-amber-300" : "" },
          { label: "ناموجود", value: fa(stats.out), icon: X, tone: stats.out ? "text-rose-300" : "" },
          { label: "ارزش موجودی", value: `${money(stats.value)} ت`, icon: Boxes },
        ].map((item) => (
          <button key={item.label} onClick={() => item.label.startsWith("کم") ? setFilter("low") : item.label === "ناموجود" ? setFilter("out") : undefined} className="rounded-2xl border bd p-3 text-start sm:p-4" style={{ background: "var(--surface-1)" }}>
            <div className="flex items-center justify-between gap-1.5"><span className="text-[10px] leading-4 tfaint sm:text-[11px]">{item.label}</span><item.icon className="size-4 shrink-0 text-brand-400" /></div>
            <p className={cn("mt-1.5 text-sm font-black leading-5 sm:mt-2 sm:text-lg", item.tone)}>{item.value}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-2 rounded-2xl border bd p-3 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px_160px]" style={{ background: "var(--surface-1)" }}>
        <div className="relative"><Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" /><input className="input pe-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="نام محصول، برند یا شناسه…" /></div>
        <select className="input" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}><option value="all">همه دسته‌ها</option><option value="embroidered-leather">کفپوش چرمی گلدوزی</option><option value="accessories">لوازم جانبی</option></select>
        <select className="input" value={filter} onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(1); }}><option value="all">همه وضعیت‌ها</option><option value="low">کم‌موجود</option><option value="out">ناموجود</option><option value="inactive">غیرفعال</option><option value="discounted">تخفیف‌دار</option></select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="default">ترتیب پیش‌فرض</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option><option value="stock-asc">کمترین موجودی</option></select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-xs">
          <b className="text-brand-300">{fa(selected.size)} محصول انتخاب شده</b>
          <select className="input !w-auto !py-1.5 !text-[11px]" value={bulk.action} onChange={(e) => setBulk({ ...bulk, action: e.target.value as BulkAction })}>{(Object.keys(BULK_LABEL) as BulkAction[]).map((a) => <option key={a} value={a}>{BULK_LABEL[a]}</option>)}</select>
          {!["activate", "deactivate", "compare_clear"].includes(bulk.action) && (
            <div className="relative"><input className="input !w-32 !py-1.5 !text-[11px]" dir="ltr" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })} placeholder={bulk.action === "price_percent" ? "مثلاً 10 یا -15" : "عدد"} />{bulk.action === "price_percent" && <Percent className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 tfaint" />}</div>
          )}
          <button onClick={() => void applyBulk()} disabled={bulkBusy} className="btn btn-primary px-3 py-1.5 text-[11px] disabled:opacity-60">{bulkBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} اعمال</button>
          <button onClick={() => setSelected(new Set())} className="ms-auto text-[11px] font-bold tdim hover:text-rose-300">لغو انتخاب</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <table className="w-full min-w-[960px] text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              <th className="w-10 px-3 py-3"><button onClick={() => setSelected(allOnPage ? new Set([...selected].filter((s) => !current.some((p) => p.slug === s))) : new Set([...selected, ...current.map((p) => p.slug)]))} aria-label="انتخاب همه"><span className="grid place-items-center">{allOnPage ? <CheckSquare className="size-4 text-brand-400" /> : <Square className="size-4" />}</span></button></th>
              {["محصول", "دسته", "قیمت (تومان)", "قبل از تخفیف", "موجودی", "وضعیت", "فعال", ""].map((h) => <th key={h} className="px-3 py-3 text-start font-bold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {current.map((p) => (
              <tr key={p.slug} className={cn("hover:bg-white/[0.03]", selected.has(p.slug) && "bg-brand-500/5", !p.active && "opacity-60")}>
                <td className="px-3 py-2.5"><button onClick={() => toggle(p.slug)} aria-label={`انتخاب ${p.title}`}>{selected.has(p.slug) ? <CheckSquare className="size-4 text-brand-400" /> : <Square className="size-4 tfaint" />}</button></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => setImageFor(p.slug)} title="تغییر تصویر" aria-label={`تغییر تصویر ${p.title}`} className="relative shrink-0"><ManagedImage src={p.image} alt="" className="size-11 rounded-lg object-cover transition hover:ring-2 hover:ring-brand-400" style={{ background: "var(--muted-surface)" }} /><span className="absolute -bottom-1 -end-1 grid size-4 place-items-center rounded-full bg-brand-500 text-white"><ImageIcon className="size-2.5" /></span></button>
                    <div className="min-w-0">
                      <Link to={`/products/${p.slug}`} target="_blank" className="block max-w-[260px] truncate text-[11px] font-bold hover:text-brand-300">{p.title}</Link>
                      <span className="text-[9px] tfaint">{p.brandName ?? "لوازم جانبی"}{isCustom(p.slug) && <Badge tone="brand">افزوده‌شده</Badge>}</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[10px] tdim">{p.category === "accessories" ? "لوازم جانبی" : "کفپوش"}</td>
                <td className="px-3 py-2.5"><input className="input !w-28 !py-1 !text-[11px]" dir="ltr" key={`${p.slug}-${p.price}`} defaultValue={p.price} onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== p.price) { update(p.slug, { price: v }); onLog?.(`تغییر قیمت «${p.title}» به ${money(v)} تومان`, "محصولات"); } }} /></td>
                <td className="px-3 py-2.5"><input className="input !w-28 !py-1 !text-[11px]" dir="ltr" key={`${p.slug}-${p.comparePrice}`} defaultValue={p.comparePrice ?? ""} placeholder="—" onBlur={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (v !== p.comparePrice) update(p.slug, { comparePrice: v }); }} /></td>
                <td className="px-3 py-2.5"><div className="flex items-center gap-1.5"><input className="input !w-16 !py-1 !text-[11px]" dir="ltr" key={`${p.slug}-${p.stock}`} defaultValue={p.stock} onBlur={(e) => { const v = Math.max(0, Number(e.target.value)); if (v !== p.stock) { update(p.slug, { stock: v }); onLog?.(`ویرایش موجودی «${p.title}»`, "محصولات"); } }} />{p.stock === 0 ? <Badge tone="rose">ناموجود</Badge> : p.stock <= 5 && <Badge tone="amber">کم</Badge>}</div></td>
                <td className="px-3 py-2.5">{p.comparePrice && p.comparePrice > p.price ? <Badge tone="green">{fa(Math.round((1 - p.price / p.comparePrice) * 100))}٪ تخفیف</Badge> : <span className="text-[10px] tfaint">—</span>}</td>
                <td className="px-3 py-2.5"><button onClick={() => { update(p.slug, { active: !p.active }); onToast(p.active ? "محصول از فروشگاه پنهان شد" : "محصول در فروشگاه نمایش داده می‌شود"); }} className={cn("relative h-5 w-9 rounded-full transition", p.active ? "bg-brand-500" : "bg-white/15")} aria-label="تغییر وضعیت انتشار"><span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", p.active ? "start-0.5" : "start-[18px]")} /></button></td>
                <td className="px-3 py-2.5 text-end"><div className="flex justify-end gap-1"><button onClick={() => setEditing(p)} className="grid size-8 place-items-center rounded-lg soft-h" aria-label="ویرایش"><Pencil className="size-3.5" /></button>{isCustom(p.slug) && <button onClick={() => void removeCustom(p)} className="grid size-8 place-items-center rounded-lg text-rose-400 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="size-3.5" /></button>}</div></td>
              </tr>
            ))}
            {current.length === 0 && <tr><td colSpan={9} className="px-4 py-14"><EmptyState icon={<Package className="size-7" />} title="محصولی پیدا نشد" description="فیلترها را تغییر دهید یا محصول جدید بسازید." /></td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && <div className="flex justify-center gap-1.5">{Array.from({ length: pages }).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold", page === i + 1 ? "bg-brand-500 text-white" : "border bd tdim")}>{fa(i + 1)}</button>)}</div>}

      {imageFor && <MediaPicker title={`تصویر محصول: ${state.products.find((p) => p.slug === imageFor)?.title ?? imageFor}`} onClose={() => setImageFor(null)} onToast={onToast} onSelect={(selection) => { update(imageFor, { image: contentMediaReference(selection) }); onLog?.(`تغییر تصویر محصول ${imageFor}`, "محصولات"); onToast(`تصویر محصول با «${selection.alt}» به‌روزرسانی شد`); }} />}
      {editing && <ProductEditor product={editing} onClose={() => setEditing(null)} onSave={(patch) => { update(editing.slug, patch); onLog?.(`ویرایش محصول «${editing.title}»`, "محصولات"); onToast("محصول ذخیره شد"); setEditing(null); }} onToast={onToast} />}
      {creating && <ProductCreator onClose={() => setCreating(false)} onToast={onToast} onCreated={(list) => { refreshFromCatalog(list); onLog?.("افزودن محصول جدید", "محصولات"); setCreating(false); }} />}
    </div>
  );
}

function ProductEditor({ product, onClose, onSave, onToast }: { product: AdminProduct; onClose: () => void; onSave: (patch: Partial<AdminProduct>) => void; onToast: (m: string) => void }) {
  const [draft, setDraft] = useState({ title: product.title, body: product.body ?? "", price: product.price, comparePrice: product.comparePrice, stock: product.stock, cost: product.cost, active: product.active, image: product.image });
  const [pick, setPick] = useState(false);
  const margin = draft.cost > 0 ? Math.round(((draft.price - draft.cost) / draft.price) * 100) : null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 start-0 flex w-full max-w-lg flex-col overflow-y-auto border-e bd p-5 shadow-2xl animate-page-in" style={{ background: "var(--panel)" }}>
        <div className="flex items-center justify-between border-b bd pb-4"><div><p className="text-[10px] tfaint">ویرایش محصول</p><h2 className="text-base font-black">{product.title}</h2></div><button onClick={onClose} className="grid size-9 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-4" /></button></div>
        <div className="mt-4 grid gap-3">
          <button onClick={() => setPick(true)} className="group relative h-44 overflow-hidden rounded-2xl border bd" style={{ background: "var(--muted-surface)" }}><ManagedImage src={draft.image} alt="" className="size-full object-contain p-2" /><span className="absolute inset-x-0 bottom-0 bg-black/60 py-2 text-center text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">تغییر تصویر</span></button>
          <Field label="عنوان"><input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="توضیحات محصول"><textarea className="input min-h-28 resize-y" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="قیمت فروش (تومان)"><input className="input" dir="ltr" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field>
            <Field label="قیمت قبل از تخفیف"><input className="input" dir="ltr" type="number" value={draft.comparePrice ?? ""} onChange={(e) => setDraft({ ...draft, comparePrice: e.target.value ? Number(e.target.value) : null })} placeholder="خالی = بدون تخفیف" /></Field>
            <Field label="موجودی"><input className="input" dir="ltr" type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Math.max(0, Number(e.target.value)) })} /></Field>
            <Field label="بهای تمام‌شده" hint={margin !== null ? `حاشیه سود: ${fa(margin)}٪` : "برای محاسبه سود"}><input className="input" dir="ltr" type="number" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Math.max(0, Number(e.target.value)) })} /></Field>
          </div>
          <Toggle checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="نمایش در فروشگاه" />
          {draft.comparePrice !== null && draft.comparePrice <= draft.price && <Notice tone="warning">قیمت قبل از تخفیف باید بیشتر از قیمت فروش باشد.</Notice>}
          <div className="mt-2 flex gap-2"><button onClick={() => { if (draft.title.trim().length < 3 || draft.price <= 0) { onToast("عنوان و قیمت معتبر وارد کنید"); return; } const { image, ...fields } = draft; onSave({ ...fields, ...(image !== product.image ? { image } : {}), comparePrice: draft.comparePrice && draft.comparePrice > draft.price ? draft.comparePrice : null }); }} className="btn btn-primary flex-1 py-3 text-sm">ذخیره تغییرات</button><button onClick={onClose} className="btn btn-ghost px-5 py-3 text-sm">انصراف</button></div>
        </div>
      </div>
      {pick && <MediaPicker title="تصویر محصول" onClose={() => setPick(false)} onToast={onToast} onSelect={(selection) => setDraft({ ...draft, image: contentMediaReference(selection) })} />}
    </div>
  );
}

function ProductCreator({ onClose, onToast, onCreated }: { onClose: () => void; onToast: (m: string) => void; onCreated: (list: CustomProduct[]) => void }) {
  const [draft, setDraft] = useState<CustomProduct>(emptyDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(false);
  const slugOk = /^[a-z0-9-]{3,80}$/.test(draft.slug);

  const save = async () => {
    if (draft.title.trim().length < 3) { onToast("عنوان را کامل وارد کنید"); return; }
    if (!slugOk) { onToast("شناسه فقط حروف انگلیسی کوچک، عدد و خط تیره"); return; }
    if (draft.price < 1000) { onToast("قیمت معتبر نیست"); return; }
    if (draft.comparePrice !== null && draft.comparePrice <= draft.price) { onToast("قیمت قبل از تخفیف باید بیشتر از قیمت فروش باشد"); return; }
    setBusy(true);
    try {
      if (isServerMode()) {
        const res = await api<{ products: CustomProduct[] }>("/api/admin/products", { method: "POST", body: { ...draft, title: draft.title.trim(), brandName: draft.brandName?.trim() || null } });
        onCreated(res.products);
      } else {
        if (getCustomProducts().some((p) => p.slug === draft.slug) || getProducts(true).some((p) => p.slug === draft.slug)) { onToast("محصولی با این شناسه وجود دارد"); return; }
        onCreated([{ ...draft, title: draft.title.trim() }, ...getCustomProducts()]);
      }
      onToast("محصول جدید ساخته شد و در فروشگاه نمایش داده می‌شود");
    } catch (e) { onToast(e instanceof Error ? e.message : "ساخت محصول ناموفق بود"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 start-0 flex w-full max-w-lg flex-col overflow-y-auto border-e bd p-5 shadow-2xl animate-page-in" style={{ background: "var(--panel)" }}>
        <div className="flex items-center justify-between border-b bd pb-4"><div><p className="text-[10px] tfaint">کاتالوگ</p><h2 className="text-base font-black">محصول جدید</h2></div><button onClick={onClose} className="grid size-9 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-4" /></button></div>
        <div className="mt-4 grid gap-3">
          <button onClick={() => setPick(true)} className="grid h-40 place-items-center rounded-2xl border border-dashed bd" style={{ background: "var(--muted-surface)" }}>{draft.image ? <ManagedImage src={draft.image} alt="" className="size-full rounded-2xl object-contain p-2" /> : <span className="grid place-items-center gap-2 text-xs tdim"><ImageIcon className="size-7" /> انتخاب یا آپلود تصویر</span>}</button>
          <Field label="عنوان محصول"><input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value, slug: slugTouched ? draft.slug : slugify(e.target.value) })} placeholder="مثلاً: کاور فرمان چرم طبیعی" /></Field>
          <Field label="شناسه (آدرس صفحه)" hint={slugOk ? `آدرس: /products/${draft.slug}` : "فقط حروف انگلیسی کوچک، عدد و خط تیره؛ مثلاً leather-steering-cover"}><input className="input font-mono" dir="ltr" value={draft.slug} onChange={(e) => { setSlugTouched(true); setDraft({ ...draft, slug: e.target.value.toLowerCase() }); }} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="دسته"><select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as CustomProduct["category"] })}><option value="accessories">لوازم جانبی</option><option value="embroidered-leather">کفپوش چرمی گلدوزی</option></select></Field>
            <Field label="برند (اختیاری)"><input className="input" value={draft.brandName ?? ""} onChange={(e) => setDraft({ ...draft, brandName: e.target.value })} /></Field>
            <Field label="قیمت فروش (تومان)"><input className="input" dir="ltr" type="number" value={draft.price || ""} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field>
            <Field label="قیمت قبل از تخفیف"><input className="input" dir="ltr" type="number" value={draft.comparePrice ?? ""} onChange={(e) => setDraft({ ...draft, comparePrice: e.target.value ? Number(e.target.value) : null })} placeholder="اختیاری" /></Field>
            <Field label="موجودی اولیه"><input className="input" dir="ltr" type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Math.max(0, Number(e.target.value)) })} /></Field>
          </div>
          <Field label="توضیحات"><textarea className="input min-h-28" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="جنس، ابعاد، نحوه نصب…" /></Field>
          <Toggle checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="بلافاصله در فروشگاه نمایش داده شود" />
          <div className="mt-2 flex gap-2"><button onClick={() => void save()} disabled={busy} className="btn btn-primary flex-1 py-3 text-sm disabled:opacity-60">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} ساخت محصول</button><button onClick={onClose} className="btn btn-ghost px-5 py-3 text-sm">انصراف</button></div>
          <Link to="/products" target="_blank" className="text-center text-[11px] font-bold text-brand-300 hover:underline"><ExternalLink className="inline size-3" /> مشاهده فروشگاه</Link>
        </div>
      </div>
      {pick && <MediaPicker title="تصویر محصول جدید" onClose={() => setPick(false)} onToast={onToast} onSelect={(selection) => setDraft({ ...draft, image: contentMediaReference(selection) })} />}
    </div>
  );
}
