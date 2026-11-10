import { useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  UserPlus,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth, emailIssue, normalizePhone, passwordIssue, phoneIssue } from "@/lib/auth.tsx";
import { findOrders } from "@/lib/cart";
import { ORDER_STATUSES } from "@/data/content";
import { img } from "@/lib/images";
import { cn, fa, money } from "@/lib/format";

/* ------------------------------------------------------------------ *
 * Storefront auth: /login · /register · /forgot · /account
 * Split layout: form on the right (RTL), brand photography on the left.
 * ------------------------------------------------------------------ */

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-zA-Zا-ی]/.test(password)) score++;
  if (/[0-9۰-۹]/.test(password)) score++;
  if (/[^a-zA-Z0-9ا-ی ۰-۹]/.test(password)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABEL = ["ضعیف", "ضعیف", "متوسط", "خوب", "قوی"];
const STRENGTH_TONE = ["bg-rose-500", "bg-rose-500", "bg-amber-400", "bg-sky-400", "bg-emerald-500"];

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
  error,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
  error?: string;
  id: string;
}) {
  const [show, setShow] = useState(false);
  const score = strength(value);
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-xs font-bold tdim">{label}</span>
      <span className="relative block">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="input pe-11"
          dir="ltr"
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 end-0 grid w-11 place-items-center tfaint transition hover:text-brand-300"
          aria-label={show ? "پنهان‌کردن رمز" : "نمایش رمز"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
      {error && <span className="text-[11px] font-bold text-rose-400">{error}</span>}
      {value.length > 0 && (
        <span className="flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--field)" }}>
            <span className={cn("block h-full rounded-full transition-all", STRENGTH_TONE[score])} style={{ width: `${(score / 4) * 100}%` }} />
          </span>
          <span className="text-[10px] font-bold tdim">{STRENGTH_LABEL[score]}</span>
        </span>
      )}
      {hint && <span className="text-[10px] leading-5 tfaint">{hint}</span>}
    </label>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  dir,
  autoComplete,
  icon,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  autoComplete?: string;
  icon?: ReactNode;
  inputMode?: "text" | "tel" | "email" | "numeric";
}) {
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-xs font-bold tdim">{label}</span>
      <span className="relative block">
        {icon && <span className="pointer-events-none absolute inset-y-0 start-0 grid w-10 place-items-center text-brand-400/80">{icon}</span>}
        <input
          id={id}
          type={type}
          dir={dir}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn("input", icon ? "ps-11" : "")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      </span>
      {error && <span className="text-[11px] font-bold text-rose-400">{error}</span>}
    </label>
  );
}

function AuthShell({ children, mode }: { children: ReactNode; mode: "login" | "register" | "forgot" }) {
  return (
    <div className="grid lg:min-h-[calc(100vh-120px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* form column — right side in RTL */}
      <div className="flex items-center justify-center px-4 py-7 sm:px-8 sm:py-9 lg:py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* brand column — left side in RTL */}
      <div className="relative hidden overflow-hidden border-e bd lg:block">
        <img
          src={img("images/hero-mat.webp")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.92) brightness(0.72)" }}
        />
        <div className="absolute inset-0 bg-linear-to-l from-black/85 via-black/55 to-black/70" />
        <div className="stitch-bg absolute inset-0 opacity-25" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo />

          <div className="max-w-md">
            <p className="text-[11px] font-black tracking-[.3em] text-brand-300">50500 ACCOUNT</p>
            <h2 className="mt-4 text-3xl font-black leading-[1.6] text-white xl:text-4xl">
              حساب کاربری <span className="text-gradient">50500</span>
              <br />
              سفارش‌ها و رهگیری‌هایت در یک جا
            </h2>
            <p className="mt-4 text-sm leading-8 text-white/70">
              با ثبت‌نام، همه سفارش‌هایت را دنبال کن، آدرس‌ها و رنگ‌های انتخابی‌ات را ذخیره کن و زودتر به مرحله پرداخت برسی.
            </p>

            <ul className="mt-8 grid gap-4">
              {[
                { icon: ShieldCheck, title: "۱۲ ماه گارانتی واقعی", desc: "تعویض بدون قید و شرط محصولات 50500" },
                { icon: Truck, title: "رهگیری لحظه‌ای سفارش", desc: "از تولید تا تحویل، وضعیت سفارش روشن است" },
                { icon: Palette, title: "ذخیره ترکیب رنگ دلخواه", desc: "۷ رنگ چرم و ۸ رنگ نخ گلدوزی" },
              ].map((b) => (
                <li key={b.title} className="flex items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-500/35 bg-brand-500/15 text-brand-300 backdrop-blur">
                    <b.icon className="size-5" />
                  </span>
                  <span>
                    <b className="block text-sm font-bold text-white">{b.title}</b>
                    <span className="mt-0.5 block text-xs text-white/55">{b.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-white/45">
            {mode === "register" ? "با ثبت‌نام، قوانین خرید 50500 را می‌پذیری." : "ورود امن با رمز عبور · جلسه شما در همین دستگاه محفوظ می‌ماند."}
          </p>
        </div>
      </div>
    </div>
  );
}

function FormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold tdim transition hover:text-brand-300 sm:mb-6">
        <ArrowLeft className="size-4 rotate-180" /> بازگشت به فروشگاه
      </Link>
      <h1 className="text-xl font-black sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-7 tdim">{subtitle}</p>
      <div className="mt-5 grid gap-3 rounded-3xl border bd p-4 sm:mt-6 sm:gap-3.5 sm:p-6" style={{ background: "var(--surface-1)" }}>
        {children}
      </div>
      <div className="mt-5 text-center text-xs tdim">{footer}</div>
    </>
  );
}

/* ---------------------------------- login ---------------------------------- */

export function Login() {
  const { login, demoEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/account";
  const notice = (location.state as { notice?: string } | null)?.notice;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const submit = () => {
    const next: typeof errors = {};
    const emailErr = emailIssue(email);
    if (emailErr) next.email = emailErr;
    if (!password) next.password = "رمز عبور را وارد کنید.";
    if (Object.keys(next).length) return setErrors(next);
    const res = login(email, password);
    if (!res.ok) return setErrors({ form: res.error });
    navigate(from, { replace: true });
  };

  return (
    <AuthShell mode="login">
      <FormShell
        title="ورود به حساب کاربری"
        subtitle="برای رهگیری سفارش‌ها و سریع‌تر خرید کردن وارد شوید."
        footer={
          <>
            حساب ندارید؟{" "}
            <Link to="/register" className="font-black text-brand-300 hover:underline">ثبت‌نام کنید</Link>
          </>
        }
      >
        {notice && <p className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-400">{notice}</p>}
        {errors.form && <p className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-400">{errors.form}</p>}

        <Field id="login-email" label="ایمیل" value={email} onChange={(v) => { setEmail(v); setErrors({}); }} error={errors.email} dir="ltr" inputMode="email" autoComplete="email" placeholder="name@mail.com" icon={<Mail className="size-4" />} />
        <PasswordField id="login-pass" label="رمز عبور" value={password} onChange={(v) => { setPassword(v); setErrors({}); }} autoComplete="current-password" hint={errors.password} />

        <div className="flex items-center justify-between">
          <Link to="/forgot" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-300 hover:underline">
            <KeyRound className="size-3.5" /> فراموشی رمز عبور
          </Link>
          <span className="text-[10px] tfaint">با ایمیل + رمز وارد می‌شوید</span>
        </div>

        <button type="button" onClick={submit} className="btn btn-primary shine w-full py-3.5 text-sm">
          <Lock className="size-4" /> ورود به حساب
        </button>

        <p className="rounded-xl border border-dashed bd px-3 py-2.5 text-[11px] leading-6 tdim">
          نسخه نمایشی: برای ورود، اول از <Link to="/register" className="font-bold text-brand-300 hover:underline">ثبت‌نام</Link> یک حساب بسازید؛
          ایمیل نمونه پیشنهادی <b className="font-mono" dir="ltr">{demoEmail}</b> است.
        </p>
      </FormShell>
    </AuthShell>
  );
}

/* --------------------------------- register -------------------------------- */

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 3) next.name = "نام و نام خانوادگی را کامل وارد کنید.";
    const emailErr = emailIssue(form.email);
    if (emailErr) next.email = emailErr;
    const phoneErr = phoneIssue(form.phone);
    if (phoneErr) next.phone = phoneErr;
    const passErr = passwordIssue(form.password);
    if (passErr) next.password = passErr;
    if (form.confirm !== form.password) next.confirm = "تکرار رمز عبور مطابقت ندارد.";
    if (!terms) next.terms = "برای ثبت‌نام باید قوانین را بپذیرید.";
    if (Object.keys(next).length) return setErrors(next);
    const res = register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    if (!res.ok) return setErrors({ form: res.error });
    navigate("/account", { replace: true, state: { notice: `خوش آمدید ${form.name.trim()}، حساب شما ساخته شد.` } });
  };

  return (
    <AuthShell mode="register">
      <FormShell
        title="ساخت حساب کاربری"
        subtitle="نام، ایمیل و موبایل کافی است؛ شماره موبایل برای رهگیری سفارش لازم است."
        footer={
          <>
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <Link to="/login" className="font-bold text-brand-300 hover:underline">ورود</Link>
          </>
        }
      >
        {errors.form && <p className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-400">{errors.form}</p>}

        <Field id="reg-name" label="نام و نام خانوادگی" value={form.name} onChange={set("name")} error={errors.name} autoComplete="name" placeholder="مثلاً: علی محمدی" icon={<UserPlus className="size-4" />} />
        <Field id="reg-email" label="ایمیل" value={form.email} onChange={set("email")} error={errors.email} dir="ltr" inputMode="email" autoComplete="email" placeholder="name@mail.com" icon={<Mail className="size-4" />} />
        <Field
          id="reg-phone"
          label="شماره موبایل"
          value={form.phone}
          onChange={(v) => { set("phone")(v.replace(/[^\d۰-۹-]/g, "")); }}
          error={errors.phone}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09121234567"
          icon={<Phone className="size-4" />}
        />
        <PasswordField id="reg-pass" label="رمز عبور" value={form.password} onChange={set("password")} autoComplete="new-password" error={errors.password} hint="حداقل ۸ کاراکتر با یک حرف و یک عدد" />
        <PasswordField id="reg-confirm" label="تکرار رمز عبور" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" error={errors.confirm} />

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border bd p-3 transition soft-h">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[#ff6b1a]" checked={terms} onChange={(e) => { setTerms(e.target.checked); setErrors((x) => ({ ...x, terms: "" })); }} />
          <span className="text-[11px] leading-5 tdim">
            <b className="text-[var(--txt)]">شرایط خرید و گارانتی 50500</b> را می‌خوانم و می‌پذیرم.
            {errors.terms && <span className="mt-0.5 block text-[11px] font-bold text-rose-400">{errors.terms}</span>}
          </span>
        </label>

        <button type="button" onClick={submit} className="btn btn-primary shine w-full py-3.5 text-sm">
          <UserPlus className="size-4" /> ایجاد حساب کاربری
        </button>
      </FormShell>
    </AuthShell>
  );
}

/* ---------------------------------- forgot --------------------------------- */

export function ForgotPassword() {
  const { requestReset, verifyReset } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requestCode = () => {
    const issue = emailIssue(email);
    if (issue) return setErrors({ email: issue });
    const res = requestReset(email);
    if (!res.ok) return setErrors({ form: res.error });
    setDemoCode(res.data!.code);
    setErrors({});
    setStep(2);
  };

  const confirmCode = () => {
    const next: Record<string, string> = {};
    if (code.trim().length !== 6) next.code = "کد ۶ رقمی را وارد کنید.";
    const passErr = passwordIssue(password);
    if (passErr) next.password = passErr;
    if (confirm !== password) next.confirm = "تکرار رمز عبور مطابقت ندارد.";
    if (Object.keys(next).length) return setErrors(next);
    const res = verifyReset(email, code, password);
    if (!res.ok) return setErrors({ form: res.error });
    navigate("/login", { replace: true, state: { notice: "رمز عبور جدید ثبت شد. اکنون وارد شوید." } });
  };

  return (
    <AuthShell mode="forgot">
      <FormShell
        title={step === 1 ? "بازیابی رمز عبور" : "تعیین رمز جدید"}
        subtitle={
          step === 1
            ? "ایمیل حساب را وارد کنید تا کد یک‌بارمصرف ارسال شود."
            : "کد ۶ رقمی ارسال‌شده و رمز جدید را وارد کنید."
        }
        footer={
          <>
            رمز به یادتان آمد؟{" "}
            <Link to="/login" className="font-bold text-brand-300 hover:underline">ورود</Link>
          </>
        }
      >
        {errors.form && <p className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-400">{errors.form}</p>}

        {step === 1 ? (
          <>
            <Field id="fp-email" label="ایمیل حساب" value={email} onChange={(v) => { setEmail(v); setErrors({}); }} error={errors.email} dir="ltr" inputMode="email" autoComplete="email" placeholder="name@mail.com" icon={<Mail className="size-4" />} />
            <button type="button" onClick={requestCode} className="btn btn-primary w-full py-3.5 text-sm">
              <KeyRound className="size-4" /> ارسال کد یک‌بارمصرف
            </button>
          </>
        ) : (
          <>
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-[11px] leading-6 text-amber-300">
              نسخه نمایشی بدون سرور SMS است؛ کد شما:{" "}
              <b className="font-mono text-[15px] text-amber-200" dir="ltr">{demoCode}</b>
              <span className="block text-[10px] text-amber-400/80">کد تا ۵ دقیقه معتبر است.</span>
            </p>
            <Field id="fp-code" label="کد یک‌بارمصرف" value={code} onChange={(v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); setErrors({}); }} error={errors.code} dir="ltr" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" icon={<Fingerprint className="size-4" />} />
            <PasswordField id="fp-pass" label="رمز عبور جدید" value={password} onChange={(v) => { setPassword(v); setErrors({}); }} autoComplete="new-password" error={errors.password} hint="حداقل ۸ کاراکتر با یک حرف و یک عدد" />
            <PasswordField id="fp-confirm" label="تکرار رمز جدید" value={confirm} onChange={(v) => { setConfirm(v); setErrors({}); }} autoComplete="new-password" error={errors.confirm} />

            <div className="flex gap-2">
              <button type="button" onClick={() => { setStep(1); setDemoCode(""); setErrors({}); }} className="btn btn-ghost flex-1 py-3 text-xs">
                ویرایش ایمیل
              </button>
              <button type="button" onClick={requestCode} className="btn btn-ghost flex-1 py-3 text-xs">
                ارسال کد جدید
              </button>
            </div>
            <button type="button" onClick={confirmCode} className="btn btn-primary w-full py-3.5 text-sm">
              <Lock className="size-4" /> ثبت رمز جدید و ورود
            </button>
          </>
        )}
      </FormShell>
    </AuthShell>
  );
}

/* ---------------------------------- account -------------------------------- */

export function Account() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;

  const [profile, setProfile] = useState({ name: user?.name ?? "", phone: user?.phone ?? "" });
  const [profileMsg, setProfileMsg] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");

  const orders = useMemo(() => (user ? findOrders(user.phone) : []), [user]);

  if (!user) return <Navigate to="/login" replace state={{ from: "/account" }} />;

  const saveProfile = () => {
    const res = updateProfile(profile);
    setProfileMsg(res.ok ? "اطلاعات حساب به‌روزرسانی شد." : res.error);
  };

  const savePassword = () => {
    if (pw.next !== pw.confirm) return setPwMsg("تکرار رمز جدید مطابقت ندارد.");
    const res = changePassword(pw.current, pw.next);
    setPwMsg(res.ok ? "رمز عبور تغییر کرد." : res.error);
    if (res.ok) setPw({ current: "", next: "", confirm: "" });
  };

  return (
    <div className="container-x py-10 lg:py-14">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black tracking-[.25em] text-brand-400">50500 ACCOUNT</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            سلام، <span className="text-gradient">{user.name}</span>
          </h1>
          <p className="mt-2 text-xs tdim">
            <span dir="ltr" className="font-mono">{user.email}</span> · <span dir="ltr" className="font-mono">{user.phone}</span>
          </p>
        </div>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="btn btn-ghost px-4 py-2.5 text-xs"
        >
          خروج از حساب
        </button>
      </div>

      {notice && <p className="mb-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">{notice}</p>}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* orders */}
        <section className="rounded-3xl border bd p-5 sm:p-6" style={{ background: "var(--surface-1)" }}>
          <h2 className="flex items-center gap-2 text-sm font-black"><ShoppingBag className="size-4 text-brand-400" /> سفارش‌های من</h2>
          {orders.length === 0 ? (
            <div className="mt-5 grid place-items-center gap-3 rounded-2xl border border-dashed bd py-10 text-center">
              <Package className="size-8 tfaint" />
              <p className="text-xs tdim">هنوز سفارشی با این شماره ثبت نشده است.</p>
              <Link to="/products" className="btn btn-ghost px-5 py-2.5 text-xs">شروع خرید</Link>
            </div>
          ) : (
            <ul className="mt-4 grid gap-2.5">
              {orders.map((o) => {
                const st = ORDER_STATUSES.find((s) => s.id === o.status) ?? ORDER_STATUSES[0];
                return (
                  <li key={o.code} className="rounded-2xl border bd p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-brand-300" dir="ltr">#{o.code}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", "border-brand-500/40 bg-brand-500/10 text-brand-300")}>{st.name}</span>
                    </div>
                    <p className="mt-2 text-[11px] tdim">
                      {o.items[0]?.title ?? "محصول 50500"}
                      {o.items.length > 1 && ` و ${fa(o.items.length - 1)} قلم دیگر`}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-black">{money(o.total)}</span>
                      <Link to={`/order/${o.code}`} className="text-[11px] font-bold text-brand-300 hover:underline">جزئیات سفارش</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid content-start gap-5">
          {/* profile */}
          <section className="rounded-3xl border bd p-5 sm:p-6" style={{ background: "var(--surface-1)" }}>
            <h2 className="flex items-center gap-2 text-sm font-black"><UserRound className="size-4 text-brand-400" /> اطلاعات حساب</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold tdim">نام و نام خانوادگی</span>
                <input className="input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold tdim">شماره موبایل</span>
                <input className="input" dir="ltr" inputMode="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
              </label>
            </div>
            {profileMsg && <p className="mt-2 text-[11px] font-bold text-brand-300">{profileMsg}</p>}
            <button onClick={saveProfile} className="btn btn-primary mt-4 w-full py-2.5 text-xs">ذخیره اطلاعات</button>
          </section>

          {/* security */}
          <section className="rounded-3xl border bd p-5 sm:p-6" style={{ background: "var(--surface-1)" }}>
            <h2 className="flex items-center gap-2 text-sm font-black"><Fingerprint className="size-4 text-brand-400" /> تغییر رمز عبور</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold tdim">رمز فعلی</span>
                <input className="input" dir="ltr" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold tdim">رمز جدید</span>
                <input className="input" dir="ltr" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold tdim">تکرار رمز جدید</span>
                <input className="input" dir="ltr" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
              </label>
            </div>
            {pwMsg && <p className="mt-2 text-[11px] font-bold text-brand-300">{pwMsg}</p>}
            <button onClick={savePassword} className="btn btn-ghost mt-4 w-full py-2.5 text-xs">
              <KeyRound className="size-3.5" /> تغییر رمز عبور
            </button>
          </section>

          <div className="rounded-3xl border border-brand-500/25 bg-brand-500/10 p-4">
            <p className="flex items-center gap-2 text-xs font-black text-brand-300"><BadgeCheck className="size-4" /> حساب امن است</p>
            <p className="mt-1.5 text-[11px] leading-6 tdim">رمز عبور شما به‌صورت هش‌شده ذخیره می‌شود و هیچ‌جا به‌صورت متن ساده نمایش داده نمی‌شود.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* keep tree-shaking honest: referenced above via JSX fallback */
function Package(props: { className?: string }) {
  return <ShoppingBag {...props} />;
}

export { normalizePhone };
