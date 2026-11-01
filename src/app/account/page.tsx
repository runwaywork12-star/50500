"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowUpLeft, BadgeCheck, CalendarDays, CarFront, CheckCircle2, CircleHelp,
  Clock3, CreditCard, KeyRound, LogOut, Mail, MapPin, Package, Phone, ShieldCheck,
  ShoppingBag, UserRound, Wallet,
} from "lucide-react";

type AccountMode = "login" | "register" | "sms-phone" | "sms-code" | "dashboard";
type OrderItem = { title: string; quantity: number; unitPrice: number };
type Order = {
  code: string; status: string; paymentStatus: string; paymentMethod: string; shippingMethod: string;
  trackingNumber: string; total: number; createdAt: string; items: OrderItem[];
};
type Me = {
  customer: { id: number; phone: string; email: string | null; fullName: string; createdAt: string };
  stats: { orderCount: number; activeCount: number; paidTotal: number };
  orders: Order[];
};

const money = (n: number) => new Intl.NumberFormat("fa-IR").format(Number(n || 0)) + " تومان";
const date = (v: string) => new Date(v).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
const statusLabels: Record<string, string> = {
  pending: "در انتظار بررسی", processing: "در حال آماده‌سازی", confirmed: "تأییدشده", packing: "در حال بسته‌بندی",
  shipped: "ارسال شده", delivered: "تحویل شده", cancelled: "لغو شده", returned: "مرجوعی",
};
const paymentLabels: Record<string, string> = { pending: "در انتظار پرداخت", paid: "پرداخت موفق", failed: "ناموفق", cod: "پرداخت در محل", refunded: "بازپرداخت شده" };

export default function AccountPage() {
  const [mode, setMode] = useState<AccountMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copy, setCopy] = useState<Record<string, string>>({});
  const txt = (key: string, fallback: string) => copy[key]?.trim() || fallback;

  async function loadMe() {
    try {
      const response = await fetch("/api/customer/me", { cache: "no-store" });
      if (!response.ok) return false;
      const data = await response.json() as Me;
      setMe(data);
      setMode("dashboard");
      return true;
    } catch { return false; }
  }

  useEffect(() => {
    fetch("/api/site-config", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}).then((data) => setCopy(data && typeof data === "object" ? data as Record<string, string> : {})).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/customer/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as Me;
      })
      .then((data) => { if (active && data) { setMe(data); setMode("dashboard"); } })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function resetMessage() { setError(""); setNotice(""); }

  async function submitLogin(event: FormEvent) {
    event.preventDefault(); resetMessage(); setBusy(true);
    try {
      const response = await fetch("/api/customer/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ورود انجام نشد.");
      await loadMe(); setPassword(""); setNotice("با موفقیت وارد حساب شدی.");
    } catch (e) { setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد."); }
    finally { setBusy(false); }
  }

  async function submitRegister(event: FormEvent) {
    event.preventDefault(); resetMessage();
    if (password !== confirmPassword) { setError("تکرار رمز عبور با رمز عبور یکسان نیست."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/customer/auth/register", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ثبت‌نام انجام نشد.");
      await loadMe(); setPassword(""); setConfirmPassword(""); setNotice("حساب کاربری ساخته شد.");
    } catch (e) { setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد."); }
    finally { setBusy(false); }
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault(); resetMessage(); setBusy(true);
    try {
      const response = await fetch("/api/customer/auth/request-otp", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "درخواست کد انجام نشد.");
      setMode("sms-code"); if (result.devCode) setDevCode(result.devCode);
      setNotice(result.devOnly ? "کد تست فقط برای محیط محلی نمایش داده شده است." : "اگر شماره معتبر باشد کد ارسال می‌شود.");
    } catch (e) { setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد."); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault(); resetMessage(); setBusy(true);
    try {
      const response = await fetch("/api/customer/auth/verify", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ورود انجام نشد.");
      await loadMe(); setNotice("با پیامک وارد حساب شدی.");
    } catch (e) { setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد."); }
    finally { setBusy(false); }
  }

  async function submitCredentials(event: FormEvent) {
    event.preventDefault(); resetMessage(); setBusy(true);
    try {
      const response = await fetch("/api/customer/me/credentials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: newAccountPassword }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ذخیره اطلاعات ورود انجام نشد.");
      await loadMe(); setNewAccountPassword(""); setNotice("ایمیل و رمز عبور به حساب متصل شد؛ از این پس می‌توانی با ایمیل وارد شوی.");
    } catch (e) { setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد."); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try { await fetch("/api/customer/auth/logout", { method: "POST" }); }
    finally { setMe(null); setMode("login"); setPassword(""); setConfirmPassword(""); setBusy(false); resetMessage(); }
  }

  const fieldClass = "w-full rounded-xl border bd bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";
  const labelClass = "mb-2 block text-sm font-bold text-white";
  const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-l from-brand-500 to-brand-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-500/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

  if (loading) return <section className="container-x grid min-h-[62vh] place-items-center py-16"><div className="flex items-center gap-3 text-sm tdim"><span className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"/>در حال بارگذاری حساب کاربری…</div></section>;

  if (mode === "dashboard" && me) {
    return <section className="container-x py-8 md:py-12" dir="rtl">
      <div className="mb-7 overflow-hidden rounded-3xl border bd bg-linear-to-l from-brand-500/15 via-ink-900 to-ink-900 p-6 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-brand-400/25 bg-brand-500/15 text-brand-300"><UserRound className="size-7"/></div><div><p className="text-xs font-bold text-brand-300">{txt("account.dashboard_label", "پنل مشتریان ۵۰۵۰۰")}</p><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">سلام {me.customer.fullName || "دوست عزیز"} 👋</h1><p className="mt-2 text-sm tdim">{txt("account.dashboard_desc", "خوش آمدی؛ وضعیت سفارش‌ها و اطلاعات حسابت اینجاست.")}</p></div></div>
          <button onClick={logout} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border bd bg-black/20 px-4 py-2.5 text-sm tdim transition hover:text-white"><LogOut className="size-4"/> خروج از حساب</button>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-xs tdim"><span className="inline-flex items-center gap-2 rounded-full border bd bg-black/15 px-3 py-2"><Mail className="size-3.5 text-brand-300"/>{me.customer.email || "حساب پیامکی"}</span><span className="inline-flex items-center gap-2 rounded-full border bd bg-black/15 px-3 py-2"><Phone className="size-3.5 text-brand-300"/><bdi>{me.customer.phone}</bdi></span><span className="inline-flex items-center gap-2 rounded-full border bd bg-black/15 px-3 py-2"><CalendarDays className="size-3.5 text-brand-300"/>عضویت از {date(me.customer.createdAt)}</span></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={<Package className="size-5"/>} label="کل سفارش‌ها" value={new Intl.NumberFormat("fa-IR").format(me.stats.orderCount)} detail="سفارش‌های مرتبط با شماره حساب"/>
        <StatCard icon={<Clock3 className="size-5"/>} label="سفارش‌های در جریان" value={new Intl.NumberFormat("fa-IR").format(me.stats.activeCount)} detail="سفارش‌هایی که هنوز نهایی نشده‌اند"/>
        <StatCard icon={<Wallet className="size-5"/>} label="پرداخت‌های تأییدشده" value={money(me.stats.paidTotal)} detail="جمع سفارش‌هایی که پرداختشان تأیید شده"/>
      </div>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-3xl border bd bg-ink-900 p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-white">{txt("account.orders_title", "سفارش‌های من")}</h2><p className="mt-1 text-xs tdim">آخرین سفارش‌ها و وضعیت پرداخت و ارسال</p></div><Link className="inline-flex items-center gap-1 text-sm font-bold text-brand-300 hover:text-brand-200" href="/track">پیگیری سفارش <ArrowLeft className="size-4"/></Link></div>
          {me.orders.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed bd p-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-300"><ShoppingBag className="size-7"/></div><h3 className="mt-4 font-black text-white">هنوز سفارشی ثبت نکردی</h3><p className="mx-auto mt-2 max-w-md text-sm leading-7 tdim">بعد از اولین خرید، شماره سفارش، مبلغ، وضعیت پرداخت و اقلام خریدت در همین بخش نمایش داده می‌شود.</p><Link href="/products" className={`${buttonClass} mt-5`}>دیدن محصولات <ArrowLeft className="size-4"/></Link></div> : <div className="mt-5 space-y-4">{me.orders.map((order) => <div key={order.code} className="rounded-2xl border bd bg-black/10 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-english text-sm font-black text-white">#{order.code}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${order.status === "cancelled" ? "bg-red-500/10 text-red-300" : order.status === "delivered" ? "bg-emerald-500/10 text-emerald-300" : "bg-brand-500/10 text-brand-200"}`}>{statusLabels[order.status] || order.status}</span></div><p className="mt-2 flex items-center gap-1.5 text-xs tdim"><CalendarDays className="size-3.5"/>{date(order.createdAt)}</p></div><div className="text-left"><p className="font-black text-white">{money(order.total)}</p><p className="mt-1 text-xs tdim">{paymentLabels[order.paymentStatus] || order.paymentStatus}</p></div></div>
            <div className="mt-4 space-y-2 border-t bd pt-3">{order.items.map((item, idx) => <div key={`${order.code}-${idx}`} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 text-white/85">{item.title}<span className="ms-2 text-xs tdim">× {new Intl.NumberFormat("fa-IR").format(item.quantity)}</span></span><span className="shrink-0 text-xs tdim">{money(item.unitPrice * item.quantity)}</span></div>)}</div>
            {order.trackingNumber && <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200"><MapPin className="size-4 shrink-0"/>کد رهگیری: <bdi dir="ltr" className="font-english">{order.trackingNumber}</bdi></div>}
          </div>)}</div>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border bd bg-ink-900 p-5"><h2 className="font-black text-white">{txt("account.quick_title", "دسترسی سریع")}</h2><div className="mt-4 grid gap-2"><QuickLink href="/products" icon={<CarFront className="size-4"/>} text="انتخاب خودرو و محصولات"/><QuickLink href="/track" icon={<MapPin className="size-4"/>} text="پیگیری سفارش"/><QuickLink href="/cart" icon={<ShoppingBag className="size-4"/>} text="سبد خرید"/><QuickLink href="/contact" icon={<CircleHelp className="size-4"/>} text="ارتباط با پشتیبانی"/></div></div>
          <div className="rounded-3xl border bd bg-ink-900 p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-300"/><h2 className="font-black text-white">{txt("account.details_title", "اطلاعات حساب")}</h2></div><div className="mt-4 space-y-4 text-sm"><InfoRow label="نام" value={me.customer.fullName || "ثبت نشده"}/><InfoRow label="ایمیل" value={me.customer.email || "ثبت نشده"}/><InfoRow label="موبایل" value={me.customer.phone}/><div className="flex items-start justify-between gap-3"><span className="tdim">امنیت</span><span className="inline-flex items-center gap-1 text-xs text-emerald-300"><BadgeCheck className="size-4"/> نشست امن فعال</span></div></div></div>
          {!me.customer.email && <div className="rounded-3xl border border-brand-500/25 bg-brand-500/5 p-5"><h2 className="font-black text-white">فعال‌سازی ورود با ایمیل و رمز</h2><p className="mt-2 text-xs leading-6 tdim">حسابت از قبل با پیامک ساخته شده است. همین‌جا ایمیل و رمز عبور تعیین کن تا دفعه بعد مستقیم وارد شوی.</p><form onSubmit={submitCredentials} className="mt-4 space-y-3"><div><label className={labelClass} htmlFor="upgrade-email">ایمیل</label><input id="upgrade-email" className={fieldClass} type="email" dir="ltr" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required maxLength={254}/></div><div><label className={labelClass} htmlFor="upgrade-password">رمز عبور جدید</label><input id="upgrade-password" className={fieldClass} type="password" dir="ltr" autoComplete="new-password" value={newAccountPassword} onChange={e=>setNewAccountPassword(e.target.value)} minLength={8} maxLength={128} required placeholder="حداقل ۸ کاراکتر"/></div><button disabled={busy} className={`${buttonClass} w-full`}>{busy ? "در حال ذخیره…" : "اتصال ایمیل به حساب"}</button></form></div>}
          <div className="rounded-3xl border border-brand-500/20 bg-brand-500/5 p-5"><div className="flex items-center gap-2 text-brand-200"><CreditCard className="size-5"/><h2 className="font-black">{txt("account.help_title", "راهنمای خرید")}</h2></div><p className="mt-2 text-xs leading-6 tdim">برای تغییر یا پیگیری سفارش، کد سفارش را همراه داشته باش و در صورت نیاز با پشتیبانی تماس بگیر.</p></div>
        </aside>
      </div>
    </section>;
  }

  return <section className="container-x grid min-h-[68vh] place-items-center py-10 md:py-16" dir="rtl">
    <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border bd bg-ink-900 shadow-2xl shadow-black/30 md:grid md:grid-cols-[0.9fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-linear-to-bl from-brand-600/25 via-ink-900 to-ink-950 p-9 md:flex md:flex-col md:justify-between"><div className="absolute -left-20 -top-20 size-72 rounded-full bg-brand-500/10 blur-3xl"/><div className="relative"><div className="grid size-14 place-items-center rounded-2xl border border-brand-400/25 bg-brand-500/15 text-brand-300"><UserRound className="size-7"/></div><p className="mt-6 text-xs font-black tracking-widest text-brand-300">{txt("account.brand_label", "باشگاه مشتریان ۵۰۵۰۰")}</p><h1 className="mt-3 text-3xl font-black leading-[1.7] text-white">{txt("account.brand_title", "خریدهایت را هوشمندانه‌تر مدیریت کن")}</h1><p className="mt-4 text-sm leading-8 tdim">{txt("account.brand_desc", "با حساب کاربری، سفارش‌ها و وضعیت پرداخت و ارسال را یک‌جا دنبال کن.")}</p></div><div className="relative space-y-3 text-sm tdim"><Benefit icon={<Package className="size-4"/>} text={txt("account.benefit_orders", "تاریخچه و جزئیات سفارش‌ها")}/><Benefit icon={<ShieldCheck className="size-4"/>} text={txt("account.benefit_security", "ورود با نشست امن و رمز هش‌شده")}/><Benefit icon={<CarFront className="size-4"/>} text={txt("account.benefit_vehicle", "دسترسی سریع به محصولات مناسب خودرو")}/></div></div>
      <div className="p-5 sm:p-8 md:p-10">
        <div className="mb-6"><p className="text-xs font-bold text-brand-300">{txt("account.brand_label", "حساب مشتریان")}</p><h2 className="mt-2 text-2xl font-black text-white">{mode === "register" ? txt("account.register_title", "ساخت حساب جدید") : mode.startsWith("sms-") ? "ورود با پیامک" : txt("account.login_title", "ورود به حساب")}</h2><p className="mt-2 text-sm tdim">{mode === "register" ? txt("account.register_desc", "اطلاعاتت را وارد کن تا حساب بسازیم.") : mode.startsWith("sms-") ? "با کد یک‌بارمصرف وارد حساب شو." : txt("account.login_desc", "با ایمیل و رمز عبور وارد حساب خودت شو.")}</p></div>
        {!mode.startsWith("sms-") && <div className="mb-6 grid grid-cols-2 rounded-xl border bd bg-black/15 p-1"><button type="button" onClick={() => {setMode("login");resetMessage();}} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${mode === "login" ? "bg-brand-500 text-white shadow" : "tdim hover:text-white"}`}>ورود</button><button type="button" onClick={() => {setMode("register");resetMessage();}} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${mode === "register" ? "bg-brand-500 text-white shadow" : "tdim hover:text-white"}`}>ثبت‌نام</button></div>}

        {mode === "login" && <form onSubmit={submitLogin} className="space-y-4"><div><label className={labelClass} htmlFor="login-email">ایمیل</label><input id="login-email" className={fieldClass} type="email" dir="ltr" autoComplete="username" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required maxLength={254}/></div><PasswordInput id="login-password" label="رمز عبور" value={password} onChange={setPassword} visible={showPassword} setVisible={setShowPassword} autoComplete="current-password" fieldClass={fieldClass} labelClass={labelClass}/><button type="submit" disabled={busy} className={`${buttonClass} w-full`}>{busy ? "در حال ورود…" : "ورود به حساب"}<ArrowLeft className="size-4"/></button><button type="button" onClick={()=>{setMode("sms-phone");resetMessage();}} className="w-full rounded-xl border bd px-4 py-3 text-sm font-bold tdim transition hover:text-white">ورود جایگزین با پیامک</button></form>}

        {mode === "register" && <form onSubmit={submitRegister} className="space-y-4"><div><label className={labelClass} htmlFor="full-name">نام و نام خانوادگی</label><input id="full-name" className={fieldClass} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="نام کامل" required minLength={3} maxLength={90}/></div><div><label className={labelClass} htmlFor="register-email">ایمیل</label><input id="register-email" className={fieldClass} type="email" dir="ltr" autoComplete="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required maxLength={254}/></div><div><label className={labelClass} htmlFor="register-phone">شماره موبایل</label><input id="register-phone" className={fieldClass} type="tel" dir="ltr" autoComplete="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="09123456789" required/></div><PasswordInput id="register-password" label="رمز عبور (حداقل ۸ کاراکتر)" value={password} onChange={setPassword} visible={showPassword} setVisible={setShowPassword} autoComplete="new-password" fieldClass={fieldClass} labelClass={labelClass}/><PasswordInput id="confirm-password" label="تکرار رمز عبور" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} setVisible={setShowPassword} autoComplete="new-password" fieldClass={fieldClass} labelClass={labelClass}/><button type="submit" disabled={busy} className={`${buttonClass} w-full`}>{busy ? "در حال ساخت حساب…" : "ثبت‌نام و ساخت حساب"}<ArrowLeft className="size-4"/></button><p className="text-xs leading-6 tdim">شماره موبایل برای اتصال سفارش‌ها به حساب کاربری استفاده می‌شود. رمز عبور به‌صورت هش‌شده ذخیره می‌شود.</p></form>}

        {mode === "sms-phone" && <form onSubmit={requestCode} className="space-y-4"><div><label className={labelClass} htmlFor="sms-phone">شماره موبایل</label><input id="sms-phone" className={fieldClass} dir="ltr" autoComplete="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="09123456789" required/></div><button disabled={busy} className={`${buttonClass} w-full`}>{busy ? "در حال ارسال…" : "دریافت کد ورود"}</button><button type="button" onClick={()=>{setMode("login");resetMessage();}} className="w-full py-2 text-sm tdim hover:text-white">بازگشت به ورود با ایمیل</button></form>}

        {mode === "sms-code" && <form onSubmit={verifyCode} className="space-y-4"><p className="text-sm tdim">کد ارسال‌شده برای <bdi dir="ltr">{phone}</bdi> را وارد کن.</p>{devCode && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">کد تست محیط محلی: <bdi dir="ltr" className="font-english">{devCode}</bdi></div>}<input aria-label="کد تأیید" className={`${fieldClass} text-center text-xl tracking-[.35em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} placeholder="کد ۶ رقمی" required/><button disabled={busy} className={`${buttonClass} w-full`}>{busy ? "در حال بررسی…" : "تأیید و ورود"}</button><button type="button" onClick={()=>{setMode("sms-phone");resetMessage();setDevCode("");}} className="w-full py-2 text-sm tdim hover:text-white">اصلاح شماره موبایل</button></form>}

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-300">{error}</p>}{notice && <p role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm leading-6 text-emerald-200">{notice}</p>}
        <div className="mt-6 flex items-start gap-2 border-t bd pt-5 text-xs leading-6 tdim"><ShieldCheck className="mt-1 size-4 shrink-0 text-brand-300"/>هیچ‌وقت رمز عبورت را با کسی به اشتراک نگذار. مدیر فروشگاه هم رمز خام حساب تو را نمی‌بیند.</div>
      </div>
    </div>
  </section>;
}

function PasswordInput({ id, label, value, onChange, visible, setVisible, autoComplete, fieldClass, labelClass }: { id: string; label: string; value: string; onChange: (v: string) => void; visible: boolean; setVisible: (v: boolean) => void; autoComplete: string; fieldClass: string; labelClass: string }) {
  return <div><label className={labelClass} htmlFor={id}>{label}</label><div className="relative"><input id={id} className={`${fieldClass} pe-12`} type={visible ? "text" : "password"} dir="ltr" autoComplete={autoComplete} value={value} onChange={e=>onChange(e.target.value)} required minLength={id.includes("confirm") ? 8 : undefined} maxLength={128} placeholder="حداقل ۸ کاراکتر"/><button type="button" aria-label={visible ? "پنهان کردن رمز" : "نمایش رمز"} onClick={()=>setVisible(!visible)} className="absolute inset-y-0 end-0 grid w-11 place-items-center text-white/50 transition hover:text-white"><KeyRound className="size-4"/></button></div></div>;
}
function StatCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) { return <div className="rounded-2xl border bd bg-ink-900 p-5"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold tdim">{label}</span><span className="grid size-10 place-items-center rounded-xl bg-brand-500/10 text-brand-300">{icon}</span></div><p className="mt-4 text-xl font-black text-white">{value}</p><p className="mt-2 text-xs leading-5 tdim">{detail}</p></div>; }
function QuickLink({ href, icon, text }: { href: string; icon: ReactNode; text: string }) { return <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border bd px-3 py-3 text-sm font-bold tdim transition hover:border-brand-500/30 hover:text-white"><span className="flex items-center gap-2">{icon}{text}</span><ArrowUpLeft className="size-4 text-brand-300"/></Link>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-3"><span className="tdim">{label}</span><span className="max-w-[65%] break-all text-left font-bold text-white" dir={value.includes("@") || /^09/.test(value) ? "ltr" : "rtl"}>{value}</span></div>; }
function Benefit({ icon, text }: { icon: ReactNode; text: string }) { return <p className="flex items-center gap-2"><span className="text-brand-300">{icon}</span>{text}</p>; }
