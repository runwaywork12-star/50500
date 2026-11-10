import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgePercent, Check, Copy, KeyRound, LoaderCircle, MessageSquare, Plus, RotateCcw, Search, ShieldCheck, Star, Trash2, UserCog, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn, fa } from "@/lib/format";
import { money } from "@/lib/admin";
import { Badge, Card, EmptyState, Field, Notice, PanelHeader, Toggle } from "./ControlUi";

/* ------------------------------------------------------------------ *
 * Server-backed admin modules: coupons, review moderation and staff.
 * Every mutation is optimistic, rolls back on failure and is audited
 * on the server. Demo mode keeps its original local panels.
 * ------------------------------------------------------------------ */

export type ServerCoupon = { code: string; label: string; percent: number; minAmount: number; maxUses: number | null; uses: number; active: boolean; createdAt: string };
export type ServerReview = { id: string; slug: string; name: string; rating: number; comment: string; status: "pending" | "approved" | "rejected"; date: string };
export type ServerStaff = { id: string; email: string; name: string; active: boolean; permissions: Record<string, { read: boolean; write: boolean }>; totpEnabled: boolean; createdAt: string };

const MODULE_LABELS: Record<string, string> = {
  orders: "سفارش‌ها", products: "محصولات", customers: "مشتریان", coupons: "کدهای تخفیف", reviews: "نظرات",
  content: "محتوای سایت", pages: "صفحات و SEO", media: "تصاویر", payments: "درگاه‌ها", agents: "ایجنت‌های AI", settings: "تنظیمات",
};
const STAFF_MODULES = Object.keys(MODULE_LABELS);

function useList<T>(path: string, key: string, onToast: (m: string) => void) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      const data = await api<Record<string, T[]>>(path);
      setRows(data[key] ?? []);
    } catch (e) { onToast(e instanceof Error ? e.message : "دریافت اطلاعات ناموفق بود"); }
    finally { setLoading(false); }
  }, [path, key]);
  useEffect(() => { void reload(); }, [reload]);
  return { rows, setRows, loading, reload };
}

/* --------------------------------- coupons --------------------------------- */
export function ServerCoupons({ onToast }: { onToast: (m: string) => void }) {
  const { rows, setRows, loading } = useList<ServerCoupon>("/api/admin/coupons", "coupons", onToast);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "uses" | "percent">("new");
  const [form, setForm] = useState({ code: "", label: "", percent: 10, minAmount: 0, maxUses: "" });
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState<ServerCoupon | null>(null);

  const filtered = useMemo(() => {
    const list = rows.filter((r) => `${r.code} ${r.label}`.toLowerCase().includes(query.trim().toLowerCase()));
    if (sort === "uses") return [...list].sort((a, b) => b.uses - a.uses);
    if (sort === "percent") return [...list].sort((a, b) => b.percent - a.percent);
    return list;
  }, [rows, query, sort]);

  const patch = async (code: string, body: Partial<ServerCoupon>) => {
    const prev = rows;
    setRows((list) => list.map((r) => (r.code === code ? { ...r, ...body } : r)));
    try { await api(`/api/admin/coupons/${encodeURIComponent(code)}`, { method: "PATCH", body }); }
    catch (e) { setRows(prev); onToast(e instanceof Error ? e.message : "ذخیره ناموفق بود"); }
  };

  const create = async () => {
    setBusy(true);
    try {
      const res = await api<{ coupon: ServerCoupon }>("/api/admin/coupons", { method: "POST", body: {
        code: form.code, label: form.label, percent: form.percent, minAmount: form.minAmount,
        maxUses: form.maxUses ? Number(form.maxUses) : null, active: true,
      } });
      setRows((list) => [res.coupon, ...list]);
      setForm({ code: "", label: "", percent: 10, minAmount: 0, maxUses: "" });
      onToast(`کد «${res.coupon.code}» ساخته شد و همین حالا در تسویه‌حساب کار می‌کند`);
    } catch (e) { onToast(e instanceof Error ? e.message : "ساخت کد ناموفق بود"); }
    finally { setBusy(false); }
  };

  const remove = async (coupon: ServerCoupon) => {
    const prev = rows;
    setRows((list) => list.filter((r) => r.code !== coupon.code));
    setDeleted(coupon);
    try { await api(`/api/admin/coupons/${encodeURIComponent(coupon.code)}`, { method: "DELETE" }); }
    catch (e) { setRows(prev); setDeleted(null); onToast(e instanceof Error ? e.message : "حذف ناموفق بود"); }
  };

  const undo = async () => {
    if (!deleted) return;
    try {
      const res = await api<{ coupon: ServerCoupon }>("/api/admin/coupons", { method: "POST", body: { ...deleted, uses: deleted.uses } });
      setRows((list) => [res.coupon, ...list.filter((r) => r.code !== res.coupon.code)]);
      setDeleted(null);
      onToast("کد تخفیف بازگردانی شد");
    } catch (e) { onToast(e instanceof Error ? e.message : "بازگردانی ناموفق بود"); }
  };

  return (
    <div className="grid gap-5">
      <PanelHeader title="کدهای تخفیف" description="کدها روی سرور اعتبارسنجی می‌شوند: درصد، حداقل مبلغ و سقف استفاده در همان لحظه ثبت سفارش اعمال می‌شود." />
      {deleted && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-300">
          <span>کد «{deleted.code}» حذف شد.</span>
          <button onClick={() => void undo()} className="btn btn-ghost px-3 py-1.5 text-[11px]"><RotateCcw className="size-3.5" /> بازگردانی</button>
        </div>
      )}
      <Card title="کد جدید" description="بلافاصله پس از ساخت، در صفحه تسویه‌حساب قابل استفاده است">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="کد (انگلیسی)"><input className="input font-mono" dir="ltr" placeholder="OFF15" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="توضیح"><input className="input" placeholder="تخفیف تابستانه" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></Field>
          <Field label="درصد تخفیف"><input className="input" type="number" min={1} max={90} dir="ltr" value={form.percent} onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })} /></Field>
          <Field label="حداقل خرید (تومان)"><input className="input" type="number" min={0} dir="ltr" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} /></Field>
          <Field label="سقف استفاده (خالی = نامحدود)"><input className="input" type="number" min={1} dir="ltr" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></Field>
        </div>
        <button onClick={() => void create()} disabled={busy || form.code.trim().length < 3} className="btn btn-primary mt-4 px-5 py-2.5 text-xs disabled:opacity-50">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} ساخت کد تخفیف
        </button>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
          <input className="input pe-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی کد یا توضیح…" />
        </div>
        {([["new", "جدیدترین"], ["uses", "پراستفاده‌ترین"], ["percent", "بیشترین درصد"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSort(id)} className={cn("chip !text-[11px]", sort === id && "chip-active")}>{label}</button>
        ))}
      </div>

      {loading ? <div className="grid h-32 place-items-center"><LoaderCircle className="size-6 animate-spin text-brand-400" /></div> : filtered.length === 0 ? (
        <EmptyState icon={<BadgePercent className="size-7" />} title="کدی وجود ندارد" description="اولین کد تخفیف را از فرم بالا بسازید." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((coupon) => (
            <Card key={coupon.code} className={cn(!coupon.active && "opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2"><b className="font-mono text-base font-black text-brand-300" dir="ltr">{coupon.code}</b><Badge tone={coupon.active ? "green" : "neutral"}>{coupon.active ? "فعال" : "غیرفعال"}</Badge></p>
                  <p className="mt-1 truncate text-[11px] tdim">{coupon.label || "بدون توضیح"}</p>
                </div>
                <button onClick={() => void remove(coupon)} className="grid size-9 shrink-0 place-items-center rounded-xl text-rose-400 transition hover:bg-rose-500/10" aria-label={`حذف ${coupon.code}`}><Trash2 className="size-4" /></button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-xl soft p-2"><b className="block text-sm text-brand-300">{fa(coupon.percent)}٪</b>تخفیف</div>
                <div className="rounded-xl soft p-2"><b className="block text-sm">{fa(coupon.uses)}{coupon.maxUses ? ` / ${fa(coupon.maxUses)}` : ""}</b>استفاده</div>
                <div className="rounded-xl soft p-2"><b className="block text-sm">{coupon.minAmount ? money(coupon.minAmount).replace(" تومان", "") : "—"}</b>حداقل خرید</div>
              </div>
              {coupon.maxUses !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full soft"><div className="h-full rounded-full bg-gradient-to-l from-brand-300 to-brand-600 transition-all" style={{ width: `${Math.min(100, (coupon.uses / coupon.maxUses) * 100)}%` }} /></div>
              )}
              <div className="mt-3"><Toggle checked={coupon.active} onChange={(active) => void patch(coupon.code, { active })} label={coupon.active ? "در تسویه‌حساب پذیرفته می‌شود" : "پذیرفته نمی‌شود"} /></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- reviews --------------------------------- */
export function ServerReviews({ onToast }: { onToast: (m: string) => void }) {
  const { rows, setRows, loading } = useList<ServerReview>("/api/admin/reviews", "reviews", onToast);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    all: rows.length,
  }), [rows]);
  const filtered = rows.filter((r) => (tab === "all" || r.status === tab) && `${r.name} ${r.slug} ${r.comment}`.toLowerCase().includes(query.trim().toLowerCase()));

  const moderate = async (review: ServerReview, status: ServerReview["status"]) => {
    const prev = rows;
    setRows((list) => list.map((r) => (r.id === review.id ? { ...r, status } : r)));
    try {
      await api(`/api/admin/reviews/${review.id}`, { method: "PATCH", body: { status } });
      onToast(status === "approved" ? "نظر تأیید و روی صفحه محصول منتشر شد" : status === "rejected" ? "نظر رد شد" : "نظر به حالت بررسی برگشت");
    } catch (e) { setRows(prev); onToast(e instanceof Error ? e.message : "عملیات ناموفق بود"); }
  };

  const remove = async (review: ServerReview) => {
    if (!window.confirm(`نظر «${review.name}» برای همیشه حذف شود؟`)) return;
    const prev = rows;
    setRows((list) => list.filter((r) => r.id !== review.id));
    try { await api(`/api/admin/reviews/${review.id}`, { method: "DELETE" }); onToast("نظر حذف شد"); }
    catch (e) { setRows(prev); onToast(e instanceof Error ? e.message : "حذف ناموفق بود"); }
  };

  return (
    <div className="grid gap-5">
      <PanelHeader title="نظرات مشتریان" description="نظرات واقعی ثبت‌شده در صفحه محصولات؛ فقط نظرات تأییدشده به بازدیدکنندگان نمایش داده می‌شود." />
      <div className="flex flex-wrap items-center gap-2">
        {([["pending", "در انتظار"], ["approved", "تأییدشده"], ["rejected", "ردشده"], ["all", "همه"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("chip !text-[11px]", tab === id && "chip-active")}>{label} ({fa(counts[id])})</button>
        ))}
        <div className="relative ms-auto min-w-52 flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
          <input className="input pe-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو…" />
        </div>
      </div>
      {loading ? <div className="grid h-32 place-items-center"><LoaderCircle className="size-6 animate-spin text-brand-400" /></div> : filtered.length === 0 ? (
        <EmptyState icon={<MessageSquare className="size-7" />} title={tab === "pending" ? "نظر در انتظاری نیست" : "نظری پیدا نشد"} description="نظرات ثبت‌شده مشتریان در صفحه هر محصول اینجا می‌آیند." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((review) => (
            <Card key={review.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-black">{review.name}
                    <span className="flex items-center gap-0.5 text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("size-3.5", i < review.rating ? "fill-current" : "opacity-25")} />)}</span>
                    <Badge tone={review.status === "approved" ? "green" : review.status === "pending" ? "amber" : "rose"}>{review.status === "approved" ? "منتشر شده" : review.status === "pending" ? "در انتظار" : "رد شده"}</Badge>
                  </p>
                  <p className="mt-1 text-[10px] tfaint"><span dir="ltr">{review.slug}</span> · {new Date(review.date).toLocaleString("fa-IR")}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {review.status !== "approved" && <button onClick={() => void moderate(review, "approved")} className="btn btn-ghost px-3 py-2 text-[11px] !text-emerald-400"><Check className="size-3.5" /> تأیید</button>}
                  {review.status !== "rejected" && <button onClick={() => void moderate(review, "rejected")} className="btn btn-ghost px-3 py-2 text-[11px] !text-amber-400"><X className="size-3.5" /> رد</button>}
                  <button onClick={() => void remove(review)} className="btn btn-ghost px-3 py-2 text-[11px] !text-rose-400"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
              <blockquote className="mt-3 text-[13px] leading-7 tdim">{review.comment}</blockquote>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- staff ---------------------------------- */
export function ServerStaffPanel({ onToast, isOwner }: { onToast: (m: string) => void; isOwner: boolean }) {
  const { rows, setRows, loading, reload } = useList<ServerStaff>("/api/admin/staff", "staff", onToast);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  if (!isOwner) return <Notice tone="warning">مدیریت کارکنان فقط برای مدیر اصلی است. شما با دسترسی کارمند وارد شده‌اید.</Notice>;

  const create = async () => {
    setBusy(true);
    try {
      await api("/api/admin/staff", { method: "POST", body: { ...form, permissions: { orders: { read: true, write: false } } } });
      setForm({ name: "", email: "", password: "" });
      await reload();
      onToast("حساب کارمند ساخته شد؛ مجوزها را تنظیم کنید");
    } catch (e) { onToast(e instanceof Error ? e.message : "ساخت حساب ناموفق بود"); }
    finally { setBusy(false); }
  };

  const update = async (staff: ServerStaff, body: Record<string, unknown>, message: string) => {
    try { await api(`/api/admin/staff/${staff.id}`, { method: "PATCH", body }); await reload(); onToast(message); }
    catch (e) { onToast(e instanceof Error ? e.message : "ذخیره ناموفق بود"); }
  };

  const remove = async (staff: ServerStaff) => {
    if (!window.confirm(`حساب «${staff.name}» و همه نشست‌هایش حذف شود؟`)) return;
    try { await api(`/api/admin/staff/${staff.id}`, { method: "DELETE" }); setRows((list) => list.filter((r) => r.id !== staff.id)); if (selectedId === staff.id) setSelectedId(null); onToast("حساب کارمند حذف شد"); }
    catch (e) { onToast(e instanceof Error ? e.message : "حذف ناموفق بود"); }
  };

  const togglePerm = (module: string, key: "read" | "write") => {
    if (!selected) return;
    const current = selected.permissions[module] ?? { read: false, write: false };
    const next = { ...current, [key]: !current[key] };
    if (key === "write" && next.write) next.read = true;
    if (key === "read" && !next.read) next.write = false;
    void update(selected, { permissions: { ...selected.permissions, [module]: next } }, "مجوز به‌روزرسانی شد");
  };

  return (
    <div className="grid gap-5">
      <PanelHeader title="کارکنان و دسترسی‌ها" description="حساب‌های واقعی روی سرور؛ مجوزها در همان لحظه در API اعمال می‌شوند و غیرفعال‌سازی، همه نشست‌ها را می‌بندد." />
      <Card title="کارمند جدید" description="رمز حداقل ۱۲ کاراکتر؛ کارمند می‌تواند بعداً ورود دومرحله‌ای خودش را فعال کند">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="نام"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="ایمیل"><input className="input" dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="رمز اولیه"><input className="input" dir="ltr" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        </div>
        <button onClick={() => void create()} disabled={busy || form.name.trim().length < 3 || !form.email.includes("@") || form.password.length < 12} className="btn btn-primary mt-4 px-5 py-2.5 text-xs disabled:opacity-50">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} ساخت حساب کارمند
        </button>
      </Card>

      {loading ? <div className="grid h-32 place-items-center"><LoaderCircle className="size-6 animate-spin text-brand-400" /></div> : rows.length === 0 ? (
        <EmptyState icon={<UserCog className="size-7" />} title="هنوز کارمندی ندارید" description="فعلاً فقط شما (مدیر اصلی) به پنل دسترسی دارید." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="self-start">
            <div className="grid gap-2">
              {rows.map((staff) => (
                <button key={staff.id} onClick={() => { setSelectedId(staff.id); setNewPassword(""); }} className={cn("rounded-2xl border p-3 text-start transition", selectedId === staff.id ? "border-brand-500/40 bg-brand-500/10" : "bd soft-h")}>
                  <span className="flex items-center justify-between gap-2"><b className="text-xs">{staff.name}</b><Badge tone={staff.active ? "green" : "rose"}>{staff.active ? "فعال" : "غیرفعال"}</Badge></span>
                  <span className="mt-1 block truncate text-[10px] tdim" dir="ltr">{staff.email}</span>
                </button>
              ))}
            </div>
          </Card>
          {selected ? (
            <Card title={selected.name} description={selected.email} action={<button onClick={() => void remove(selected)} className="btn btn-ghost px-3 py-2 text-[11px] !text-rose-400"><Trash2 className="size-3.5" /> حذف حساب</button>}>
              <div className="grid gap-4">
                <Toggle checked={selected.active} onChange={(active) => void update(selected, { active }, active ? "حساب فعال شد" : "حساب غیرفعال و همه نشست‌ها بسته شد")} label="دسترسی به پنل" description="غیرفعال‌سازی بلافاصله نشست‌های فعلی را می‌بندد" />
                <div className="overflow-x-auto rounded-2xl border bd">
                  <table className="w-full min-w-[420px] text-xs">
                    <thead><tr className="border-b bd text-[10px] tfaint"><th className="px-4 py-2.5 text-start">ماژول</th><th className="px-4 py-2.5">خواندن</th><th className="px-4 py-2.5">نوشتن</th></tr></thead>
                    <tbody>
                      {STAFF_MODULES.map((module) => {
                        const perm = selected.permissions[module] ?? { read: false, write: false };
                        return (
                          <tr key={module} className="border-b bd last:border-0">
                            <td className="px-4 py-2.5 font-bold">{MODULE_LABELS[module]}</td>
                            {(["read", "write"] as const).map((key) => (
                              <td key={key} className="px-4 py-2.5 text-center">
                                <button onClick={() => togglePerm(module, key)} className={cn("mx-auto grid size-7 place-items-center rounded-lg border transition", perm[key] ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300" : "bd tfaint hover:border-brand-500/40")} aria-label={`${MODULE_LABELS[module]} ${key}`}>
                                  {perm[key] ? <Check className="size-4" /> : <X className="size-3.5" />}
                                </button>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="رمز جدید (ریست توسط مدیر)" className="min-w-56 flex-1"><input className="input" dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="حداقل ۱۲ کاراکتر" /></Field>
                  <button disabled={newPassword.length < 12} onClick={() => { void update(selected, { password: newPassword }, "رمز کارمند ریست و نشست‌هایش بسته شد"); setNewPassword(""); }} className="btn btn-ghost px-4 py-2.5 text-xs disabled:opacity-50"><KeyRound className="size-4" /> ریست رمز</button>
                </div>
                {selected.totpEnabled && <Badge tone="green"><ShieldCheck className="size-3" /> ورود دومرحله‌ای فعال است</Badge>}
              </div>
            </Card>
          ) : <Notice>یک کارمند را از فهرست انتخاب کنید تا مجوزهایش را تنظیم کنید.</Notice>}
        </div>
      )}
    </div>
  );
}

/* --------------------- owner-assisted customer password reset ---------------- */
export function CustomerResetButton({ phone, onToast }: { phone: string; onToast: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [temp, setTemp] = useState<{ name: string; tempPassword: string } | null>(null);

  const reset = async () => {
    if (!window.confirm(`رمز حساب «${phone}» ریست شود؟ رمز یک‌بارمصرف فقط همین یک‌بار نمایش داده می‌شود و همه نشست‌های مشتری بسته می‌شود.`)) return;
    setBusy(true);
    try { setTemp(await api<{ name: string; tempPassword: string }>("/api/admin/customers/reset-password", { method: "POST", body: { phone } })); }
    catch (e) { onToast(e instanceof Error ? e.message : "ریست رمز ناموفق بود"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={() => void reset()} disabled={busy} className="btn btn-ghost px-2.5 py-1.5 text-[10px]" title="ریست رمز حساب مشتری (بعد از احراز هویت تلفنی)">
        {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />} رمز
      </button>
      {temp && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setTemp(null); }}>
          <div className="w-full max-w-sm rounded-3xl border bd bg-ink-900 p-6 text-center shadow-2xl animate-fade-up">
            <KeyRound className="mx-auto size-8 text-brand-400" />
            <h3 className="mt-3 text-sm font-black">رمز یک‌بارمصرف {temp.name}</h3>
            <p className="mt-2 text-[11px] leading-6 tdim">بعد از احراز هویت تلفنی، این رمز را به مشتری بدهید و بخواهید بلافاصله پس از ورود آن را عوض کند.</p>
            <code className="mt-4 block select-all rounded-xl soft p-3 font-mono text-lg font-black tracking-widest text-brand-300" dir="ltr">{temp.tempPassword}</code>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { void navigator.clipboard?.writeText(temp.tempPassword); onToast("رمز کپی شد"); }} className="btn btn-primary flex-1 py-2.5 text-xs"><Copy className="size-4" /> کپی</button>
              <button onClick={() => setTemp(null)} className="btn btn-ghost flex-1 py-2.5 text-xs">بستم</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
