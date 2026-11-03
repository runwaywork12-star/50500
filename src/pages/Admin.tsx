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
  ExternalLink,
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
import { Coins, FileText, Handshake, History, UserCog } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AffiliatesPanel, AuditPanel, ContentPanel, FinancePanel, StaffPanel, SystemPanel } from "@/pages/admin/Panels";
import {
  ORDER_STATUS,
  customerRows,
  dateFa,
  loadAdmin,
  makeAuditEntry,
  money,
  resetAdmin,
  revenueSeries,
  saveAdmin,
  type AdminOrder,
  type AdminState,
} from "@/lib/admin";
import { cn, fa } from "@/lib/format";

type Module =
  | "dashboard"
  | "orders"
  | "products"
  | "customers"
  | "affiliates"
  | "coupons"
  | "finance"
  | "cms"
  | "reviews"
  | "staff"
  | "settings"
  | "audit";

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

function readAuth() {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem("50500_admin_auth") === "1";
  } catch {
    return false;
  }
}

function writeAuth(value: boolean) {
  try {
    if (value) window.sessionStorage.setItem("50500_admin_auth", "1");
    else window.sessionStorage.removeItem("50500_admin_auth");
  } catch {
    /* storage unavailable */
  }
}

function statusMeta(id: string) {
  return ORDER_STATUS.find((s) => s.id === id) ?? ORDER_STATUS[0];
}

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

  if (!authed) return <Login onLogin={() => { sessionStorage.setItem("50500_admin_auth", "1"); setAuthed(true); }} />;

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
          {module === "customers" && <Customers state={state} />}
          {module === "affiliates" && <AffiliatesPanel state={state} patch={patch} onToast={notify} onLog={onLog} />}
          {module === "coupons" && <Coupons state={state} onChange={(coupons) => patch("coupons", coupons)} onToast={notify} />}
          {module === "finance" && <FinancePanel state={state} patch={patch} onToast={notify} onLog={onLog} />}
          {module === "cms" && <ContentPanel onToast={notify} onLog={onLog} />}
          {module === "reviews" && <Reviews state={state} onChange={(reviews) => patch("reviews", reviews)} onToast={notify} />}
          {module === "staff" && <StaffPanel state={state} patch={patch} onToast={notify} onLog={onLog} />}
          {module === "audit" && <AuditPanel state={state} patch={patch} onToast={notify} onLog={onLog} />}
          {module === "settings" && (
            <>
              <SettingsPanel
                state={state}
                onChange={(settings) => patch("settings", settings)}
                onToast={notify}
                onReset={() => {
                  resetAdmin();
                  setState(loadAdmin());
                  notify("داده‌های نمایشی بازنشانی شد");
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

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (password === "50500admin" || password === "") {
      onLogin();
    } else {
      setError("رمز نادرست است. برای نسخه نمایشی روی «ورود سریع» بزنید.");
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
            <input className="input" dir="ltr" defaultValue="amir@50500.co" />
          </label>
          <label className="mt-3 grid gap-1.5">
            <span className="text-xs font-bold tdim">رمز عبور</span>
            <input
              className="input"
              dir="ltr"
              type="password"
              placeholder="50500admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </label>
          {error && <p className="mt-2 text-[11px] font-bold text-rose-400">{error}</p>}

          <button onClick={submit} className="btn btn-primary mt-5 w-full py-3 text-sm">
            <ShieldCheck className="size-4" /> ورود به پنل
          </button>
          <button onClick={onLogin} className="btn btn-ghost mt-2 w-full py-2.5 text-xs">
            ورود سریع نسخه نمایشی
          </button>
          <p className="mt-4 text-center text-[10px] leading-5 tfaint">در نسخه واقعی، ورود با رمز محیطی و تأیید دومرحله‌ای (TOTP) انجام می‌شود.</p>
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
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;
  const filtered = orders.filter((o) => status === "all" || o.status === status);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = filtered.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);
  const selected = orders.find((o) => o.code === open);

  const update = (code: string, patch: Partial<AdminOrder>, action?: string) => {
    onChange(orders.map((o) => (o.code === code ? { ...o, ...patch } : o)));
    if (action) onLog(action, "سفارش‌ها");
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">سفارش‌ها</h1>
          <p className="mt-1 text-xs tdim">{fa(orders.length)} سفارش {search && `— نتیجه جستجو برای «${search}»`}</p>
        </div>
        <button
          onClick={() => {
            const csv = ["code,customer,phone,total,status,payment", ...orders.map((o) => [o.code, o.customer, o.phone, o.total, o.status, o.payment].join(","))].join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "50500-orders.csv";
            a.click();
            URL.revokeObjectURL(a.href);
            onToast("فایل CSV سفارش‌ها دانلود شد");
          }}
          className="btn btn-ghost px-4 py-2.5 text-xs"
        >
          <Save className="size-4" /> خروجی CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border bd p-1.5" style={{ background: "var(--surface-1)" }}>
        {[{ id: "all", name: "همه" }, ...ORDER_STATUS].map((s) => (
          <button
            key={s.id}
            onClick={() => { setStatus(s.id); setPage(1); }}
            className={cn("rounded-xl px-3 py-1.5 text-[11px] font-bold transition", status === s.id ? "bg-brand-500 text-white" : "tdim hover:bg-white/5")}
          >
            {s.name}
            <span className="ms-1 opacity-60">
              {fa(s.id === "all" ? orders.length : orders.filter((o) => o.status === s.id).length)}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <table className="w-full min-w-[760px] text-start text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              {["کد", "مشتری", "شهر", "مبلغ", "وضعیت", "پرداخت", "تاریخ", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {current.map((o) => {
              const st = statusMeta(o.status);
              return (
                <tr key={o.code} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-[11px] font-bold text-brand-300" dir="ltr">#{o.code}</td>
                  <td className="px-4 py-3">
                    <b className="block text-xs">{o.customer}</b>
                    <span className="font-mono text-[10px] tfaint" dir="ltr">{o.phone}</span>
                  </td>
                  <td className="px-4 py-3 tdim">{o.city}</td>
                  <td className="px-4 py-3 font-bold">{money(o.total)}</td>
                  <td className="px-4 py-3"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", TONE[st.tone])}>{st.name}</span></td>
                  <td className="px-4 py-3"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", PAY_TONE[o.payment])}>{PAY_LABEL[o.payment]}</span></td>
                  <td className="px-4 py-3 text-[10px] tfaint">{dateFa(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setOpen(o.code)} className="btn btn-ghost !rounded-lg px-2.5 py-1.5 text-[10px]">جزئیات</button>
                  </td>
                </tr>
              );
            })}
            {current.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-xs tdim">سفارشی با این فیلتر وجود ندارد.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold transition", page === i + 1 ? "bg-brand-500 text-white" : "border bd tdim hover:bg-white/5")}
            >
              {fa(i + 1)}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="absolute inset-y-0 start-0 flex w-full max-w-md flex-col overflow-y-auto border-e bd p-5 shadow-2xl animate-page-in" style={{ background: "var(--panel)" }}>
            <div className="flex items-center justify-between border-b bd pb-4">
              <div>
                <p className="text-[10px] tfaint">جزئیات سفارش</p>
                <h2 className="font-mono text-lg font-black text-brand-300" dir="ltr">#{selected.code}</h2>
              </div>
              <button onClick={() => setOpen(null)} className="grid size-9 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-4" /></button>
            </div>

            <div className="mt-4 grid gap-3 text-xs">
              <div className="rounded-xl border bd p-3" style={{ background: "var(--field)" }}>
                <b className="block">{selected.customer}</b>
                <span className="mt-1 block font-mono text-[11px] tdim" dir="ltr">{selected.phone}</span>
                <span className="mt-1 block tdim">{selected.province}، {selected.city}</span>
                <span className="mt-1 block text-[10px] tfaint">ثبت: {dateFa(selected.createdAt)}</span>
              </div>

              <div className="grid gap-2">
                {selected.items.map((it) => (
                  <div key={it.slug + it.title} className="flex items-center gap-2.5 rounded-xl border bd p-2">
                    <img src={it.image} alt="" className="size-10 rounded-lg object-cover" style={{ background: "var(--muted-surface)" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold">{it.title}</span>
                      <span className="text-[10px] tfaint">× {fa(it.qty)}</span>
                    </span>
                    <b className="text-[10px]">{money(it.price * it.qty)}</b>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border bd p-3">
                {[["جمع کالاها", selected.subtotal], ["ارسال", selected.shipping], ["تخفیف", selected.discount]].map(([l, v]) => (
                  <div key={String(l)} className="flex justify-between py-0.5 text-[11px] tdim"><span>{l}</span><span>{money(Number(v))}</span></div>
                ))}
                <div className="mt-2 flex justify-between border-t bd pt-2 text-sm font-black"><span>مبلغ کل</span><span>{money(selected.total)} تومان</span></div>
              </div>

              <label className="grid gap-1.5">
                <span className="font-bold tdim">وضعیت سفارش</span>
                <select
                    className="input"
                    value={selected.status}
                    onChange={(e) =>
                      update(
                        selected.code,
                        { status: e.target.value },
                        `تغییر وضعیت سفارش #${selected.code} به «${ORDER_STATUS.find((st) => st.id === e.target.value)?.name ?? e.target.value}»`,
                      )
                    }
                  >
                  {ORDER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="font-bold tdim">وضعیت پرداخت</span>
                <select
                  className="input"
                  value={selected.payment}
                  onChange={(e) => {
                    const p = e.target.value as AdminOrder["payment"];
                    update(selected.code, { payment: p, status: p === "paid" && selected.status === "pending" ? "confirmed" : selected.status }, `تغییر پرداخت سفارش #${selected.code} به «${PAY_LABEL[p]}»`);
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
                  defaultValue={selected.tracking ?? ""}
                  onBlur={(e) => update(selected.code, { tracking: e.target.value }, `ثبت کد رهگیری برای سفارش #${selected.code}`)}
                  placeholder="TIPAX-123456"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="font-bold tdim">یادداشت داخلی</span>
                <textarea
                  className="input min-h-20"
                  defaultValue={selected.note ?? ""}
                  onBlur={(e) => update(selected.code, { note: e.target.value }, `ویرایش یادداشت داخلی سفارش #${selected.code}`)}
                  placeholder="برای تیم پشتیبانی…"
                />
              </label>

              <div className="mt-1 grid grid-cols-2 gap-2">
                <button onClick={() => window.print()} className="btn btn-ghost py-2.5 text-xs"><Printer className="size-4" /> چاپ</button>
                <button
                  onClick={() => { update(selected.code, { payment: "paid", status: "confirmed" }); onToast("سفارش تأیید و پرداخت‌شده ثبت شد"); }}
                  className="btn btn-primary py-2.5 text-xs"
                >
                  <Check className="size-4" /> تایید پرداخت
                </button>
              </div>
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
  const perPage = 10;

  const filtered = state.products.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (onlyLow && p.stock > 5) return false;
    if (q.trim() && !`${p.title} ${p.brandName ?? ""}`.includes(q.trim())) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = filtered.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);

  const update = (slug: string, patch: Partial<AdminState["products"][number]>) =>
    onChange(state.products.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));

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
          <p className="mt-1 text-xs tdim">{fa(filtered.length)} کالا در نمایش</p>
        </div>
        <button
          onClick={() => {
            const csv = ["slug,title,price,stock,active", ...state.products.map((p) => [p.slug, `"${p.title}"`, p.price, p.stock, p.active].join(","))].join("\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
            a.download = "50500-products.csv";
            a.click();
            onToast("خروجی محصولات دانلود شد");
          }}
          className="btn btn-ghost px-4 py-2.5 text-xs"
        >
          <Save className="size-4" /> خروجی CSV
        </button>
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
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              {["محصول", "دسته", "قیمت (تومان)", "بهای تمام‌شده", "موجودی", "وضعیت", "فعال"].map((h) => (
                <th key={h} className="px-3 py-3 text-start font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {current.map((p) => (
              <tr key={p.slug} className="hover:bg-white/[0.03]">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <img src={p.image} alt="" className="size-10 rounded-lg object-cover" style={{ background: "var(--muted-surface)" }} />
                    <div className="min-w-0">
                      <Link to={`/products/${p.slug}`} className="block max-w-[240px] truncate text-[11px] font-bold hover:text-brand-300">{p.title}</Link>
                      <span className="text-[9px] tfaint">{p.brandName ?? "لوازم جانبی"}</span>
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
              </tr>
            ))}
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
}: {
  state: AdminState;
  onChange: (s: AdminState["settings"]) => void;
  onToast: (m: string) => void;
  onReset: () => void;
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
