"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  Check,
  ClipboardList,
  BarChart3,
  Settings,
  ShieldCheck,
  Sparkles,
  Plug,
  CreditCard,
  ImageIcon,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  FileText,
  Wallet,
  Tags,
  Handshake,
  BookOpen,
  Warehouse,
  Truck,
  RotateCcw,
  UserRound,
  FileClock,
  Database,
  PanelsTopLeft,
  Upload,
} from "lucide-react";
import { cn, fa, toEnDigits } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/options";

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "خطا در انجام عملیات");
  return data;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "خطا");

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/auth/login", "POST", email.trim() ? { email: email.trim(), password, totpCode } : { password, totpCode }) as { startPath?: string };
      router.replace(result.startPath || "/admin");
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="block">
        <span className="label">ایمیل کارمند (برای مدیر اصلی خالی بگذارید)</span>
        <input type="email" className="input text-left" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      </label>
      <label className="block">
        <span className="label">رمز عبور</span>
        <input type="password" className="input text-left" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus required />
      </label>
      <label className="block">
        <span className="label">کد دومرحله‌ای (در صورت فعال‌سازی)</span>
        <input inputMode="numeric" maxLength={6} className="input text-left" dir="ltr" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" placeholder="000000" />
      </label>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary py-3.5">
        {busy && <LoaderCircle className="size-4 animate-spin" />} ورود به پنل مدیریت
      </button>
    </form>
  );
}

export function AdminNav({ badges, permissions = ["*"], owner = true }: { badges: { orders: number; reviews: number; messages: number }; permissions?: string[]; owner?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = [
    { title: "مرکز کنترل", items: [
      { href: "/admin", label: "داشبورد", icon: LayoutDashboard, badge: 0 },
      { href: "/admin/analytics", label: "تحلیل و آمار", icon: BarChart3, badge: 0 },
    ] },
    { title: "فروش و کاتالوگ", items: [
      { href: "/admin/orders", label: "سفارش‌ها و ارسال", icon: ClipboardList, badge: badges.orders },
      { href: "/admin/returns", label: "مرجوعی و بازپرداخت", icon: RotateCcw, badge: 0 },
      { href: "/admin/inventory", label: "انبار و گردش موجودی", icon: Warehouse, badge: 0 },
      { href: "/admin/purchasing", label: "تأمین‌کنندگان و خرید", icon: Truck, badge: 0 },
      { href: "/admin/products", label: "محصولات و ویرایش گروهی", icon: Package, badge: 0 },
      { href: "/admin/vehicle-catalog", label: "دسته‌بندی خودروها", icon: Package, badge: 0 },
      { href: "/admin/customers", label: "مشتریان", icon: Users, badge: 0 },
      { href: "/admin/promotions", label: "تخفیف‌ها و کمپین‌ها", icon: Tags, badge: 0 },
      { href: "/admin/payments", label: "پرداخت‌ها و درگاه‌ها", icon: CreditCard, badge: 0 },
      { href: "/admin/accounting", label: "حسابداری و دفتر مالی", icon: Wallet, badge: 0 },
    ] },
    { title: "محتوا و ارتباط", items: [
      { href: "/admin/pages", label: "مدیریت صفحات و نوشته‌ها", icon: FileText, badge: 0 },
      { href: "/admin/blog", label: "مدیریت مقالات", icon: BookOpen, badge: 0 },
      { href: "/admin/images", label: "کتابخانه تصاویر", icon: ImageIcon, badge: 0 },
      { href: "/admin/content", label: "محتوا و ابزارهای هوش مصنوعی", icon: Sparkles, badge: 0 },
      { href: "/admin/reviews", label: "نظرات مشتریان", icon: MessageSquare, badge: badges.reviews },
      { href: "/admin/messages", label: "پیام‌ها و درخواست‌ها", icon: Inbox, badge: badges.messages },
    ] },
    { title: "پلتفرم و همکاری", items: [
      { href: "/admin/collaboration", label: "همکاری فنی با سایت و API", icon: Handshake, badge: 0 },
      { href: "/admin/affiliates", label: "همکاران فروش و پورسانت", icon: UserRound, badge: 0 },
      { href: "/admin/page-builder", label: "صفحه‌ساز بلوکی", icon: PanelsTopLeft, badge: 0 },
      { href: "/admin/audit", label: "گزارش فعالیت مدیر", icon: FileClock, badge: 0 },
      { href: "/admin/system", label: "سلامت سیستم و پشتیبان", icon: Database, badge: 0 },
      { href: "/admin/integrations", label: "مدیریت کلیدهای ایجنت", icon: Plug, badge: 0 },
      { href: "/admin/settings", label: "تنظیمات پیشرفته", icon: Settings, badge: 0 },
      { href: "/admin/staff", label: "مدیریت کارکنان و دسترسی‌ها", icon: Users, badge: 0, ownerOnly: true },
      { href: "/admin/my-security", label: "امنیت حساب من", icon: ShieldCheck, badge: 0 },
    ] },
  ];
  const permissionForHref = (href: string) => {
    if (href === "/admin") return "dashboard:read";
    const key = href.split("/")[2] || "";
    const map: Record<string,string> = { analytics:"analytics:read", orders:"orders:read", returns:"returns:read", inventory:"inventory:read", purchasing:"inventory:read", products:"catalog:read", "vehicle-catalog":"catalog:read", customers:"customers:read", promotions:"content:read", payments:"payments:read", accounting:"finance:read", pages:"content:read", blog:"content:read", images:"content:read", content:"content:read", reviews:"support:read", messages:"support:read", collaboration:"integrations:read", affiliates:"affiliates:read", "page-builder":"content:read", audit:"security:read", system:"security:read", integrations:"integrations:read", settings:"content:read", staff:"security:read" };
    return map[key] || "security:read";
  };
  const visibleGroups = groups.map(group => ({...group, items: group.items.filter((it: any) => {
    if (it.ownerOnly && !owner) return false;
    if (owner || it.href === "/admin/my-security") return true;
    const required = permissionForHref(it.href);
    const module = required.split(":")[0];
    return permissions.includes(required) || permissions.includes(`${module}:write`) || permissions.includes(`${module}:*`);
  })})).filter(group => group.items.length > 0);
  const logout = async () => {
    await api("/api/auth/logout", "POST").catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  };
  return (
    <>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:mt-8 lg:grid">
        {visibleGroups.map((group) => (
          <div key={group.title} className="mb-3 min-w-0">
            <p className="mb-1 px-3 pt-2 text-[10px] font-bold tracking-wide text-white/30">{group.title}</p>
            <div className="grid gap-1">
              {group.items.map((it) => {
                const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
                return (
                  <Link key={it.href} href={it.href} className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                    active ? "bg-brand-500/15 text-brand-200" : "text-[#fff]/60 soft-h hover:text-[#fff]",
                  )}>
                    <it.icon className="size-5" />
                    <span className="min-w-0 flex-1">{it.label}</span>
                    {it.badge > 0 && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-black text-[#fff]">{fa(it.badge)}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto hidden gap-2 pt-6 lg:grid">
        <Link href="/" target="_blank" className="btn btn-ghost py-2.5 text-xs">
          <ExternalLink className="size-4" /> مشاهده فروشگاه
        </Link>
        <button onClick={logout} className="btn btn-ghost py-2.5 text-xs text-rose-300">
          <LogOut className="size-4" /> خروج از حساب
        </button>
      </div>
      <button onClick={logout} className="btn btn-ghost mt-3 py-2 text-xs text-rose-300 lg:hidden">
        <LogOut className="size-4" /> خروج
      </button>
    </>
  );
}

export function AdminAction({
  url,
  method = "PATCH",
  body,
  children,
  confirmText,
  className = "btn-ghost",
}: {
  url: string;
  method?: "PATCH" | "DELETE" | "POST";
  body?: unknown;
  children: ReactNode;
  confirmText?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await api(url, method, body);
      start(() => router.refresh());
    } catch (e) {
      window.alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={run} disabled={busy || pending} className={cn("btn px-3 py-2 text-xs", className)}>
      {(busy || pending) && <LoaderCircle className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function OrderControls({ id, status, paymentStatus, paymentMethod, hasPendingManualTransfer }: { id: number; status: string; paymentStatus: string; paymentMethod: string; hasPendingManualTransfer: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [p, setP] = useState(paymentStatus);
  const [busy, setBusy] = useState(false);
  const confirmManualPayment = async () => {
    if (!window.confirm("فقط در صورتی ادامه دهید که رسید بانکی و واریز واقعی را بررسی کرده‌اید. پرداخت تأیید شود؟")) return;
    setBusy(true);
    try {
      await api(`/api/admin/orders/${id}/confirm-manual-payment`, "POST", {});
      setP("paid");
      router.refresh();
    } catch (e) {
      window.alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const update = async (patch: { status?: string; paymentStatus?: string }) => {
    setBusy(true);
    try {
      await api(`/api/admin/orders/${id}`, "PATCH", patch);
      router.refresh();
    } catch (e) {
      window.alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input !w-auto !py-2 text-xs"
        value={s}
        disabled={busy}
        onChange={(e) => {
          setS(e.target.value);
          update({ status: e.target.value });
        }}
        aria-label="وضعیت سفارش"
      >
        {ORDER_STATUSES.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <select
        className="input !w-auto !py-2 text-xs"
        value={p}
        disabled={busy || p === "paid"}
        onChange={(e) => {
          setP(e.target.value);
          update({ paymentStatus: e.target.value });
        }}
        aria-label="وضعیت پرداخت"
      >
        {p === "paid" && <option value="paid">{PAYMENT_STATUSES.paid.name} (قفل‌شده)</option>}
        {Object.entries(PAYMENT_STATUSES).filter(([k]) => k !== "paid").map(([k, v]) => (
          <option key={k} value={k}>
            {v.name}
          </option>
        ))}
      </select>
      {p === "paid" && <span className="text-[10px] text-emerald-300">پرداخت تأییدشده؛ فقط از مسیر بازپرداخت تغییر می‌کند</span>}
      {paymentMethod === "online" && hasPendingManualTransfer && p !== "paid" && s !== "cancelled" && (
        <button type="button" onClick={confirmManualPayment} disabled={busy} className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200 disabled:opacity-50">
          تأیید واریز کارت‌به‌کارت
        </button>
      )}
      {busy && <LoaderCircle className="size-4 animate-spin text-white/50" />}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} aria-label={label} aria-pressed={checked} className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-brand-500" : "soft")}>
      <span className={cn("absolute top-1 size-4 rounded-full bg-photo transition-all", checked ? "start-6" : "start-1")} />
    </button>
  );
}

export type AdminProductRow = {
  id: number;
  slug: string;
  title: string;
  description: string;
  specs: { label: string; value: string }[];
  price: number;
  costPrice: number;
  comparePrice: number | null;
  stock: number;
  salesCount: number;
  isFeatured: boolean;
  isActive: boolean;
  image: string;
  images: string[];
  categoryName: string;
};

export function ProductRow({ p }: { p: AdminProductRow }) {
  const router = useRouter();
  const [title, setTitle] = useState(p.title);
  const [description, setDescription] = useState(p.description);
  const [imagesText, setImagesText] = useState((p.images?.length ? p.images : [p.image]).join("\n"));
  const [specsText, setSpecsText] = useState(JSON.stringify(p.specs, null, 2));
  const [price, setPrice] = useState(String(p.price));
  const [costPrice, setCostPrice] = useState(String(p.costPrice));
  const [compare, setCompare] = useState(p.comparePrice ? String(p.comparePrice) : "");
  const [stock, setStock] = useState(String(p.stock));
  const [featured, setFeatured] = useState(p.isFeatured);
  const [active, setActive] = useState(p.isActive);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const uploadProductImage = async (file: File | undefined) => {
    if (!file) return;
    if (!/[.](png|jpe?g|webp)$/i.test(file.name) || file.size > 6 * 1024 * 1024) {
      setImageUploadMessage("فقط JPG، PNG یا WEBP تا ۶ مگابایت مجاز است.");
      return;
    }
    setImageUploading(true);
    setImageUploadMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target", `product:${p.id}`);
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "آپلود تصویر ناموفق بود");
      setImagesText(data.url);
      setImageUploadMessage("تصویر اختصاصی این خودرو ذخیره شد؛ روی محصولات دیگر اثری ندارد.");
      router.refresh();
    } catch (error) {
      setImageUploadMessage(errMsg(error));
    } finally {
      setImageUploading(false);
    }
  };
  const dirty =
    title !== p.title || description !== p.description || imagesText !== (p.images?.length ? p.images : [p.image]).join("\n") || specsText !== JSON.stringify(p.specs, null, 2) ||
    price !== String(p.price) ||
    costPrice !== String(p.costPrice) ||
    compare !== (p.comparePrice ? String(p.comparePrice) : "") ||
    stock !== String(p.stock) ||
    featured !== p.isFeatured ||
    active !== p.isActive;

  const save = async () => {
    setBusy(true);
    try {
      let specs: {label:string;value:string}[];
      try { specs = JSON.parse(specsText); if (!Array.isArray(specs)) throw new Error(); }
      catch { throw new Error("مشخصات باید JSON معتبر و به شکل آرایه باشند."); }
      await api(`/api/admin/products/${p.id}`, "PATCH", {
        title, description, images: imagesText.split(/\n|,/).map((v) => v.trim()).filter(Boolean), specs,
        price: Number(toEnDigits(price).replace(/\D/g, "")),
        costPrice: Number(toEnDigits(costPrice).replace(/\D/g, "")),
        comparePrice: compare ? Number(toEnDigits(compare).replace(/\D/g, "")) : null,
        stock: Number(toEnDigits(stock).replace(/\D/g, "")),
        isFeatured: featured,
        isActive: active,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e) {
      window.alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`محصول «${p.title}» حذف شود؟`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${p.id}`, "DELETE");
      router.refresh();
    } catch (e) {
      window.alert(errMsg(e));
      setBusy(false);
    }
  };

  return (
    <tr className={cn("border-b bd align-middle", !active && "opacity-50")}>
      <td className="min-w-72 py-3 pe-3">
        <div className="flex items-center gap-3">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-ink-700">
            <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <Link href={`/products/${p.slug}`} target="_blank" className="line-clamp-1 text-xs font-bold hover:text-brand-300">
              {p.title}
            </Link>
            <p className="mt-0.5 text-[11px] text-white/40">{p.categoryName}</p>
            <details className="mt-2 max-w-2xl">
              <summary className="cursor-pointer text-[11px] text-brand-300">ویرایش کامل مشخصات و تصاویر</summary>
              <div className="mt-2 grid min-w-[520px] gap-2 rounded-xl border bd bg-ink-900 p-3">
                <label className="grid gap-1 text-xs">عنوان محصول<input className="input" value={title} onChange={e=>setTitle(e.target.value)} /></label>
                <label className="grid gap-1 text-xs">توضیحات<textarea className="input min-h-20" value={description} onChange={e=>setDescription(e.target.value)} /></label>
                <label className="grid gap-1 text-xs">تصاویر (هر مسیر در یک خط؛ اولین مسیر تصویر اصلی)<textarea className="input min-h-16" value={imagesText} onChange={e=>setImagesText(e.target.value)} /></label>
                <label className="btn btn-ghost w-fit cursor-pointer gap-2 py-2.5 text-xs">
                  {imageUploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  بارگذاری عکس اختصاصی همین خودرو
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={imageUploading} onChange={(e) => void uploadProductImage(e.target.files?.[0])} />
                </label>
                {imageUploadMessage && <p className="text-xs text-emerald-300">{imageUploadMessage}</p>}
                <label className="grid gap-1 text-xs">مشخصات فنی به‌صورت JSON<textarea dir="ltr" className="input min-h-28 font-mono text-xs" value={specsText} onChange={e=>setSpecsText(e.target.value)} /></label>
                <p className="text-[11px] text-white/45">نمونه مشخصات: [{'{'}"label":"جنس","value":"چرم پنج‌بعدی"{'}'}]</p>
              </div>
            </details>
          </div>
        </div>
      </td>
      <td className="px-2">
        <input className="input !w-32 !py-2 text-xs" dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="قیمت" />
      </td>
      <td className="px-2">
        <input className="input !w-32 !py-2 text-xs" dir="ltr" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} aria-label="بهای تمام‌شده" />
      </td>
      <td className="px-2">
        <input className="input !w-32 !py-2 text-xs" dir="ltr" value={compare} onChange={(e) => setCompare(e.target.value)} placeholder="—" aria-label="قیمت قبل" />
      </td>
      <td className="px-2">
        <input className="input !w-20 !py-2 text-xs" dir="ltr" value={stock} onChange={(e) => setStock(e.target.value)} aria-label="موجودی" />
      </td>
      <td className="px-2 text-xs text-white/60">{fa(p.salesCount)}</td>
      <td className="px-2">
        <Toggle checked={featured} onChange={setFeatured} label="ویژه" />
      </td>
      <td className="px-2">
        <Toggle checked={active} onChange={setActive} label="فعال" />
      </td>
      <td className="ps-2">
        <div className="flex gap-1.5">
          <button onClick={save} disabled={!dirty || busy} className="btn btn-primary px-3 py-2 text-xs">
            {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
          </button>
          <button onClick={remove} disabled={busy} className="btn btn-ghost px-3 py-2 text-xs text-rose-300" aria-label="حذف">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

type CreateProps = {
  categories: { id: number; name: string }[];
  brands: { slug: string; name: string; models: { id: number; name: string }[] }[];
  images: string[];
};

export function ProductCreateForm({ categories, brands, images }: CreateProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    categoryId: String(categories[0]?.id ?? ""),
    brand: "",
    modelId: "",
    price: "",
    costPrice: "0",
    comparePrice: "",
    stock: "50",
    image: images[0] ?? "",
    description: "",
    isFeatured: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; slug?: string } | null>(null);
  const models = brands.find((b) => b.slug === form.brand)?.models ?? [];
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = (await api("/api/admin/products", "POST", {
        ...form,
        categoryId: Number(form.categoryId),
        modelId: form.modelId ? Number(form.modelId) : null,
      })) as { slug?: string };
      setMsg({ ok: true, text: "محصول با موفقیت ایجاد شد", slug: res.slug });
      setForm((f) => ({ ...f, title: "", price: "", comparePrice: "", description: "" }));
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block sm:col-span-2">
        <span className="label">عنوان محصول</span>
        <input className="input" value={form.title} onChange={set("title")} required minLength={3} placeholder="مثلاً: کفپوش پنج بعدی چرمی گلدوزی ..." />
      </label>
      <label className="block">
        <span className="label">دسته‌بندی</span>
        <select className="input" value={form.categoryId} onChange={set("categoryId")}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">تصویر</span>
        <select className="input" value={form.image} onChange={set("image")}>
          {images.map((src) => (
            <option key={src} value={src}>
              {src.replace("/images/", "")}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">برند خودرو (اختیاری)</span>
        <select className="input" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value, modelId: "" }))}>
          <option value="">عمومی (همه خودروها)</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">مدل خودرو</span>
        <select className="input" value={form.modelId} onChange={set("modelId")} disabled={!form.brand}>
          <option value="">—</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">قیمت (تومان)</span>
        <input className="input" dir="ltr" inputMode="numeric" value={form.price} onChange={set("price")} required placeholder="7500000" />
      </label>
      <label className="block">
        <span className="label">بهای تمام‌شده (تومان)</span>
        <input className="input" dir="ltr" inputMode="numeric" value={form.costPrice} onChange={set("costPrice")} placeholder="هزینه خرید یا تولید" />
      </label>
      <label className="block">
        <span className="label">قیمت قبل از تخفیف</span>
        <input className="input" dir="ltr" inputMode="numeric" value={form.comparePrice} onChange={set("comparePrice")} placeholder="اختیاری" />
      </label>
      <label className="block">
        <span className="label">موجودی</span>
        <input className="input" dir="ltr" inputMode="numeric" value={form.stock} onChange={set("stock")} />
      </label>
      <label className="block sm:col-span-2 lg:col-span-3">
        <span className="label">توضیحات</span>
        <input className="input" value={form.description} onChange={set("description")} placeholder="در صورت خالی بودن، توضیح دسته‌بندی استفاده می‌شود" />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} className="size-4 accent-orange-500" />
          نمایش در محصولات ویژه
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary ms-auto px-6 py-3 text-sm">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} افزودن محصول
        </button>
      </div>
      {msg && (
        <p className={cn("text-sm sm:col-span-2 lg:col-span-4", msg.ok ? "text-emerald-300" : "text-rose-300")}>
          {msg.text}
          {msg.slug && (
            <Link href={`/products/${msg.slug}`} target="_blank" className="ms-2 underline">
              مشاهده
            </Link>
          )}
        </p>
      )}
    </form>
  );
}

export function OrderOperations({ id, trackingNumber, adminNote }: { id: number; trackingNumber: string; adminNote: string }) {
  const router = useRouter();
  const [tracking, setTracking] = useState(trackingNumber);
  const [note, setNote] = useState(adminNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      await api(`/api/admin/orders/${id}`, "PATCH", { trackingNumber: tracking, adminNote: note });
      setMessage("ذخیره شد");
      router.refresh();
    } catch (e) {
      setMessage(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-bold text-white/70">عملیات تکمیلی سفارش</p>
      <label className="grid gap-1 text-xs text-white/55">
        کد رهگیری مرسوله
        <input className="input" dir="ltr" maxLength={100} placeholder="کد رهگیری پست یا شرکت حمل" value={tracking} onChange={e => setTracking(e.target.value)} />
      </label>
      <label className="grid gap-1 text-xs text-white/55">
        یادداشت داخلی مدیر (برای مشتری نمایش داده نمی‌شود)
        <textarea className="input min-h-20 resize-y" maxLength={2000} placeholder="مثلاً: برای ارسال با مشتری هماهنگ شود…" value={note} onChange={e => setNote(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="btn btn-primary px-4 py-2 text-xs">{busy ? "در حال ذخیره…" : "ذخیره اطلاعات سفارش"}</button>
        {message && <span role="status" className="text-xs text-white/60">{message}</span>}
      </div>
    </div>
  );
}
