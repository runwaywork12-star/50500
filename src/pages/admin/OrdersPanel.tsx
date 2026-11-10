import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, CheckSquare, Clock, Copy, CreditCard, Download, ExternalLink, FileText, Filter, LoaderCircle, MapPin, Package, Phone, Printer, Search, Square, Tag, Truck, User, X } from "lucide-react";
import { ORDER_STATUS, dateFa, money, type AdminOrder } from "@/lib/admin";
import { api, isServerMode } from "@/lib/api";
import { LEATHER_COLORS, THREAD_COLORS, SHIPPING_METHODS } from "@/data/content";
import { cn, fa } from "@/lib/format";
import { Badge, Card, EmptyState, Field } from "./ControlUi";

type Order = AdminOrder;
type Event = { id: string; kind: string; detail: string; by: string | null; at: string };

const PAY_LABEL: Record<AdminOrder["payment"], string> = { paid: "پرداخت شده", pending: "در انتظار پرداخت", cod: "پرداخت در محل", refunded: "بازگشت وجه" };
const PAY_TONE: Record<AdminOrder["payment"], "green" | "amber" | "neutral" | "rose"> = { paid: "green", pending: "amber", cod: "neutral", refunded: "rose" };
const STATUS_TONE: Record<string, "amber" | "brand" | "neutral" | "green" | "rose"> = { pending: "amber", confirmed: "brand", producing: "brand", shipped: "neutral", delivered: "green", cancelled: "rose" };
const FLOW = ["pending", "confirmed", "producing", "shipped", "delivered"] as const;
const leatherName = (id?: string) => LEATHER_COLORS.find((c) => c.id === id)?.name;
const threadName = (id?: string) => THREAD_COLORS.find((c) => c.id === id)?.name;

function printHtml(title: string, body: string) {
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:Tahoma,Arial,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:right;font-size:13px}th{background:#f5f5f5}.muted{color:#666;font-size:12px}.box{border:1px solid #ccc;border-radius:12px;padding:14px;margin-top:12px}.total{font-size:16px;font-weight:bold}.label{border:2px dashed #333;padding:18px;border-radius:12px;font-size:15px;line-height:2}@media print{button{display:none}}</style></head><body>${body}<p class="muted" style="margin-top:24px">50500.shop · فروشگاه کفپوش چرمی گلدوزی اختصاصی خودرو</p><script>window.onload=()=>{window.print();}</script></body></html>`);
  win.document.close();
}

export function printInvoice(o: Order) {
  const rows = o.items.map((it) => `<tr><td>${it.title}${it.leather ? `<div class="muted">چرم ${leatherName(it.leather) ?? it.leather}${it.thread ? ` · گلدوزی ${threadName(it.thread) ?? it.thread}` : ""}</div>` : ""}</td><td>${fa(it.qty)}</td><td>${money(it.price)}</td><td>${money(it.price * it.qty)}</td></tr>`).join("");
  printHtml(`فاکتور ${o.code}`, `<h1>فاکتور فروش</h1><div class="muted">شماره سفارش: <b>${o.code}</b> · تاریخ: ${dateFa(o.createdAt, true)}</div>
  <div class="box"><b>خریدار:</b> ${o.customer} · ${o.phone}<br><b>نشانی:</b> ${o.province}، ${o.city}${o.address ? `، ${o.address}` : ""}${o.postalCode ? ` · کد پستی ${o.postalCode}` : ""}</div>
  <table><thead><tr><th>کالا</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="box"><div>جمع کالاها: ${money(o.subtotal)}</div><div>تخفیف: ${money(o.discount)}</div><div>هزینه ارسال: ${o.shipping ? money(o.shipping) : "رایگان"}</div><div class="total">مبلغ کل: ${money(o.total)} تومان</div><div class="muted">وضعیت پرداخت: ${PAY_LABEL[o.payment]}</div></div>`);
}

export function printLabel(o: Order) {
  printHtml(`برچسب ارسال ${o.code}`, `<div class="label"><b>گیرنده:</b> ${o.customer}<br><b>تلفن:</b> ${o.phone}<br><b>نشانی:</b> ${o.province}، ${o.city}${o.address ? `، ${o.address}` : ""}<br>${o.postalCode ? `<b>کد پستی:</b> ${o.postalCode}<br>` : ""}<b>کد سفارش:</b> ${o.code}${o.tracking ? `<br><b>کد رهگیری:</b> ${o.tracking}` : ""}<br><b>فرستنده:</b> فروشگاه 50500.shop</div>`);
}

export function OrdersPanel({ orders, onChange, onToast, onLog, search }: { orders: Order[]; onChange: (o: AdminOrder[]) => void; onToast: (m: string) => void; onLog: (action: string, module: string) => void; search: string }) {
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState<"all" | AdminOrder["payment"]>("all");
  const [range, setRange] = useState<"all" | "today" | "7" | "30">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "highest">("newest");
  const [query, setQuery] = useState(search);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("confirmed");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 12;
  useEffect(() => setQuery(search), [search]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = query.trim();
    let list = orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (payment !== "all" && o.payment !== payment) return false;
      if (range !== "all") {
        const days = range === "today" ? 1 : Number(range);
        if (now - new Date(o.createdAt).getTime() > days * 86_400_000) return false;
      }
      if (q && ![o.code, o.customer, o.phone, o.city, o.province, o.tracking ?? "", ...o.items.map((i) => i.title)].some((v) => v.includes(q))) return false;
      return true;
    });
    if (sort === "oldest") list = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else if (sort === "highest") list = [...list].sort((a, b) => b.total - a.total);
    else list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [orders, status, payment, range, sort, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = filtered.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    unpaid: orders.filter((o) => o.payment === "pending").length,
    revenue: orders.filter((o) => o.payment === "paid").reduce((s, o) => s + o.total, 0),
    today: orders.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 86_400_000).length,
  }), [orders]);

  const update = (code: string, patch: Partial<AdminOrder>, action?: string) => {
    onChange(orders.map((o) => (o.code === code ? { ...o, ...patch } : o)));
    if (action) onLog(action, "سفارش‌ها");
  };

  const toggle = (code: string) => setSelected((set) => { const next = new Set(set); next.has(code) ? next.delete(code) : next.add(code); return next; });
  const allOnPage = current.length > 0 && current.every((o) => selected.has(o.code));

  const applyBulk = async () => {
    const codes = [...selected];
    if (!codes.length) return;
    const label = ORDER_STATUS.find((s) => s.id === bulkStatus)?.name ?? bulkStatus;
    if (!window.confirm(`وضعیت ${fa(codes.length)} سفارش به «${label}» تغییر کند؟`)) return;
    setBulkBusy(true);
    try {
      if (isServerMode()) {
        const res = await api<{ changed: number }>("/api/admin/orders/bulk", { method: "POST", body: { codes, status: bulkStatus } });
        onChange(orders.map((o) => (codes.includes(o.code) && o.status !== "cancelled" ? { ...o, status: bulkStatus } : o)));
        onToast(`${fa(res.changed)} سفارش به‌روزرسانی شد`);
      } else {
        onChange(orders.map((o) => (codes.includes(o.code) ? { ...o, status: bulkStatus } : o)));
        onToast(`${fa(codes.length)} سفارش به‌روزرسانی شد`);
      }
      onLog(`تغییر گروهی وضعیت ${fa(codes.length)} سفارش به «${label}»`, "سفارش‌ها");
      setSelected(new Set());
    } catch (e) { onToast(e instanceof Error ? e.message : "عملیات گروهی ناموفق بود"); }
    finally { setBulkBusy(false); }
  };

  const exportCsv = (list: Order[]) => {
    const rows = [["کد", "مشتری", "موبایل", "استان", "شهر", "نشانی", "کالاها", "جمع", "تخفیف", "ارسال", "مبلغ کل", "وضعیت", "پرداخت", "رهگیری", "تاریخ"],
      ...list.map((o) => [o.code, o.customer, o.phone, o.province, o.city, o.address ?? "", o.items.map((i) => `${i.title} ×${i.qty}`).join(" | "), o.subtotal, o.discount, o.shipping, o.total, ORDER_STATUS.find((s) => s.id === o.status)?.name ?? o.status, PAY_LABEL[o.payment], o.tracking ?? "", o.createdAt])];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `50500-orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    onToast(`${fa(list.length)} سفارش خروجی گرفته شد`);
  };

  const selectedOrder = orders.find((o) => o.code === open) ?? null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">سفارش‌ها</h1>
          <p className="mt-1 text-xs tdim">{fa(filtered.length)} سفارش در نمایش{query && ` — جستجو برای «${query}»`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportCsv(filtered)} className="btn btn-ghost px-4 py-2.5 text-xs"><Download className="size-4" /> خروجی CSV (فیلترشده)</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-5">
        {[
          { label: "کل سفارش‌ها", value: fa(stats.total), icon: Package },
          { label: "امروز", value: fa(stats.today), icon: Clock },
          { label: "در انتظار تأیید", value: fa(stats.pending), icon: Tag, tone: stats.pending ? "text-amber-300" : "" },
          { label: "پرداخت‌نشده", value: fa(stats.unpaid), icon: CreditCard, tone: stats.unpaid ? "text-rose-300" : "" },
          { label: "فروش پرداخت‌شده", value: `${money(stats.revenue)} ت`, icon: Check, tone: "text-emerald-300" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border bd p-3 sm:p-4" style={{ background: "var(--surface-1)" }}>
            <div className="flex items-center justify-between gap-1.5"><span className="text-[10px] leading-4 tfaint sm:text-[11px]">{item.label}</span><item.icon className="size-4 shrink-0 text-brand-400" /></div>
            <p className={cn("mt-1.5 text-sm font-black leading-5 sm:mt-2 sm:text-lg", item.tone)}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border bd p-3" style={{ background: "var(--surface-1)" }}>
        <div className="flex flex-wrap gap-1.5">
          {[{ id: "all", name: "همه" }, ...ORDER_STATUS].map((s) => (
            <button key={s.id} onClick={() => { setStatus(s.id); setPage(1); }} className={cn("rounded-xl px-3 py-1.5 text-[11px] font-bold transition", status === s.id ? "bg-brand-500 text-white" : "tdim hover:bg-white/5")}>
              {s.name}<span className="ms-1 opacity-60">{fa(s.id === "all" ? orders.length : orders.filter((o) => o.status === s.id).length)}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_170px_150px_150px]">
          <div className="relative"><Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" /><input className="input pe-9" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="کد سفارش، نام، موبایل، شهر، کالا یا کد رهگیری…" /></div>
          <select className="input" value={payment} onChange={(e) => { setPayment(e.target.value as typeof payment); setPage(1); }} aria-label="وضعیت پرداخت"><option value="all">همه پرداخت‌ها</option>{Object.entries(PAY_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          <select className="input" value={range} onChange={(e) => { setRange(e.target.value as typeof range); setPage(1); }} aria-label="بازه زمانی"><option value="all">همه زمان‌ها</option><option value="today">۲۴ ساعت اخیر</option><option value="7">۷ روز اخیر</option><option value="30">۳۰ روز اخیر</option></select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="مرتب‌سازی"><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="highest">بیشترین مبلغ</option></select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-xs">
          <b className="text-brand-300">{fa(selected.size)} سفارش انتخاب شده</b>
          <select className="input !w-auto !py-1.5 !text-[11px]" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>{ORDER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <button onClick={() => void applyBulk()} disabled={bulkBusy} className="btn btn-primary px-3 py-1.5 text-[11px] disabled:opacity-60">{bulkBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} اعمال وضعیت</button>
          <button onClick={() => exportCsv(orders.filter((o) => selected.has(o.code)))} className="btn btn-ghost px-3 py-1.5 text-[11px]"><Download className="size-3.5" /> CSV انتخاب‌شده‌ها</button>
          <button onClick={() => orders.filter((o) => selected.has(o.code)).forEach(printLabel)} className="btn btn-ghost px-3 py-1.5 text-[11px]"><Printer className="size-3.5" /> چاپ برچسب‌ها</button>
          <button onClick={() => setSelected(new Set())} className="ms-auto text-[11px] font-bold tdim hover:text-rose-300">لغو انتخاب</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <table className="w-full min-w-[920px] text-start text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              <th className="w-10 px-3 py-3"><button onClick={() => setSelected(allOnPage ? new Set([...selected].filter((c) => !current.some((o) => o.code === c))) : new Set([...selected, ...current.map((o) => o.code)]))} aria-label="انتخاب همه" className="grid place-items-center">{allOnPage ? <CheckSquare className="size-4 text-brand-400" /> : <Square className="size-4" />}</button></th>
              {["کد", "مشتری", "کالاها", "مبلغ", "وضعیت", "پرداخت", "تاریخ", ""].map((h) => <th key={h} className="px-3 py-3 text-start font-bold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {current.map((o) => {
              const st = ORDER_STATUS.find((s) => s.id === o.status) ?? ORDER_STATUS[0];
              return (
                <tr key={o.code} className={cn("transition hover:bg-white/[0.03]", selected.has(o.code) && "bg-brand-500/5")}>
                  <td className="px-3 py-3"><button onClick={() => toggle(o.code)} aria-label={`انتخاب ${o.code}`}>{selected.has(o.code) ? <CheckSquare className="size-4 text-brand-400" /> : <Square className="size-4 tfaint" />}</button></td>
                  <td className="px-3 py-3"><button onClick={() => setOpen(o.code)} className="font-mono text-[11px] font-bold text-brand-300 hover:underline" dir="ltr">#{o.code}</button></td>
                  <td className="px-3 py-3"><b className="block text-xs">{o.customer}</b><span className="text-[10px] tfaint" dir="ltr">{o.phone}</span> <span className="text-[10px] tdim">· {o.city}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-2 space-x-reverse">{o.items.slice(0, 3).map((it, i) => <img key={i} src={it.image} alt="" className="size-8 rounded-lg border-2 object-cover" style={{ background: "var(--muted-surface)", borderColor: "var(--surface-1)" }} />)}</div>
                      <span className="text-[11px] tdim">{o.items.length === 1 ? <span className="line-clamp-1 max-w-[180px]">{o.items[0].title}</span> : `${fa(o.items.length)} کالا · ${fa(o.items.reduce((s, i) => s + i.qty, 0))} عدد`}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-bold">{money(o.total)}{o.discount > 0 && <span className="ms-1 text-[9px] text-emerald-300">تخفیف</span>}</td>
                  <td className="px-3 py-3"><Badge tone={STATUS_TONE[o.status] ?? "neutral"}>{st.name}</Badge></td>
                  <td className="px-3 py-3"><Badge tone={PAY_TONE[o.payment]}>{PAY_LABEL[o.payment]}</Badge></td>
                  <td className="px-3 py-3 text-[10px] tfaint">{dateFa(o.createdAt, true)}</td>
                  <td className="px-3 py-3 text-end"><button onClick={() => setOpen(o.code)} className="btn btn-ghost !rounded-lg px-2.5 py-1.5 text-[10px]">جزئیات</button></td>
                </tr>
              );
            })}
            {current.length === 0 && <tr><td colSpan={9} className="px-4 py-14"><EmptyState icon={<Filter className="size-7" />} title="سفارشی با این فیلتر نیست" description="فیلترها را تغییر دهید یا جستجو را پاک کنید." /></td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && <div className="flex justify-center gap-1.5">{Array.from({ length: pages }).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold transition", page === i + 1 ? "bg-brand-500 text-white" : "border bd tdim hover:bg-white/5")}>{fa(i + 1)}</button>)}</div>}

      {selectedOrder && <OrderDrawer order={selectedOrder} onClose={() => setOpen(null)} update={update} onToast={onToast} />}
    </div>
  );
}

function OrderDrawer({ order: o, onClose, update, onToast }: { order: Order; onClose: () => void; update: (code: string, patch: Partial<AdminOrder>, action?: string) => void; onToast: (m: string) => void }) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [tracking, setTracking] = useState(o.tracking ?? "");
  const [note, setNote] = useState(o.note ?? "");
  useEffect(() => { setTracking(o.tracking ?? ""); setNote(o.note ?? ""); }, [o.code]);
  useEffect(() => {
    if (!isServerMode()) { setEvents([]); return; }
    let alive = true;
    api<{ events: Event[] }>(`/api/admin/orders/${o.code}/events`).then((r) => alive && setEvents(r.events)).catch(() => alive && setEvents([]));
    return () => { alive = false; };
  }, [o.code, o.status, o.payment, o.tracking]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ship = SHIPPING_METHODS.find((m) => m.id === o.shippingMethod);
  const flowIndex = FLOW.indexOf(o.status as typeof FLOW[number]);
  const next = flowIndex >= 0 && flowIndex < FLOW.length - 1 ? FLOW[flowIndex + 1] : null;
  const nextLabel = next ? ORDER_STATUS.find((s) => s.id === next)?.name : null;
  const copy = (text: string, label: string) => { void navigator.clipboard?.writeText(text); onToast(`${label} کپی شد`); };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`سفارش ${o.code}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 start-0 flex w-full max-w-2xl flex-col overflow-y-auto border-e bd shadow-2xl animate-page-in" style={{ background: "var(--panel)" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bd px-5 py-4 backdrop-blur-xl" style={{ background: "color-mix(in srgb, var(--panel) 90%, transparent)" }}>
          <div>
            <p className="text-[10px] tfaint">جزئیات سفارش · {dateFa(o.createdAt, true)}</p>
            <h2 className="flex items-center gap-2 font-mono text-lg font-black text-brand-300" dir="ltr">#{o.code}<button onClick={() => copy(o.code, "کد سفارش")} className="tdim hover:text-brand-300" aria-label="کپی کد"><Copy className="size-3.5" /></button></h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[o.status] ?? "neutral"}>{ORDER_STATUS.find((s) => s.id === o.status)?.name}</Badge>
            <Badge tone={PAY_TONE[o.payment]}>{PAY_LABEL[o.payment]}</Badge>
            <button onClick={onClose} className="grid size-9 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-4" /></button>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          {/* progress */}
          {o.status !== "cancelled" && (
            <ol className="flex items-center gap-1.5 text-[10px] font-bold">
              {FLOW.map((step, i) => {
                const done = i <= flowIndex;
                return (
                  <li key={step} className="flex flex-1 items-center gap-1.5">
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-[10px]", done ? "border-brand-500 bg-brand-500 text-white" : "bd tfaint")}>{done ? <Check className="size-3" /> : fa(i + 1)}</span>
                    <span className={cn("truncate", done ? "" : "tfaint")}>{ORDER_STATUS.find((s) => s.id === step)?.name}</span>
                    {i < FLOW.length - 1 && <span className={cn("h-px flex-1", done && i < flowIndex ? "bg-brand-500" : "")} style={done && i < flowIndex ? {} : { background: "var(--line)" }} />}
                  </li>
                );
              })}
            </ol>
          )}

          {/* quick actions */}
          <div className="flex flex-wrap gap-2">
            {next && nextLabel && o.status !== "cancelled" && (
              <button onClick={() => update(o.code, { status: next }, `تغییر وضعیت سفارش #${o.code} به «${nextLabel}»`)} className="btn btn-primary px-4 py-2.5 text-xs"><Check className="size-4" /> مرحله بعد: {nextLabel}</button>
            )}
            {o.payment !== "paid" && o.status !== "cancelled" && <button onClick={() => { update(o.code, { payment: "paid", status: o.status === "pending" ? "confirmed" : o.status }, `تأیید پرداخت سفارش #${o.code}`); onToast("پرداخت تأیید شد"); }} className="btn btn-ghost px-4 py-2.5 text-xs !text-emerald-400"><CreditCard className="size-4" /> تأیید پرداخت</button>}
            <button onClick={() => printInvoice(o)} className="btn btn-ghost px-4 py-2.5 text-xs"><FileText className="size-4" /> فاکتور</button>
            <button onClick={() => printLabel(o)} className="btn btn-ghost px-4 py-2.5 text-xs"><Printer className="size-4" /> برچسب ارسال</button>
            <a href={`tel:${o.phone}`} className="btn btn-ghost px-4 py-2.5 text-xs"><Phone className="size-4" /> تماس</a>
            <Link to={`/order/${o.code}`} target="_blank" className="btn btn-ghost px-4 py-2.5 text-xs"><ExternalLink className="size-4" /> نمای مشتری</Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="خریدار" className="!p-4">
              <div className="grid gap-2 text-xs">
                <p className="flex items-center gap-2"><User className="size-4 text-brand-400" /><b>{o.customer}</b></p>
                <p className="flex items-center gap-2"><Phone className="size-4 text-brand-400" /><span dir="ltr" className="font-mono">{o.phone}</span><button onClick={() => copy(o.phone, "شماره")} className="tdim hover:text-brand-300" aria-label="کپی شماره"><Copy className="size-3.5" /></button></p>
                <p className="flex items-start gap-2 leading-6"><MapPin className="mt-1 size-4 shrink-0 text-brand-400" /><span>{o.province}، {o.city}{o.address ? `، ${o.address}` : ""}{o.postalCode ? <span className="block text-[10px] tdim">کد پستی: {o.postalCode}</span> : null}</span></p>
                {o.address && <button onClick={() => copy(`${o.customer} - ${o.phone} - ${o.province}، ${o.city}، ${o.address}${o.postalCode ? ` - کد پستی ${o.postalCode}` : ""}`, "نشانی کامل")} className="justify-self-start text-[10px] font-bold text-brand-300 hover:underline">کپی نشانی کامل برای پست</button>}
              </div>
            </Card>
            <Card title="ارسال و پرداخت" className="!p-4">
              <div className="grid gap-2 text-xs">
                <p className="flex items-center gap-2"><Truck className="size-4 text-brand-400" />{ship?.name ?? o.shippingMethod ?? "پست پیشتاز"}<span className="ms-auto font-bold">{o.shipping ? money(o.shipping) : "رایگان"}</span></p>
                <p className="flex items-center gap-2"><CreditCard className="size-4 text-brand-400" />{o.paymentMethod === "card" ? "کارت‌به‌کارت" : o.paymentMethod === "cod" || o.payment === "cod" ? "پرداخت در محل" : "پرداخت آنلاین"}<span className="ms-auto"><Badge tone={PAY_TONE[o.payment]}>{PAY_LABEL[o.payment]}</Badge></span></p>
                {o.paymentStatus === "paid_review" && <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2 text-[11px] text-amber-300">پرداخت پس از لغو سفارش رسیده؛ نیاز به بررسی و استرداد.</p>}
              </div>
            </Card>
          </div>

          <Card title={`کالاها (${fa(o.items.length)})`} className="!p-4">
            <div className="grid gap-2">
              {o.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border bd p-2">
                  <img src={it.image} alt="" className="size-14 rounded-lg object-cover" style={{ background: "var(--muted-surface)" }} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${it.slug}`} target="_blank" className="block truncate text-xs font-bold hover:text-brand-300">{it.title}</Link>
                    {(it.leather || it.thread) && (
                      <p className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                        {it.leather && <span className="inline-flex items-center gap-1 rounded-full soft px-2 py-0.5"><span className="size-2.5 rounded-full ring-1 ring-white/20" style={{ background: LEATHER_COLORS.find((c) => c.id === it.leather)?.hex }} />چرم {leatherName(it.leather) ?? it.leather}</span>}
                        {it.thread && <span className="inline-flex items-center gap-1 rounded-full soft px-2 py-0.5"><span className="size-2.5 rounded-full ring-1 ring-white/20" style={{ background: THREAD_COLORS.find((c) => c.id === it.thread)?.hex }} />گلدوزی {threadName(it.thread) ?? it.thread}</span>}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] tdim">{money(it.price)} × {fa(it.qty)}</p>
                  </div>
                  <b className="text-xs">{money(it.price * it.qty)}</b>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-1 rounded-xl border bd p-3 text-[11px] tdim">
              <div className="flex justify-between"><span>جمع کالاها</span><span>{money(o.subtotal)}</span></div>
              {o.discount > 0 && <div className="flex justify-between text-emerald-300"><span>تخفیف</span><span>− {money(o.discount)}</span></div>}
              <div className="flex justify-between"><span>ارسال</span><span>{o.shipping ? money(o.shipping) : "رایگان"}</span></div>
              <div className="mt-1 flex justify-between border-t bd pt-2 text-sm font-black" style={{ color: "var(--txt)" }}><span>مبلغ کل</span><span>{money(o.total)} تومان</span></div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="وضعیت سفارش"><select className="input" value={o.status} onChange={(e) => update(o.code, { status: e.target.value }, `تغییر وضعیت سفارش #${o.code} به «${ORDER_STATUS.find((s) => s.id === e.target.value)?.name}»`)}>{ORDER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="وضعیت پرداخت"><select className="input" value={o.payment} onChange={(e) => { const p = e.target.value as AdminOrder["payment"]; update(o.code, { payment: p, status: p === "paid" && o.status === "pending" ? "confirmed" : o.status }, `تغییر پرداخت سفارش #${o.code} به «${PAY_LABEL[p]}»`); }}>{Object.entries(PAY_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
            <Field label="کد رهگیری پستی" hint="بعد از ثبت، در صفحه پیگیری مشتری نمایش داده می‌شود"><div className="flex gap-2"><input className="input" dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="مثلاً 1234567890123456789" /><button onClick={() => { if (tracking.trim() && tracking !== o.tracking) update(o.code, { tracking: tracking.trim(), status: o.status === "producing" || o.status === "confirmed" ? "shipped" : o.status }, `ثبت کد رهگیری ${tracking.trim()} برای سفارش #${o.code}`); }} className="btn btn-ghost shrink-0 px-3 py-2 text-xs">ثبت</button></div></Field>
            <Field label="یادداشت داخلی" hint="فقط تیم شما می‌بیند"><textarea className="input min-h-[42px]" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => { if (note !== (o.note ?? "")) update(o.code, { note }, `ویرایش یادداشت سفارش #${o.code}`); }} placeholder="مثلاً: مشتری خواسته لوگو گلدوزی نشود" /></Field>
          </div>

          <Card title="تاریخچه" className="!p-4">
            {events === null ? <p className="text-xs tdim">در حال بارگذاری…</p> : events.length === 0 ? <p className="text-xs tdim">{isServerMode() ? "هنوز تغییری ثبت نشده است." : "تاریخچه فقط در نسخه سرور ذخیره می‌شود."}</p> : (
              <ol className="grid gap-2">{events.map((ev) => <li key={ev.id} className="flex items-start gap-2 text-[11px]"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" /><span className="min-w-0 flex-1"><span className="block">{ev.detail}</span><span className="text-[10px] tfaint">{dateFa(ev.at, true)}{ev.by ? ` · ${ev.by}` : ""}</span></span></li>)}</ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
