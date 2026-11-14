import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgePercent,
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Percent,
  Plus,
  Printer,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { CarFront, Coins, FileText, Handshake, History, Layers, Pencil, UserCog } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Bot, Download, Globe, Image as ImageIcon, Rocket } from "lucide-react";
import { downloadFullProjectZip } from "@/lib/project-zip";
import { AffiliatesPanel, AuditPanel, ContentPanel, FinancePanel, StaffPanel, SystemPanel } from "@/pages/admin/Panels";
import { PagesPanel } from "@/pages/admin/PagesPanel";
import { MediaPanel } from "@/pages/admin/MediaPanel";
import { PaymentsPanel } from "@/pages/admin/PaymentsPanel";
import { AgentsPanel } from "@/pages/admin/AgentsPanel";
import { DeployPanel } from "@/pages/admin/DeployPanel";
import { MediaPicker } from "@/pages/admin/MediaPicker";
import { CarImagesPanel } from "@/pages/admin/CarImagesPanel";
import { clearProductOverrides, setProductOverride } from "@/lib/product-overrides";
import {
  ORDER_STATUS,
  customerRows,
  dateFa,
  downloadCSV,
  verifyAdminPassword,
  setAdminPassword,

  loadAdmin,
  makeAuditEntry,
  mergeLiveOrders,
  money,
  ordersToCSV,
  patchStoredOrder,
  printInvoice,
  printLabel,
  resetAdmin,
  revenueSeries,
  saveAdmin,
  shippingLabel,
  type AdminOrder,
  type AdminState,
} from "@/lib/admin";
import { BRANDS } from "@/lib/catalog";
import {
  getCustomProducts,
  getSubItems,
  makeId,
  makeSlug,
  setCustomProducts,
  setSubItems,
  type CustomProduct,
} from "@/lib/product-overrides";
import { api, isServerMode } from "@/lib/api";
import { cn, fa } from "@/lib/format";

type Module =
  | "dashboard"
  | "orders"
  | "products"
  | "car-images"
  | "customers"
  | "affiliates"
  | "coupons"
  | "finance"
  | "cms"
  | "reviews"
  | "staff"
  | "settings"
  | "audit"
  | "pages"
  | "media"
  | "payments"
  | "agents"
  | "deploy";

const NAV: { group: string; items: { id: Module; label: string; icon: typeof LayoutDashboard }[] }[] = [
  { group: "مرکز کنترل", items: [
    { id: "dashboard", label: "داشبورد", icon: LayoutDashboard },
    { id: "audit", label: "لاگ فعالیت", icon: History },
  ] },
  {
    group: "فروش و کاتالوگ",
    items: [
      { id: "orders", label: "سفارش‌ها", icon: ClipboardList },
      { id: "products", label: "محصولات", icon: Package },
      { id: "car-images", label: "تصاویر خودرو", icon: CarFront },
      { id: "customers", label: "مشتریان", icon: Users },
      { id: "affiliates", label: "همکاری در فروش", icon: Handshake },
      { id: "coupons", label: "کدهای تخفیف", icon: BadgePercent },
      { id: "finance", label: "مالی و سود", icon: Coins },
    ],
  },
  {
    group: "محتوا و ارتباط",
    items: [
      { id: "cms", label: "محتوای سایت", icon: FileText },
      { id: "reviews", label: "نظرات", icon: MessageSquare },
      { id: "staff", label: "کارکنان", icon: UserCog },
      { id: "settings", label: "تنظیمات", icon: Settings },
    ],
  },
  {
    group: "کنترل پیشرفته",
    items: [
      { id: "pages", label: "صفحات و SEO", icon: Globe },
      { id: "media", label: "کتابخانه تصاویر", icon: ImageIcon },
      { id: "payments", label: "درگاه‌های پرداخت", icon: CreditCard },
      { id: "agents", label: "ایجنت‌های AI", icon: Bot },
    ],
  },
  {
    group: "زیرساخت",
    items: [
      { id: "deploy", label: "استقرار و امنیت", icon: Rocket },
    ],
  },
];

const TONE: Record<string, string> = {
  amber: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  blue: "bg-blue-400/15 text-blue-300 border-blue-400/30",
  violet: "bg-violet-400/15 text-violet-300 border-violet-400/30",
  cyan: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
  green: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  rose: "bg-rose-400/15 text-rose-300 border-rose-400/30",
};
const PAY_LABEL: Record<AdminOrder["payment"], string> = {
  paid: "پرداخت شده",
  pending: "در انتظار پرداخت",
  cod: "پرداخت در محل",
  refunded: "بازگشت وجه",
};
const PAY_TONE: Record<AdminOrder["payment"], string> = {
  paid: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  pending: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  cod: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  refunded: "bg-rose-400/15 text-rose-300 border-rose-400/30",
};

const AUTH_KEY = "50500_admin_auth";
/** Sessions expire after 12 hours; a stale or hand-crafted flag no longer works. */
const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

function readAuth() {
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(AUTH_KEY) : null;
    if (!raw) return false;
    const issued = Number(raw);
    if (!Number.isFinite(issued) || Date.now() - issued > AUTH_TTL_MS) {
      window.sessionStorage.removeItem(AUTH_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function writeAuth(value: boolean) {
  try {
    if (value) window.sessionStorage.setItem(AUTH_KEY, String(Date.now()));
    else window.sessionStorage.removeItem(AUTH_KEY);
  } catch {
    /* storage unavailable */
  }
}

function statusMeta(id: string) {
  return ORDER_STATUS.find((s) => s.id === id) ?? ORDER_STATUS[0];
}

const LEATHER_NAMES: Record<string, string> = { black: "مشکی", brown: "قهوه‌ای", tan: "عسلی", cream: "کرم", gray: "طوسی", burgundy: "زرشکی", navy: "سرمه‌ای" };
const THREAD_NAMES: Record<string, string> = { red: "قرمز", orange: "نارنجی", gold: "طلایی", cream: "کرم", brown: "قهوه‌ای", white: "سفید", blue: "آبی", black: "مشکی" };
const leatherName = (id: string) => LEATHER_NAMES[id] ?? id;
const threadName = (id: string) => THREAD_NAMES[id] ?? id;

/* ------------------------------------ shell ------------------------------------ */

export default function Admin() {
  const [authed, setAuthed] = useState(() => readAuth());
  const [module, setModule] = useState<Module>("dashboard");
  const [state, setState] = useState<AdminState>(() => loadAdmin());
  const [sidebar, setSidebar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authed) saveAdmin(state);
  }, [state, authed]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setSidebar(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!authed) return <Login onLogin={() => { writeAuth(true); setAuthed(true); }} />;

  const pendingReviews = state.reviews.filter((r) => r.status === "pending").length;
  const pendingOrders = state.orders.filter((o) => o.status === "pending").length;

  const patch = <K extends keyof AdminState>(key: K, value: AdminState[K]) => setState((s) => ({ ...s, [key]: value }));


  /** Append a timestamped audit row for every meaningful panel action. */
  const onLog = (action: string, moduleName: string) => {
    setState((s) => ({ ...s, audit: [makeAuditEntry(action, moduleName), ...s.audit].slice(0, 300) }));
  };

  /** Toast + automatic audit trail, so no change goes unnoticed. */
  const notify = (message: string) => {
    setToast(message);
    setState((s) => ({ ...s, audit: [makeAuditEntry(message, module), ...s.audit].slice(0, 300) }));
  };

  const pendingPartners = state.affiliates.filter((a) => a.status === "pending").length;

  const filteredOrders = state.orders.filter((o) =>
    !search.trim() ||
    [o.code, o.customer, o.phone, o.city, o.province].some((v) => v.includes(search.trim())),
  );

  return (
    <div dir="rtl" className="relative min-h-screen" style={{ background: "var(--bg)" }}>
      {/* sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[268px] flex-col border-s bd transition-transform duration-300 lg:translate-x-0",
          sidebar ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
        style={{ background: "var(--panel)" }}
      >
        <div className="flex items-center justify-between border-b bd px-5 py-4">
          <Logo />
          <button onClick={() => setSidebar(false)} className="grid size-9 place-items-center rounded-xl soft lg:hidden" aria-label="بستن منو">
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {NAV.map((group) => (
            <div key={group.group} className="mb-4">
              <p className="px-3 pb-2 text-[10px] font-black tracking-widest tfaint">{group.group}</p>
              <div className="grid gap-1">
                {group.items.map((item) => {
                  const on = module === item.id;
                  const count = item.id === "orders" ? pendingOrders : item.id === "reviews" ? pendingReviews : item.id === "affiliates" ? pendingPartners : 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setModule(item.id);
                        setSidebar(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                        on ? "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/25" : "tdim hover:bg-white/5 hover:text-[var(--txt)]",
                      )}
                    >
                      <item.icon className={cn("size-4.5", on ? "text-brand-400" : "opacity-70")} />
                      <span className="flex-1 text-start">{item.label}</span>
                      {count > 0 && (
                        <span className="grid min-w-5 place-items-center rounded-full bg-brand-500 px-1.5 text-[10px] font-black text-white">{fa(count)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t bd p-3">
          <Link to="/" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold tdim transition hover:bg-white/5">
            <Store className="size-4" /> مشاهده فروشگاه <ExternalLink className="ms-auto size-3.5" />
          </Link>
          <button
            onClick={() => {
              writeAuth(false);
              setAuthed(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-400 transition hover:bg-rose-500/10"
          >
            <LogOut className="size-4" /> خروج از حساب
          </button>
          <p className="mt-2 px-3 text-[10px] leading-5 tfaint">
            نسخه نمایشی — داده‌ها در همین مرورگر ذخیره می‌شوند.
          </p>
        </div>
      </aside>

      {sidebar && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebar(false)} />}

      {/* main */}
      <div className="lg:mr-[268px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bd px-4 backdrop-blur-xl sm:px-6" style={{ background: "color-mix(in srgb, var(--panel) 86%, transparent)" }}>
          <button onClick={() => setSidebar(true)} className="grid size-10 place-items-center rounded-xl soft lg:hidden" aria-label="باز کردن منو">
            <Menu className="size-5" />
          </button>
          <div className="relative hidden flex-1 sm:block">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (module !== "orders") setModule("orders");
              }}
              placeholder="جستجوی سفارش، مشتری، شماره موبایل… (Ctrl+K)"
              className="input max-w-md pe-9"
              aria-label="جستجوی سراسری"
            />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                notify("در حال ساخت فایل فشرده کل پروژه…");
                void downloadFullProjectZip().then((n) => notify(`فایل ZIP کامل پروژه (${fa(n)} فایل) دانلود شد`));
              }}
              className="btn btn-primary !rounded-xl px-3 py-2 text-xs"
              title="دانلود کل سورس پروژه + تنظیمات فعلی در یک فایل ZIP"
            >
              <Download className="size-4" /> دانلود پروژه (ZIP)
            </button>
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-400" /> پنل فعال
            </span>
            <Link to="/" className="btn btn-ghost !rounded-xl px-3 py-2 text-xs">
              <ArrowUpRight className="size-4" /> سایت
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {module === "dashboard" && <Dashboard state={state} onGo={(m) => setModule(m)} />}
          {module === "orders" && (
            <Orders orders={filteredOrders} onChange={(orders) => patch("orders", orders)} onToast={notify} onLog={onLog} search={search} />
          )}
          {module === "products" && (
            <Products state={state} onChange={(products) => patch("products", products)} onToast={notify} onLog={onLog} />
          )}
          {module === "car-images" && <CarImagesPanel onToast={notify} />}
          {module === "customers" && <Customers state={state} />}
          {module === "affiliates" && <AffiliatesPanel state={state} patch={patch} onToast={notify} onLog={onLog} />}
          {module === "coupons" && <Coupons state={state} onChange={(coupons) => patch("coupons", coupons)} onToast={notify} />}
          {module === "finance" && <FinancePanel state={state} patch={patch} onToast={notify} onLog={onLog} />}
          {module === "cms" && <ContentPanel onToast={notify} onLog={onLog} />}
          {module === "reviews" && <Reviews state={state} onChange={(reviews) => patch("reviews", reviews)} onToast={notify} />}
          {module === "staff" && <StaffPanel state={state} patch={patch} onToast={notify} onLog={onLog} />}
          {module === "audit" && <AuditPanel state={state} patch={patch} onToast={notify} onLog={onLog} />}
          {module === "pages" && <PagesPanel onToast={notify} onOpenContent={() => setModule("cms")} />}
          {module === "media" && <MediaPanel onToast={notify} />}
          {module === "payments" && <PaymentsPanel onToast={notify} orders={state.orders} />}
          {module === "agents" && <AgentsPanel onToast={notify} orders={state.orders} />}
          {module === "deploy" && <DeployPanel onToast={notify} />}
          {module === "settings" && (
            <>
              <SettingsPanel
                state={state}
                onChange={(settings) => patch("settings", settings)}
                onToast={notify}
                onReset={() => {
                  resetAdmin();
                  clearProductOverrides();
                  setState(loadAdmin());
                  notify("داده‌های نمایشی بازنشانی شد");
                }}
                onChangePassword={async (current, next) => {
                  if (!(await verifyAdminPassword(current))) {
                    notify("رمز فعلی درست نیست");
                    return;
                  }
                  await setAdminPassword(next);
                  writeAuth(false);
                  setAuthed(false);
                  notify("رمز عبور مدیر تغییر کرد؛ با رمز جدید دوباره وارد شوید");
                }}
              />
              <SystemPanel state={state} patch={patch} onToast={notify} onLog={onLog} />
            </>
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-5 py-3 text-sm font-bold text-emerald-300 shadow-2xl backdrop-blur animate-pop">
          <CheckCircle2 className="size-4" /> {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------ login ------------------------------------ */

const LOCK_KEY = "50500_admin_lock";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;

function lockRemainingMs(): number {
  try {
    const raw = sessionStorage.getItem(LOCK_KEY);
    if (!raw) return 0;
    const { until } = JSON.parse(raw) as { until: number };
    return Math.max(0, Number(until) - Date.now());
  } catch {
    return 0;
  }
}

function bumpAttempt(): number {
  try {
    const raw = sessionStorage.getItem(LOCK_KEY);
    const state = raw ? (JSON.parse(raw) as { count: number; until: number }) : { count: 0, until: 0 };
    if (state.until && Date.now() < state.until) return MAX_ATTEMPTS;
    state.count += 1;
    if (state.count >= MAX_ATTEMPTS) {
      state.until = Date.now() + LOCK_MS;
      state.count = 0;
      sessionStorage.setItem(LOCK_KEY, JSON.stringify(state));
      return MAX_ATTEMPTS;
    }
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(state));
    return state.count;
  } catch {
    return 0;
  }
}

function clearAttempts() {
  try {
    sessionStorage.removeItem(LOCK_KEY);
  } catch {
    /* ignore */
  }
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needTotp, setNeedTotp] = useState(false);
  const [totp, setTotp] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const submit = async () => {
    const wait = lockRemainingMs();
    if (wait > 0) {
      setError(`تلاش زیاد؛ ${fa(Math.ceil(wait / 1000))} ثانیه دیگر تلاش کنید.`);
      return;
    }
    if (!password) {
      setError("رمز عبور را وارد کنید.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (isServerMode()) {
        const res = await api<{ needTotp?: boolean }>("/api/admin/login", {
          method: "POST",
          body: { email: "owner", password, ...(totp ? { totp } : {}) },
        });
        if (res?.needTotp) {
          setNeedTotp(true);
          setError("ورود دومرحله‌ای فعال است؛ کد ۶ رقمی برنامه احراز هویت را وارد کنید.");
          return;
        }
        clearAttempts();
        onLogin();
        return;
      }
      if (await verifyAdminPassword(password)) {
        clearAttempts();
        onLogin();
        return;
      }
      const attempts = bumpAttempt();
      setError(attempts >= MAX_ATTEMPTS ? `تلاش زیاد؛ ${fa(LOCK_MS / 1000)} ثانیه قفل شد.` : "رمز نادرست است.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  /* Changing the password always requires the current one — a password that
     anyone can replace from the login screen would be no protection at all. */
  const buildNewPassword = async () => {
    if (!curPw) { setError("رمز فعلی را وارد کنید."); return; }
    if (newPw.length < 8) { setError("رمز جدید باید حداقل ۸ کاراکتر باشد."); return; }
    if (newPw !== newPw2) { setError("تکرار رمز با رمز جدید مطابقت ندارد."); return; }
    setBusy(true);
    try {
      if (!(await verifyAdminPassword(curPw))) {
        setError("رمز فعلی درست نیست.");
        return;
      }
      await setAdminPassword(newPw);
      setPassword(newPw);
      setCurPw("");
      setResetMode(false);
      setError("");
      clearAttempts();
      onLogin();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div dir="rtl" className="grid min-h-screen place-items-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-[2rem] border bd p-7" style={{ background: "var(--surface-1)" }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-[11px] font-bold text-brand-300">
            <ShieldCheck className="size-3.5" /> ورود به مرکز کنترل
          </span>
          <h1 className="mt-4 text-xl font-black">پنل مدیریت 50500</h1>
          <p className="mt-2 text-xs leading-6 tdim">نسخه نمایشی است؛ داده‌ها فقط در همین مرورگر ذخیره می‌شوند.</p>

          <label className="mt-5 grid gap-1.5">
            <span className="text-xs font-bold tdim">ایمیل مدیر</span>
            <input className="input" dir="ltr" defaultValue="ceo@50500.shop" />
          </label>
          <label className="mt-3 grid gap-1.5">
            <span className="text-xs font-bold tdim">رمز عبور</span>
            <span className="relative block">
              <input
                className="input pe-11"
                dir="ltr"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "پنهان‌کردن رمز" : "نمایش رمز"}
                className="absolute inset-y-0 end-0 grid w-11 place-items-center tfaint transition hover:text-brand-300"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          {needTotp && (
            <label className="mt-3 grid gap-1.5">
              <span className="text-xs font-bold tdim">کد ورود دومرحله‌ای</span>
              <input
                className="input"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          )}
          {error && <p className="mt-2 text-[11px] font-bold text-rose-400">{error}</p>}

          <button onClick={() => void submit()} disabled={busy} className="btn btn-primary mt-5 w-full py-3 text-sm disabled:opacity-60">
            <ShieldCheck className="size-4" /> {busy ? "در حال بررسی…" : "ورود به پنل"}
          </button>
          <button
            type="button"
            onClick={() => void downloadFullProjectZip()}
            className="btn btn-ghost mt-2.5 w-full py-3 text-xs"
          >
            <Download className="size-4 text-brand-400" /> دانلود کامل پروژه + تنظیمات (ZIP)
          </button>
          <p className="mt-4 text-center text-[10px] leading-5 tfaint">در نسخه واقعی، ورود با رمز محیطی و تأیید دومرحله‌ای (TOTP) انجام می‌شود.</p>

          {!resetMode ? (
            <details className="mt-3 rounded-xl border bd px-3 py-2.5 text-[11px] leading-6 tdim" style={{ background: "var(--field)" }}>
              <summary className="cursor-pointer font-bold text-brand-300">راهنمای ورود و ساخت رمز جدید (کلیک کنید)</summary>
              <div className="mt-2 grid gap-1.5">
                <p><b>آدرس:</b> <span dir="ltr" className="font-mono">/admin</span></p>
                <p><b>ایمیل:</b> <span dir="ltr" className="font-mono">ceo@50500.shop</span></p>
                <button
                  type="button"
                  onClick={() => { setResetMode(true); setError(""); }}
                  className="btn btn-primary mt-2 w-full py-2.5 text-[11px]"
                >
                  <KeyRound className="size-3.5" /> ساخت رمز جدید همین‌جا
                </button>
                <p className="tfaint">تغییر رمز نیازمند رمز فعلی است. اگر آن را فراموش کرده‌ای، داده‌های این مرورگر را پاک کن تا رمز پیش‌فرض دوباره فعال شود.</p>
              </div>
            </details>
          ) : (
            <div className="mt-3 grid gap-2 rounded-xl border border-brand-500/35 bg-brand-500/[0.07] px-3 py-3 text-[11px]" style={{ background: "var(--field)" }}>
              <p className="font-black text-brand-300">تغییر رمز پنل (نیازمند رمز فعلی)</p>
              <input
                className="input"
                dir="ltr"
                type="password"
                placeholder="رمز فعلی"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void buildNewPassword(); }}
                autoComplete="current-password"
              />
              <input
                className="input"
                dir="ltr"
                type="password"
                placeholder="رمز جدید (حداقل ۸ کاراکتر)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void buildNewPassword(); }}
                autoComplete="new-password"
              />
              <input
                className="input"
                dir="ltr"
                type="password"
                placeholder="تکرار رمز جدید"
                value={newPw2}
                onChange={(e) => setNewPw2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buildNewPassword()}
                autoComplete="new-password"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => void buildNewPassword()} disabled={busy} className="btn btn-primary flex-1 py-2.5 text-[11px] disabled:opacity-60">
                  <KeyRound className="size-3.5" /> ذخیره و ورود
                </button>
                <button type="button" onClick={() => { setResetMode(false); setError(""); }} className="btn btn-ghost px-3 py-2.5 text-[11px]">
                  انصراف
                </button>
              </div>
              <p className="tfaint">رمز جدید در همین مرورگر ذخیره می‌شود و از دفعه بعد لازم است.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------ dashboard ------------------------------------ */

function Dashboard({ state, onGo }: { state: AdminState; onGo: (m: Module) => void }) {
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const series = useMemo(() => revenueSeries(state.orders, range), [state.orders, range]);
  const paid = state.orders.filter((o) => o.payment === "paid");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const aov = paid.length ? revenue / paid.length : 0;
  const pending = state.orders.filter((o) => o.status === "pending").length;
  const lowStock = state.products.filter((p) => p.stock <= 5);
  const topProducts = useMemo(() => {
    const map = new Map<string, { title: string; image: string; qty: number; revenue: number }>();
    for (const o of paid) {
      for (const it of o.items) {
        const cur = map.get(it.slug) ?? { title: it.title, image: it.image, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.price * it.qty;
        map.set(it.slug, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [paid]);

  const max = Math.max(...series.map((s) => s.revenue), 1);

  const kpis = [
    { label: "درآمد پرداخت‌شده", value: `${money(revenue)} تومان`, icon: Wallet, tone: "text-emerald-300", sub: `${fa(paid.length)} سفارش` },
    { label: "سفارش‌های فعال", value: fa(state.orders.length), icon: ShoppingBag, tone: "text-brand-300", sub: `${fa(pending)} در انتظار تایید` },
    { label: "میانگین سبد خرید", value: `${money(aov)} تومان`, icon: TrendingUp, tone: "text-sky-300", sub: "بر اساس سفارش‌های پرداخت‌شده" },
    { label: "هشدار موجودی", value: fa(lowStock.length), icon: AlertTriangle, tone: "text-amber-300", sub: "کالا با موجودی ≤ ۵" },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">داشبورد فروش</h1>
          <p className="mt-1 text-xs tdim">خلاصه‌ی عملکرد فروشگاه بر اساس داده‌های همین مرورگر</p>
        </div>
        <div className="inline-flex gap-1 rounded-xl border bd p-1" style={{ background: "var(--field)" }}>
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition", range === r ? "bg-brand-500 text-white" : "tdim hover:text-[var(--txt)]")}
            >
              {fa(r)} روز
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border bd p-3 sm:p-4" style={{ background: "var(--surface-1)" }}>
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold leading-4 tfaint sm:text-[11px]">{k.label}</span>
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-400 sm:size-9 sm:rounded-xl"><k.icon className="size-4 sm:size-4.5" /></span>
            </div>
            <p className={cn("mt-2 text-sm font-black leading-5 sm:mt-3 sm:text-xl", k.tone)}>{k.value}</p>
            <p className="mt-1 text-[9px] leading-4 tfaint sm:text-[10px]">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-2xl border bd p-5" style={{ background: "var(--surface-1)" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black">روند درآمد</h2>
              <p className="mt-1 text-[11px] tfaint">{fa(range)} روز اخیر — تومان</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
              <TrendingUp className="size-3.5" /> روند صعودی
            </span>
          </div>
          <div className="relative h-44">
            <div className="absolute inset-0 grid grid-rows-4">
              {[0, 1, 2, 3].map((i) => <span key={i} className="border-t border-dashed" style={{ borderColor: "var(--line)" }} />)}
            </div>
            <div className="relative flex h-full items-end gap-1.5">
              {series.map((s) => (
                <div key={s.label} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all group-hover:from-brand-500 group-hover:to-brand-300"
                    style={{ height: `${Math.max(6, (s.revenue / max) * 100)}%` }}
                    title={`${s.label}: ${money(s.revenue)} تومان`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[9px] tfaint">
            <span>{series[0]?.label}</span>
            <span>{series[series.length - 1]?.label}</span>
          </div>
        </div>

        <div className="rounded-2xl border bd p-5" style={{ background: "var(--surface-1)" }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black">پرفروش‌ترین‌ها</h2>
            <button onClick={() => onGo("products")} className="text-[11px] font-bold text-brand-300 hover:underline">همه محصولات</button>
          </div>
          <ul className="grid gap-3">
            {topProducts.map((p, i) => (
              <li key={p.title} className="flex items-center gap-3">
                <span className="w-4 text-[11px] font-black tfaint">{fa(i + 1)}</span>
                <img src={p.image} alt="" className="size-10 rounded-lg object-cover" style={{ background: "var(--muted-surface)" }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold">{p.title}</span>
                  <span className="text-[10px] tfaint">{fa(p.qty)} فروش</span>
                </span>
                <span className="text-[10px] font-bold text-brand-300">{money(p.revenue)}</span>
              </li>
            ))}
            {topProducts.length === 0 && <li className="text-xs tdim">هنوز فروشی ثبت نشده است.</li>}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
          <div className="flex items-center justify-between border-b bd p-4">
            <h2 className="text-sm font-black">سفارش‌های اخیر</h2>
            <button onClick={() => onGo("orders")} className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-300 hover:underline">
              مدیریت سفارش‌ها <ChevronLeft className="size-3.5" />
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {state.orders.slice(0, 5).map((o) => {
              const st = statusMeta(o.status);
              return (
                <div key={o.code} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="font-mono text-[11px] font-bold text-brand-300" dir="ltr">#{o.code}</span>
                  <span className="text-xs font-bold">{o.customer}</span>
                  <span className="text-[11px] tfaint">{o.city}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", TONE[st.tone])}>{st.name}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", PAY_TONE[o.payment])}>{PAY_LABEL[o.payment]}</span>
                  <span className="ms-auto text-xs font-black">{money(o.total)} <span className="text-[10px] font-medium tfaint">تومان</span></span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-2xl border bd p-5" style={{ background: "var(--surface-1)" }}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><Clock className="size-4 text-brand-400" /> کارهای امروز</h2>
            <div className="grid gap-2 text-xs">
              <button onClick={() => onGo("orders")} className="flex items-center justify-between rounded-xl border bd px-3 py-2.5 transition soft-h">
                <span>سفارش‌های در انتظار تایید</span>
                <b className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">{fa(pending)}</b>
              </button>
              <button onClick={() => onGo("reviews")} className="flex items-center justify-between rounded-xl border bd px-3 py-2.5 transition soft-h">
                <span>نظرات در انتظار تایید</span>
                <b className="rounded-full bg-brand-500/15 px-2 py-0.5 text-brand-300">{fa(state.reviews.filter((r) => r.status === "pending").length)}</b>
              </button>
              <button onClick={() => onGo("products")} className="flex items-center justify-between rounded-xl border bd px-3 py-2.5 transition soft-h">
                <span>کالاهای کم‌موجود</span>
                <b className="rounded-full bg-rose-400/15 px-2 py-0.5 text-rose-300">{fa(lowStock.length)}</b>
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4">
            <p className="flex items-center gap-2 text-xs font-black text-brand-300"><Boxes className="size-4" /> وضعیت نسخه نمایشی</p>
            <p className="mt-2 text-[11px] leading-6 tdim">
              همه تغییرات در localStorage ذخیره می‌شوند؛ برای اتصال واقعی به دیتابیس PostgreSQL، همین ساختار به API تبدیل می‌شود.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------ orders ------------------------------------ */

function Orders({ orders, onChange, onToast, onLog, search }: { orders: AdminOrder[]; onChange: (o: AdminOrder[]) => void; onToast: (m: string) => void; onLog: (action: string, module: string) => void; search: string }) {
  const [version, setVersion] = useState(0);
  const live = useMemo(() => mergeLiveOrders(orders), [orders, version]);
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("confirmed");
  const perPage = 8;

  const filtered = live.filter((o) => status === "all" || o.status === status);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = filtered.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);
  const detail = live.find((o) => o.code === open) ?? null;

  const update = (code: string, patch: Partial<AdminOrder>, action?: string) => {
    if (patchStoredOrder(code, patch)) {
      setVersion((v) => v + 1);
    } else {
      onChange(orders.map((o) => (o.code === code ? { ...o, ...patch } : o)));
    }
    if (action) onLog(action, "سفارش‌ها");
  };

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };
  const allPageSelected = current.length > 0 && current.every((o) => selected.has(o.code));
  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) current.forEach((o) => next.delete(o.code));
      else current.forEach((o) => next.add(o.code));
      return next;
    });
  };

  const applyBulkStatus = () => {
    selected.forEach((code) => {
      if (!patchStoredOrder(code, { status: bulkStatus })) {
        onChange(orders.map((o) => (o.code === code ? { ...o, status: bulkStatus } : o)));
      }
    });
    setVersion((v) => v + 1);
    onLog(`اعمال وضعیت «${ORDER_STATUS.find((s) => s.id === bulkStatus)?.name ?? bulkStatus}» برای ${fa(selected.size)} سفارش انتخابی`, "سفارش‌ها");
    onToast(`وضعیت ${fa(selected.size)} سفارش به‌روزرسانی شد`);
    setSelected(new Set());
  };

  const exportCSV = (only: AdminOrder[] | null) => {
    const list = only ?? live;
    downloadCSV(`50500-orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCSV(list));
    onToast(`خروجی ${fa(list.length)} سفارش دانلود شد`);
  };

  const printLabels = (codes: string[]) => {
    codes.forEach((code) => {
      const o = live.find((x) => x.code === code);
      if (o) printLabel(o);
    });
    onToast(`برچسب ${fa(codes.length)} سفارش برای چاپ آماده شد`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">سفارش‌ها</h1>
          <p className="mt-1 text-xs tdim">{fa(live.length)} سفارش شامل سفارش‌های زنده فروشگاه {search && `— نتیجه جستجو برای «${search}»`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportCSV(null)} className="btn btn-ghost px-4 py-2.5 text-xs"><Save className="size-4" /> خروجی CSV (همه)</button>
          <button onClick={() => exportCSV(live.filter((o) => selected.has(o.code)))} disabled={selected.size === 0} className="btn btn-ghost px-4 py-2.5 text-xs disabled:opacity-40"><Save className="size-4" /> خروجی CSV (انتخاب‌شده)</button>
        </div>
      </div>

      {/* bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-3">
          <span className="text-xs font-black text-brand-300">{fa(selected.size)} سفارش انتخاب شد</span>
          <select className="input !w-auto !py-1.5 text-xs" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            {ORDER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={applyBulkStatus} className="btn btn-primary px-4 py-2 text-xs"><Check className="size-4" /> اعمال وضعیت</button>
          <button onClick={() => printLabels([...selected])} className="btn btn-ghost px-4 py-2 text-xs"><Printer className="size-4" /> چاپ برچسب ارسال</button>
          <button onClick={() => setSelected(new Set())} className="text-xs font-bold tdim hover:text-white">حذف انتخاب</button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {[{ id: "all", name: "همه" }, ...ORDER_STATUS].map((s) => (
          <button
            key={s.id}
            onClick={() => { setStatus(s.id); setPage(1); }}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-[11px] font-bold transition",
              status === s.id ? "border-brand-500/60 bg-brand-500/15 text-brand-300" : "bd tdim soft-h",
            )}
          >
            {s.name}
            <span className="ms-1 opacity-60">{fa(s.id === "all" ? live.length : live.filter((o) => o.status === s.id).length)}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <table className="w-full min-w-[900px] text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              <th className="w-8 px-3 py-3">
                <input type="checkbox" className="size-3.5 accent-[#ff6b1a]" checked={allPageSelected} onChange={togglePage} aria-label="انتخاب همه" />
              </th>
              {["کد", "مشتری", "شهر / نشانی", "مبلغ", "وضعیت", "پرداخت", "تاریخ", ""].map((h) => (
                <th key={h} className="px-3 py-3 text-start font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {current.map((o) => {
              const st = statusMeta(o.status);
              return (
                <tr key={o.code} className="cursor-pointer transition hover:bg-white/[0.03]" onClick={() => setOpen(o.code)}>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="size-3.5 accent-[#ff6b1a]" checked={selected.has(o.code)} onChange={() => toggle(o.code)} aria-label={`انتخاب سفارش ${o.code}`} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-brand-300" dir="ltr">#{o.code}</td>
                  <td className="px-3 py-2.5">
                    <b className="block text-xs">{o.customer}</b>
                    <span className="font-mono text-[10px] tfaint" dir="ltr">{o.phone}</span>
                  </td>
                  <td className="px-3 py-2.5 tdim">
                    {o.city}
                    {o.address ? <span className="block max-w-[160px] truncate text-[10px] tfaint">{o.address}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 font-bold">{money(o.total)}</td>
                  <td className="px-3 py-2.5"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", TONE[st.tone])}>{st.name}</span></td>
                  <td className="px-3 py-2.5"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", PAY_TONE[o.payment])}>{PAY_LABEL[o.payment]}</span></td>
                  <td className="px-3 py-2.5 text-[10px] tfaint">{dateFa(o.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setOpen(o.code); }} className="btn btn-ghost !rounded-lg px-2.5 py-1.5 text-[10px]">جزئیات</button>
                      <button onClick={(e) => { e.stopPropagation(); printLabel(o); }} title="چاپ برچسب" className="grid size-7 place-items-center rounded-lg bd tdim transition soft-h" aria-label="چاپ برچسب"><Printer className="size-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {current.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-xs tdim">سفارشی با این فیلتر وجود ندارد.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold transition", page === i + 1 ? "bg-brand-500 text-white" : "border bd tdim hover:bg-white/5")}>{fa(i + 1)}</button>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="absolute inset-y-0 start-0 flex w-full max-w-md flex-col overflow-y-auto border-e bd p-5 shadow-2xl animate-page-in" style={{ background: "var(--panel)" }}>
            <div className="flex items-center justify-between border-b bd pb-4">
              <div>
                <p className="text-[10px] tfaint">جزئیات سفارش</p>
                <h2 className="font-mono text-lg font-black text-brand-300" dir="ltr">#{detail.code}</h2>
              </div>
              <button onClick={() => setOpen(null)} className="grid size-9 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-4" /></button>
            </div>

            {/* Full customer information */}
            <div className="mt-4 grid gap-3 text-xs">
              <div className="rounded-xl border bd p-3" style={{ background: "var(--field)" }}>
                <b className="block">{detail.customer}</b>
                <span className="mt-1 block font-mono text-[11px] tdim" dir="ltr">{detail.phone}</span>
                <span className="mt-1 block tdim">{detail.province}، {detail.city}</span>
                {detail.address && <span className="mt-1 block leading-6 tdim">{detail.address}</span>}
                {detail.postalCode && <span className="mt-1 block tdim">کد پستی: <b dir="ltr">{detail.postalCode}</b></span>}
                {detail.notes && <span className="mt-1 block rounded-lg bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300">یادداشت مشتری: {detail.notes}</span>}
                <span className="mt-1 block text-[10px] tfaint">روش ارسال: {shippingLabel(detail.shippingMethod)} · ثبت: {dateFa(detail.createdAt, true)}</span>
              </div>

              <div className="grid gap-2">
                {detail.items.map((it) => (
                  <div key={it.slug + it.title} className="flex items-center gap-2.5 rounded-xl border bd p-2">
                    <img src={it.image} alt="" className="size-10 rounded-lg object-cover" style={{ background: "var(--muted-surface)" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold">{it.title}</span>
                      <span className="text-[10px] tfaint">× {fa(it.qty)}{it.leather ? ` · چرم ${leatherName(it.leather)}` : ""}{it.thread ? ` · گلدوزی ${threadName(it.thread)}` : ""}</span>
                    </span>
                    <b className="text-[10px]">{money(it.price * it.qty)}</b>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border bd p-3">
                {([["جمع کالاها", detail.subtotal], ["ارسال", detail.shipping], ["تخفیف", detail.discount]] as [string, number][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between py-0.5 text-[11px] tdim"><span>{l}</span><span>{v ? money(v) : "—"}</span></div>
                ))}
                <div className="mt-2 flex justify-between border-t bd pt-2 text-sm font-black"><span>مبلغ کل</span><span>{money(detail.total)} تومان</span></div>
              </div>

              <label className="grid gap-1.5">
                <span className="font-bold tdim">وضعیت سفارش</span>
                <select
                  className="input"
                  value={detail.status}
                  onChange={(e) => update(detail.code, { status: e.target.value }, `تغییر وضعیت سفارش #${detail.code} به «${ORDER_STATUS.find((st) => st.id === e.target.value)?.name ?? e.target.value}»`)}
                >
                  {ORDER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="font-bold tdim">وضعیت پرداخت</span>
                <select
                  className="input"
                  value={detail.payment}
                  onChange={(e) => {
                    const p = e.target.value as AdminOrder["payment"];
                    update(detail.code, { payment: p, status: p === "paid" && detail.status === "pending" ? "confirmed" : detail.status }, `تغییر پرداخت سفارش #${detail.code} به «${PAY_LABEL[p]}»`);
                  }}
                >
                  {Object.entries(PAY_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="font-bold tdim">کد رهگیری</span>
                <input
                  className="input"
                  dir="ltr"
                  defaultValue={detail.tracking ?? ""}
                  onBlur={(e) => update(detail.code, { tracking: e.target.value }, `ثبت کد رهگیری برای سفارش #${detail.code}`)}
                  placeholder="TIPAX-123456"
                />
              </label>

              <div className="mt-1 grid grid-cols-2 gap-2">
                <button onClick={() => printInvoice(detail)} className="btn btn-ghost py-2.5 text-xs"><Printer className="size-4" /> چاپ فاکتور</button>
                <button onClick={() => printLabel(detail)} className="btn btn-ghost py-2.5 text-xs"><Printer className="size-4" /> چاپ برچسب</button>
              </div>
              <button
                onClick={() => { update(detail.code, { payment: "paid", status: detail.status === "pending" ? "confirmed" : detail.status }, `تأیید پرداخت سفارش #${detail.code}`); onToast("سفارش تأیید و پرداخت‌شده ثبت شد"); }}
                className="btn btn-primary py-2.5 text-xs"
              >
                <Check className="size-4" /> تایید واریز / پرداخت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------ products ------------------------------------ */

function Products({ state, onChange, onToast, onLog }: { state: AdminState; onChange: (p: AdminState["products"]) => void; onToast: (m: string) => void; onLog?: (action: string, module: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [onlyLow, setOnlyLow] = useState(false);
  const [page, setPage] = useState(1);
  const [imageFor, setImageFor] = useState<string | null>(null);
  const [form, setForm] = useState<null | {
    editingSlug: string | null;
    title: string;
    category: "embroidered-leather" | "accessories";
    brandSlug: string;
    modelSlug: string;
    accessoryName: string;
    price: number;
    comparePrice: number;
    stock: number;
    cost: number;
    image: string | null;
    body: string;
    active: boolean;
  }>(null);
  const [subFor, setSubFor] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState<{ title: string; desc: string; price: number; stock: number }>({ title: "", desc: "", price: 0, stock: 10 });
  const perPage = 10;

  const customs = useMemo(() => new Set(getCustomProducts().map((c) => c.slug)), [state.products]);

  const filtered = state.products.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (onlyLow && p.stock > 5) return false;
    if (q.trim() && !`${p.title} ${p.brandName ?? ""}`.includes(q.trim())) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = filtered.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);

  const update = (slug: string, patch: Partial<AdminState["products"][number]>) => {
    onChange(state.products.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));
    const { title, price, comparePrice, stock, image, active, cost } = patch;
    setProductOverride(slug, { title, price, comparePrice, stock, image, active, cost });
  };

  const openAdd = () => setForm({
    editingSlug: null,
    title: "",
    category: "embroidered-leather",
    brandSlug: "",
    modelSlug: "",
    accessoryName: "",
    price: 7500000,
    comparePrice: 0,
    stock: 10,
    cost: 0,
    image: null,
    body: "",
    active: true,
  });

  const openEdit = (p: AdminState["products"][number]) => setForm({
    editingSlug: p.slug,
    title: p.title,
    category: p.category,
    brandSlug: p.brandSlug ?? "",
    modelSlug: p.modelSlug ?? "",
    accessoryName: p.category === "accessories" ? (p.brandName ?? "") : "",
    price: p.price,
    comparePrice: p.comparePrice ?? 0,
    stock: p.stock,
    cost: p.cost,
    image: p.image,
    body: "",
    active: p.active,
  });

  const onFile = (file: File | undefined) => {
    if (!file || !form) return;
    if (!file.type.startsWith("image/")) { onToast("فقط فایل تصویری مجاز است"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => (f ? { ...f, image: String(reader.result) } : f));
    reader.readAsDataURL(file);
  };

  const saveForm = () => {
    if (!form) return;
    if (form.title.trim().length < 3) { onToast("نام محصول را کامل وارد کنید"); return; }
    if (form.price <= 0) { onToast("قیمت معتبر نیست"); return; }
    if (form.category === "accessories" && !form.accessoryName.trim()) { onToast("برای لوازم جانبی، نام دسته (مثلاً «روکش فرمان») را وارد کنید"); return; }
    const brand = BRANDS.find((b) => b.slug === form.brandSlug);
    const model = brand?.models.find((m) => m.slug === form.modelSlug);
    const isCustom = form.editingSlug ? customs.has(form.editingSlug) : true;
    const base: AdminState["products"][number] = form.editingSlug
      ? state.products.find((p) => p.slug === form.editingSlug)!
      : {
          slug: "", title: "", price: 0, comparePrice: null, stock: 0, category: "embroidered-leather",
          brandName: undefined, image: "", active: true, cost: 0,
        };
    if (isCustom) {
      const custom: CustomProduct = {
        slug: base.custom ? base.slug : makeSlug(form.title),
        title: form.title.trim(),
        category: form.category,
        price: form.price,
        comparePrice: form.comparePrice > form.price ? form.comparePrice : null,
        stock: Math.max(0, form.stock),
        image: form.image,
        body: form.body || (form.category === "embroidered-leather" ? "کفپوش اختصاصی 50500 با قالب اختصاصی خودرو." : "لوازم جانبی اختصاصی 50500."),
        brandName: form.category === "accessories" ? form.accessoryName.trim() : (brand?.name ?? null),
        brandSlug: brand?.slug ?? null,
        modelSlug: model?.slug ?? null,
        modelName: model?.name ?? null,
        cost: form.cost,
        active: form.active,
        custom: true,
        createdAt: base.custom && base.createdAt ? base.createdAt : new Date().toISOString(),
      };
      const list = getCustomProducts();
      const idx = list.findIndex((c) => c.slug === custom.slug);
      if (idx >= 0) {
        list[idx] = custom;
      } else {
        list.push(custom);
      }
      setCustomProducts(list);
      const adminProduct: AdminState["products"][number] = {
        slug: custom.slug,
        title: custom.title,
        price: custom.price,
        comparePrice: custom.comparePrice,
        stock: custom.stock,
        category: custom.category,
        brandName: custom.brandName ?? undefined,
        image: custom.image || base.image || "",
        active: custom.active,
        cost: custom.cost ?? 0,
        createdAt: custom.createdAt,
        custom: true,
      };
      const exists = state.products.some((p) => p.slug === custom.slug);
      onChange(exists ? state.products.map((p) => (p.slug === custom.slug ? adminProduct : p)) : [...state.products, adminProduct]);
      onLog?.(`${form.editingSlug ? "ویرایش" : "افزودن"} محصول «${custom.title}»`, "محصولات");
      onToast(form.editingSlug ? "محصول به‌روزرسانی شد" : "محصول جدید افزوده شد و در فروشگاه فعال است");
    } else {
      update(base.slug, {
        title: form.title.trim(),
        price: form.price,
        comparePrice: form.comparePrice > form.price ? form.comparePrice : null,
        stock: Math.max(0, form.stock),
        cost: form.cost,
        image: form.image ?? undefined,
        active: form.active,
      });
      onLog?.(`ویرایش محصول «${form.title.trim()}»`, "محصولات");
      onToast("محصول به‌روزرسانی شد");
    }
    setForm(null);
  };

  const removeCustom = (p: AdminState["products"][number]) => {
    if (!p.custom) { onToast("فقط محصولات ساخته‌شده در پنل قابل حذف هستند"); return; }
    if (!window.confirm(`محصول «${p.title}» حذف شود؟`)) return;
    setCustomProducts(getCustomProducts().filter((c) => c.slug !== p.slug));
    setSubItems(p.slug, []);
    onChange(state.products.filter((x) => x.slug !== p.slug));
    onLog?.(`حذف محصول «${p.title}»`, "محصولات");
    onToast("محصول حذف شد");
  };

  const subItems = subFor ? getSubItems(subFor) : [];
  const addSub = () => {
    if (!subFor) return;
    if (subDraft.title.trim().length < 2) { onToast("نام زیرمجموعه را وارد کنید"); return; }
    if (subDraft.price <= 0) { onToast("قیمت زیرمجموعه معتبر نیست"); return; }
    setSubItems(subFor, [...getSubItems(subFor), { id: makeId("sub"), title: subDraft.title.trim(), desc: subDraft.desc.trim(), price: subDraft.price, stock: Math.max(0, subDraft.stock) }]);
    setSubDraft({ title: "", desc: "", price: 0, stock: 10 });
    onLog?.(`افزودن زیرمجموعه «${subDraft.title.trim()}» به ${subFor}`, "محصولات");
    onToast("زیرمجموعه افزوده شد و در صفحه محصول قابل سفارش است");
  };
  const removeSub = (id: string) => {
    if (!subFor) return;
    setSubItems(subFor, getSubItems(subFor).filter((s) => s.id !== id));
    onToast("زیرمجموعه حذف شد");
  };

  const stats = {
    total: state.products.length,
    active: state.products.filter((p) => p.active).length,
    low: state.products.filter((p) => p.stock <= 5).length,
    value: state.products.reduce((s, p) => s + p.stock * p.price, 0),
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">محصولات</h1>
          <p className="mt-1 text-xs tdim">{fa(filtered.length)} کالا در نمایش · {fa(state.products.filter((p) => p.custom).length)} محصول اختصاصی پنل</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openAdd} className="btn btn-primary px-4 py-2.5 text-xs"><Plus className="size-4" /> افزودن محصول</button>
          <button
            onClick={() => {
              const csv = ["slug,title,category,price,comparePrice,stock,cost,active", ...state.products.map((p) => [p.slug, `"${p.title}"`, p.category, p.price, p.comparePrice ?? 0, p.stock, p.cost, p.active].join(","))].join("\n");
              downloadCSV(`50500-products-${new Date().toISOString().slice(0, 10)}.csv`, "\uFEFF" + csv);
              onToast("خروجی محصولات دانلود شد");
            }}
            className="btn btn-ghost px-4 py-2.5 text-xs"
          >
            <Save className="size-4" /> خروجی CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {[
          { label: "کل کالاها", value: fa(stats.total), icon: Package },
          { label: "فعال", value: fa(stats.active), icon: CheckCircle2 },
          { label: "کم‌موجود", value: fa(stats.low), icon: AlertTriangle },
          { label: "ارزش موجودی", value: `${money(stats.value)} ت`, icon: Boxes },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border bd p-3 sm:p-4" style={{ background: "var(--surface-1)" }}>
            <div className="flex items-center justify-between gap-1.5"><span className="text-[10px] leading-4 tfaint sm:text-[11px]">{item.label}</span><item.icon className="size-4 shrink-0 text-brand-400" /></div>
            <p className="mt-1.5 text-sm font-black leading-5 sm:mt-2 sm:text-lg">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bd p-3" style={{ background: "var(--surface-1)" }}>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
          <input className="input pe-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="جستجوی نام محصول یا برند…" />
        </div>
        <select className="input !w-auto" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}>
          <option value="all">همه دسته‌ها</option>
          <option value="embroidered-leather">کفپوش چرمی گلدوزی</option>
          <option value="accessories">لوازم جانبی</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border bd px-3 py-2 text-[11px] font-bold">
          <input type="checkbox" className="size-3.5 accent-[#ff6b1a]" checked={onlyLow} onChange={(e) => { setOnlyLow(e.target.checked); setPage(1); }} />
          فقط کم‌موجود
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <table className="w-full min-w-[920px] text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              {["محصول", "دسته", "قیمت (تومان)", "بهای تمام‌شده", "موجودی", "وضعیت", "فعال", ""].map((h) => (
                <th key={h} className="px-3 py-3 text-start font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {current.map((p) => {
              const subs = getSubItems(p.slug);
              return (
                <tr key={p.slug} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => setImageFor(p.slug)} title="تغییر تصویر محصول" aria-label={`تغییر تصویر ${p.title}`}>
                        <img src={p.image} alt="" className="size-10 rounded-lg object-cover transition hover:ring-2 hover:ring-brand-400" style={{ background: "var(--muted-surface)" }} />
                      </button>
                      <div className="min-w-0">
                        <Link to={`/products/${p.slug}`} className="block max-w-[240px] truncate text-[11px] font-bold hover:text-brand-300">{p.title}</Link>
                        <span className="text-[9px] tfaint">
                          {p.brandName ?? "کفپوش اختصاصی"}
                          {p.custom && <span className="ms-1 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[8px] font-black text-brand-300">پنل</span>}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] tdim">{p.category === "accessories" ? "لوازم جانبی" : "کفپوش"}</td>
                  <td className="px-3 py-2.5">
                    <input
                      className="input !w-24 !py-1 !text-[11px]"
                      dir="ltr"
                      defaultValue={p.price}
                      onBlur={(e) => { const v = Number(e.target.value); if (v > 0) { update(p.slug, { price: v }); onLog?.(`تغییر قیمت «${p.title}» به ${money(v)} تومان`, "محصولات"); } }}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-[10px] tdim">{money(p.cost)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        className="input !w-16 !py-1 !text-[11px]"
                        dir="ltr"
                        defaultValue={p.stock}
                        onBlur={(e) => { update(p.slug, { stock: Math.max(0, Number(e.target.value)) }); onLog?.(`ویرایش موجودی «${p.title}»`, "محصولات"); }}
                      />
                      {p.stock <= 5 && <span className="rounded-full bg-rose-400/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">کم</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[10px]">
                    <span className={cn("rounded-full border px-2 py-0.5 font-bold", p.stock > 0 ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300")}>
                      {p.stock > 0 ? "موجود" : "ناموجود"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => { update(p.slug, { active: !p.active }); onToast(`${p.active ? "غیرفعال" : "فعال"} شد`); }}
                      className={cn("relative h-5 w-9 rounded-full transition", p.active ? "bg-brand-500" : "bg-white/15")}
                      aria-label="تغییر وضعیت انتشار"
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", p.active ? "start-0.5" : "start-[18px]")} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} title="ویرایش محصول" className="grid size-7 place-items-center rounded-lg bd tdim transition soft-h" aria-label="ویرایش"><Pencil className="size-3.5" /></button>
                      <button onClick={() => setSubFor(p.slug)} title="زیرمجموعه‌ها" className="relative grid size-7 place-items-center rounded-lg bd tdim transition soft-h" aria-label="زیرمجموعه‌ها">
                        <Layers className="size-3.5" />
                        {subs.length > 0 && <span className="absolute -top-1.5 -end-1.5 grid size-4 place-items-center rounded-full bg-brand-500 text-[8px] font-black text-white">{fa(subs.length)}</span>}
                      </button>
                      {p.custom && (
                        <button onClick={() => removeCustom(p)} title="حذف محصول" className="grid size-7 place-items-center rounded-lg bd tdim transition hover:border-rose-400/50 hover:text-rose-400" aria-label="حذف"><Trash2 className="size-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold", page === i + 1 ? "bg-brand-500 text-white" : "border bd tdim")}>{fa(i + 1)}</button>
          ))}
        </div>
      )}

      {/* add / edit product modal */}
      {form && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setForm(null)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border bd bg-ink-900 p-5 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">{form.editingSlug ? "ویرایش محصول" : "افزودن محصول جدید"}</h2>
              <button onClick={() => setForm(null)} className="grid size-9 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-4" /></button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold tdim">نام محصول *</span>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً کفپوش چرمی پنج بعدی پژو ۲۰۶" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold tdim">دسته</span>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as "embroidered-leather" | "accessories" })}>
                  <option value="embroidered-leather">کفپوش چرمی گلدوزی</option>
                  <option value="accessories">لوازم جانبی</option>
                </select>
              </label>
              {form.category === "embroidered-leather" ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold tdim">برند (اختیاری)</span>
                    <select className="input" value={form.brandSlug} onChange={(e) => setForm({ ...form, brandSlug: e.target.value, modelSlug: "" })}>
                      <option value="">برای همه خودروها</option>
                      {BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold tdim">مدل (اختیاری)</span>
                    <select className="input" value={form.modelSlug} disabled={!form.brandSlug} onChange={(e) => setForm({ ...form, modelSlug: e.target.value })}>
                      <option value="">همه مدل‌ها</option>
                      {(BRANDS.find((b) => b.slug === form.brandSlug)?.models ?? []).map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
                    </select>
                  </label>
                </div>
              ) : (
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold tdim">نام دسته (برند/لوازم) *</span>
                  <input className="input" value={form.accessoryName} onChange={(e) => setForm({ ...form, accessoryName: e.target.value })} placeholder="مثلاً روکش فرمان چرمی" />
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold tdim">قیمت (تومان) *</span>
                  <input className="input" dir="ltr" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold tdim">قیمت قبل از تخفیف (اختیاری)</span>
                  <input className="input" dir="ltr" type="number" value={form.comparePrice || ""} onChange={(e) => setForm({ ...form, comparePrice: Number(e.target.value) })} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold tdim">موجودی</span>
                  <input className="input" dir="ltr" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold tdim">بهای تمام‌شده (تومان)</span>
                  <input className="input" dir="ltr" type="number" value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold tdim">توضیحات (اختیاری)</span>
                <textarea className="input min-h-20 resize-y" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="توضیحی که در صفحه محصول نمایش داده می‌شود" />
              </label>
              <div className="flex items-center gap-3 rounded-xl border bd p-3" style={{ background: "var(--field)" }}>
                <img src={form.image ?? ""} alt="" className="size-14 shrink-0 rounded-lg object-cover" style={{ background: "var(--muted-surface)" }} />
                <div className="flex flex-1 flex-wrap gap-2">
                  <label className="btn btn-ghost cursor-pointer px-3 py-2 text-[11px]">
                    <ImageIcon className="size-3.5" /> بارگذاری تصویر
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                  </label>
                  <button onClick={() => setImageFor(form.editingSlug ?? "__form__")} className="btn btn-ghost px-3 py-2 text-[11px]">
                    از کتابخانه تصاویر
                  </button>
                  {form.image && (
                    <button onClick={() => setForm({ ...form, image: null })} className="text-[11px] font-bold text-rose-400 hover:underline">حذف تصویر</button>
                  )}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                <input type="checkbox" className="size-4 accent-[#ff6b1a]" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                محصول در فروشگاه فعال است
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={saveForm} className="btn btn-primary flex-1 py-2.5 text-xs"><Save className="size-4" /> {form.editingSlug ? "ذخیره تغییرات" : "افزودن محصول"}</button>
                <button onClick={() => setForm(null)} className="btn btn-ghost px-5 py-2.5 text-xs">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* sub-items (زیرمجموعه) modal */}
      {subFor && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSubFor(null)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border bd bg-ink-900 p-5 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black">زیر مجموعه‌ها</h2>
                <p className="mt-1 text-[11px] tdim">«{state.products.find((p) => p.slug === subFor)?.title}» — لوازم جانبی تکمیلی که مشتری می‌تواند همراه کفپوش سفارش دهد</p>
              </div>
              <button onClick={() => setSubFor(null)} className="grid size-9 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-4" /></button>
            </div>
            <div className="mt-4 grid gap-2">
              {subItems.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border bd p-3" style={{ background: "var(--field)" }}>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-xs">{s.title}</b>
                    <span className="text-[10px] tfaint">{money(s.price)} تومان · موجودی {fa(s.stock)}</span>
                  </div>
                  <button onClick={() => removeSub(s.id)} className="grid size-7 place-items-center rounded-lg bd tdim transition hover:text-rose-400" aria-label="حذف زیرمجموعه"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
              {subItems.length === 0 && <p className="rounded-xl border border-dashed bd p-5 text-center text-xs tdim">هنوز زیرمجموعه‌ای تعریف نشده است.</p>}
            </div>
            <div className="mt-4 grid gap-2.5 rounded-2xl border bd p-3" style={{ background: "var(--surface-2)" }}>
              <p className="text-xs font-black">افزودن زیرمجموعه</p>
              <input className="input" placeholder="نام (مثلاً روکش فرمان چرمی)" value={subDraft.title} onChange={(e) => setSubDraft({ ...subDraft, title: e.target.value })} />
              <input className="input" placeholder="توضیح کوتاه (اختیاری)" value={subDraft.desc} onChange={(e) => setSubDraft({ ...subDraft, desc: e.target.value })} />
              <div className="grid grid-cols-2 gap-2.5">
                <input className="input" dir="ltr" type="number" placeholder="قیمت (تومان)" value={subDraft.price || ""} onChange={(e) => setSubDraft({ ...subDraft, price: Number(e.target.value) })} />
                <input className="input" dir="ltr" type="number" placeholder="موجودی" value={subDraft.stock} onChange={(e) => setSubDraft({ ...subDraft, stock: Number(e.target.value) })} />
              </div>
              <button onClick={addSub} className="btn btn-primary py-2.5 text-xs"><Plus className="size-4" /> افزودن زیرمجموعه</button>
            </div>
          </div>
        </div>
      )}

      {imageFor && imageFor !== "__form__" && (
        <MediaPicker
          title={`تصویر محصول: ${state.products.find((p) => p.slug === imageFor)?.title ?? imageFor}`}
          onClose={() => setImageFor(null)}
          onToast={onToast}
          onSelect={({ src, alt }) => {
            update(imageFor, { image: src });
            onLog?.(`تغییر تصویر محصول ${imageFor}`, "محصولات");
            onToast(`تصویر محصول با «${alt}» به‌روزرسانی شد`);
          }}
        />
      )}
      {imageFor === "__form__" && form && (
        <MediaPicker
          title="تصویر محصول جدید"
          onClose={() => setImageFor(null)}
          onToast={onToast}
          onSelect={({ src, alt }) => {
            setForm({ ...form, image: src });
            onToast(`تصویر «${alt}» انتخاب شد`);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------ customers ------------------------------------ */

function Customers({ state }: { state: AdminState }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => customerRows(state.orders), [state.orders]).filter(
    (r) => !q.trim() || `${r.name} ${r.phone} ${r.city}`.includes(q.trim()),
  );
  const segmentTone: Record<string, string> = { وفادار: "emerald", پرمصرف: "violet", جدید: "blue", "در خطر": "rose" };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-black">مشتریان (CRM)</h1>
        <p className="mt-1 text-xs tdim">{fa(rows.length)} مشتری — ارزش عمر مشتری بر اساس سفارش‌های ثبت‌شده</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
        <input className="input pe-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام، موبایل یا شهر…" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["کل مشتریان", fa(rows.length)],
          ["خرید مجدد", `${fa(Math.round((rows.filter((r) => r.orders > 1).length / Math.max(1, rows.length)) * 100))}٪`],
          ["میانگین LTV", `${money(rows.reduce((s, r) => s + r.ltv, 0) / Math.max(1, rows.length))} تومان`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border bd p-4" style={{ background: "var(--surface-1)" }}>
            <p className="text-[11px] tfaint">{l}</p>
            <p className="mt-2 text-lg font-black">{v}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              {["مشتری", "موبایل", "شهر", "سفارش‌ها", "پرداخت‌شده", "LTV", "سگمنت", "آخرین خرید"].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {rows.map((r) => (
              <tr key={r.phone} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-[11px] font-black text-white">{r.name.slice(0, 1)}</span>
                    <b className="text-xs">{r.name}</b>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] tdim" dir="ltr">{r.phone}</td>
                <td className="px-4 py-3 tdim">{r.city}</td>
                <td className="px-4 py-3 font-bold">{fa(r.orders)}</td>
                <td className="px-4 py-3">{fa(r.paid)}</td>
                <td className="px-4 py-3 font-bold text-brand-300">{money(r.ltv)}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", TONE[segmentTone[r.segment]])}>{r.segment}</span></td>
                <td className="px-4 py-3 text-[10px] tfaint">{dateFa(r.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------ coupons ------------------------------------ */

function Coupons({ state, onChange, onToast }: { state: AdminState; onChange: (c: AdminState["coupons"]) => void; onToast: (m: string) => void }) {
  const [form, setForm] = useState({ code: "", percent: 10, minAmount: 0, maxUses: 100 });

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-black">کدهای تخفیف</h1>
        <p className="mt-1 text-xs tdim">{fa(state.coupons.length)} کد ثبت شده</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.coupons.map((c) => (
          <div key={c.code} className="rounded-2xl border bd p-4" style={{ background: "var(--surface-1)" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-lg font-black tracking-widest text-brand-300" dir="ltr">{c.code}</p>
                <p className="mt-1 text-[11px] tdim">{fa(c.percent)}٪ تخفیف {c.minAmount ? `— حداقل ${money(c.minAmount)} تومان` : ""}</p>
              </div>
              <button
                onClick={() => { onChange(state.coupons.map((x) => (x.code === c.code ? { ...x, active: !x.active } : x))); onToast(`کد ${c.code} ${c.active ? "غیرفعال" : "فعال"} شد`); }}
                className={cn("relative h-5 w-9 shrink-0 rounded-full transition", c.active ? "bg-emerald-500" : "bg-white/15")}
                aria-label="فعال/غیرفعال"
              >
                <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", c.active ? "start-0.5" : "start-[18px]")} />
              </button>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--field)" }}>
              <div className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600" style={{ width: `${Math.min(100, (c.uses / Math.max(1, c.maxUses)) * 100)}%` }} />
            </div>
            <p className="mt-2 flex items-center justify-between text-[10px] tfaint">
              <span>{fa(c.uses)} از {fa(c.maxUses)} استفاده</span>
              <button
                onClick={() => { onChange(state.coupons.filter((x) => x.code !== c.code)); onToast("کد تخفیف حذف شد"); }}
                className="inline-flex items-center gap-1 text-rose-400 hover:underline"
              >
                <Trash2 className="size-3" /> حذف
              </button>
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bd p-5" style={{ background: "var(--surface-1)" }}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><Plus className="size-4 text-brand-400" /> ساخت کد تخفیف</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className="input" dir="ltr" placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <input className="input" dir="ltr" type="number" placeholder="درصد" value={form.percent} onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })} />
          <input className="input" dir="ltr" type="number" placeholder="حداقل خرید" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} />
          <input className="input" dir="ltr" type="number" placeholder="حداکثر استفاده" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} />
          <button
            onClick={() => {
              if (!form.code.trim()) return onToast("کد را وارد کنید");
              if (state.coupons.some((c) => c.code === form.code)) return onToast("این کد قبلاً ثبت شده است");
              onChange([{ code: form.code.trim(), percent: Math.min(90, Math.max(1, form.percent)), minAmount: Math.max(0, form.minAmount), maxUses: Math.max(1, form.maxUses), uses: 0, active: true }, ...state.coupons]);
              setForm({ code: "", percent: 10, minAmount: 0, maxUses: 100 });
              onToast("کد تخفیف ساخته شد");
            }}
            className="btn btn-primary px-4 py-2.5 text-xs"
          >
            <Percent className="size-4" /> ثبت کد
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------ reviews ------------------------------------ */

function Reviews({ state, onChange, onToast }: { state: AdminState; onChange: (r: AdminState["reviews"]) => void; onToast: (m: string) => void }) {
  const pending = state.reviews.filter((r) => r.status === "pending");
  const decided = state.reviews.filter((r) => r.status !== "pending");

  const setStatus = (id: string, status: "approved" | "rejected") => {
    onChange(state.reviews.map((r) => (r.id === id ? { ...r, status } : r)));
    onToast(status === "approved" ? "نظر تایید و منتشر شد" : "نظر رد شد");
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-black">نظرات مشتریان</h1>
        <p className="mt-1 text-xs tdim">{fa(pending.length)} نظر در انتظار بررسی</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {pending.map((r) => (
          <div key={r.id} className="rounded-2xl border border-brand-500/25 p-4" style={{ background: "var(--surface-1)" }}>
            <div className="flex items-center justify-between">
              <b className="text-xs">{r.name}</b>
              <span className="inline-flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("size-3.5", i < r.rating ? "fill-current" : "opacity-25")} />)}
              </span>
            </div>
            <p className="mt-1 text-[10px] tfaint">{r.product} · {dateFa(r.date)}</p>
            <p className="mt-2 text-[11px] leading-6 tdim">{r.comment}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setStatus(r.id, "approved")} className="btn btn-primary flex-1 py-2 text-[11px]"><Check className="size-3.5" /> تایید</button>
              <button onClick={() => setStatus(r.id, "rejected")} className="btn btn-ghost flex-1 py-2 text-[11px]"><X className="size-3.5" /> رد</button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="rounded-2xl border border-dashed bd p-8 text-center text-xs tdim">همه نظرات بررسی شده‌اند ✓</p>}
      </div>

      <div className="rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <div className="border-b bd p-4"><h2 className="text-sm font-black">نظرات بررسی‌شده</h2></div>
        <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {decided.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs">
              <b>{r.name}</b>
              <span className="text-[10px] tfaint">{r.product}</span>
              <span className={cn("ms-auto rounded-full border px-2 py-0.5 text-[10px] font-bold", r.status === "approved" ? TONE.green : TONE.rose)}>
                {r.status === "approved" ? "تایید شده" : "رد شده"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------ settings ------------------------------------ */

function SettingsPanel({
  state,
  onChange,
  onToast,
  onReset,
  onChangePassword,
}: {
  state: AdminState;
  onChange: (s: AdminState["settings"]) => void;
  onToast: (m: string) => void;
  onReset: () => void;
  onChangePassword: (current: string, next: string) => void | Promise<void>;
}) {
  const [form, setForm] = useState(state.settings);
  const field = (k: keyof AdminState["settings"]) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">تنظیمات فروشگاه</h1>
          <p className="mt-1 text-xs tdim">اطلاعات پایه، ارسال و درگاه‌های پرداخت</p>
        </div>
        <button onClick={() => { onChange(form); onToast("تنظیمات ذخیره شد"); }} className="btn btn-primary px-5 py-2.5 text-xs">
          <Save className="size-4" /> ذخیره تغییرات
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bd p-5" style={{ background: "var(--surface-1)" }}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black"><Store className="size-4 text-brand-400" /> اطلاعات فروشگاه</h2>
          <div className="grid gap-3">
            <label className="grid gap-1.5"><span className="text-[11px] font-bold tdim">نام فروشگاه</span><input className="input" value={form.storeName} onChange={field("storeName")} /></label>
            <label className="grid gap-1.5"><span className="text-[11px] font-bold tdim">ایمیل (پیش‌فرض فروشگاه)</span><input className="input" dir="ltr" value={form.email} onChange={field("email")} /></label>
            <p className="rounded-xl border border-dashed bd px-3 py-2.5 text-[11px] leading-5 tdim">
              تلفن، نشانی و متن نوار اعلان به‌صورت زنده از «<b className="font-black text-brand-300">محتوای سایت</b>» ویرایش می‌شوند تا فوراً روی سایت اعمال شوند.
            </p>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-2xl border bd p-5" style={{ background: "var(--surface-1)" }}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black"><Truck className="size-4 text-brand-400" /> ارسال</h2>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-bold tdim">سقف ارسال رایگان (تومان)</span>
              <input className="input" dir="ltr" type="number" value={form.freeShipping} onChange={field("freeShipping")} />
            </label>
          </div>

          <div className="rounded-2xl border bd p-5" style={{ background: "var(--surface-1)" }}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black"><CreditCard className="size-4 text-brand-400" /> پرداخت</h2>
            {([["cod", "پرداخت در محل"], ["cardToCard", "کارت‌به‌کارت (تأیید دستی)"]] as const).map(([key, label]) => (
              <label key={key} className="mb-2 flex cursor-pointer items-center justify-between rounded-xl border bd px-3 py-2.5">
                <span className="text-[11px] font-bold">{label}</span>
                <input
                  type="checkbox"
                  className="size-4 accent-[#ff6b1a]"
                  checked={Boolean(form[key])}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
              </label>
            ))}
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-amber-400/10 px-3 py-2 text-[10px] leading-5 text-amber-300">
              <AlertTriangle className="size-3.5 shrink-0" /> درگاه آنلاین در این نسخه نمایشی متصل نیست.
            </p>
          </div>

          <div className="rounded-2xl border bd p-5" style={{ background: "var(--surface-1)" }}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><Settings className="size-4 text-brand-400" /> سیستم</h2>
            <p className="rounded-xl border border-dashed bd px-3 py-2.5 text-[11px] leading-5 tdim">
              تم پیش‌فرض، حالت تعمیرات و پشتیبان‌گیری در کارت «سیستم» پایین همین صفحه است.
            </p>
            <button onClick={onReset} className="btn btn-ghost mt-3 w-full py-2.5 text-[11px]">
              <RotateCcw className="size-3.5" /> بازنشانی داده‌های نمایشی
            </button>
          </div>

          <div className="rounded-2xl border border-brand-500/25 bg-brand-500/[0.07] p-5" style={{ background: "var(--surface-1)" }}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><KeyRound className="size-4 text-brand-400" /> رمز پنل مدیریت</h2>
            <p className="rounded-xl border border-dashed bd px-3 py-2.5 text-[11px] leading-5 tdim">
              رمز فعلی لازم است. رمز به‌صورت هش‌شده ذخیره می‌شود و در هیچ‌جا به‌صورت متن ساده نگهداری نمی‌شود.
            </p>
            <div className="mt-3 grid gap-2">
              <input id="admin-pw-cur" type="password" autoComplete="current-password" className="input" placeholder="رمز فعلی" />
              <input id="admin-pw" type="password" autoComplete="new-password" className="input" placeholder="رمز جدید (حداقل ۸ کاراکتر)" />
              <input id="admin-pw2" type="password" autoComplete="new-password" className="input" placeholder="تکرار رمز جدید" />
              <button
                onClick={() => {
                  const cur = (document.getElementById("admin-pw-cur") as HTMLInputElement)?.value ?? "";
                  const a = (document.getElementById("admin-pw") as HTMLInputElement)?.value ?? "";
                  const b = (document.getElementById("admin-pw2") as HTMLInputElement)?.value ?? "";
                  if (!cur) { onToast("رمز فعلی را وارد کنید"); return; }
                  if (a !== b || a.length < 8) {
                    onToast(a !== b ? "رمزها مطابقت ندارند" : "رمز باید حداقل ۸ کاراکتر باشد");
                    return;
                  }
                  void onChangePassword(cur, a);
                }}
                className="btn btn-primary w-full py-2.5 text-[11px]"
              >
                <KeyRound className="size-3.5" /> تغییر رمز وِ ورودِ دوباره
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-5">
        <p className="flex items-center gap-2 text-xs font-black text-brand-300"><RefreshCcw className="size-4" /> تفاوت با نسخه‌ی اصلی</p>
        <p className="mt-2 text-[11px] leading-6 tdim">
          در نسخه‌ی Next.js اصلی، همین ماژول‌ها به PostgreSQL متصل‌اند و کنترل دسترسی کارکنان، TOTP و لاگ حسابرسی دارند.
          در این دمو داده‌ها در localStorage ذخیره می‌شوند و برای اتصال واقعی باید به API تبدیل شوند.
        </p>
      </div>
    </div>
  );
}
