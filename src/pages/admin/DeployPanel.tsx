import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, Check as CheckIcon, ChevronDown, Copy, Database, Download, FileCode,
  Gauge, HardDrive, KeyRound, LoaderCircle, Lock, Play, RefreshCcw, Rocket,
  Server, ShieldCheck, Terminal, Wand2, Zap,
} from "lucide-react";
import { Badge, Card, Notice, PanelHeader, Toggle } from "./ControlUi";
import { useControlState, gatewayIssues } from "@/lib/control-center";
import { fa } from "@/lib/format";
import {
  auditChecks, bundleBytes, defaultEnv, deploymentBundle, downloadText,
  probeHealth, randomSecret, readinessScore, renderEnv, DEPLOY_STEPS,
  type BundleFile, type Check, type EnvConfig, type Health, type ProbeState, type Severity,
} from "@/lib/deploy";
import { downloadDeployBundleZip, downloadFullProjectZip } from "@/lib/project-zip";

const SEVERITY: Record<Severity, { label: string; cls: string }> = {
  critical: { label: "حیاتی", cls: "border-rose-400/40 bg-rose-400/12 text-rose-300" },
  high: { label: "مهم", cls: "border-amber-400/40 bg-amber-400/12 text-amber-300" },
  medium: { label: "متوسط", cls: "border-sky-400/40 bg-sky-400/12 text-sky-300" },
  info: { label: "اطلاعی", cls: "border-white/15 bg-white/5 tdim" },
};

const GROUP_ICON = {
  "دیتابیس": Database,
  "ذخیره‌سازی": HardDrive,
  "پرداخت": Lock,
  "امنیت": ShieldCheck,
  "سرعت": Zap,
} as const;

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const tone = score >= 90 ? "#34d399" : score >= 70 ? "#ff8f45" : "#fb7185";
  return (
    <div className="relative grid size-36 shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="size-36 -rotate-90">
        <defs>
          <linearGradient id="deployRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffb063" />
            <stop offset="55%" stopColor={tone} />
            <stop offset="100%" stopColor="#ff3d2e" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke="url(#deployRing)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)", filter: `drop-shadow(0 0 10px ${tone}66)` }}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="text-3xl font-black leading-none">{fa(score)}</span>
        <span className="mt-1 text-[10px] font-bold tdim">آمادگی از ۱۰۰</span>
      </div>
    </div>
  );
}

function ProbeCard({
  icon: Icon, title, state, lines, accent,
}: { icon: typeof Server; title: string; state: ProbeState | "warn"; lines: string[]; accent: string }) {
  const dot = state === "online" ? "bg-emerald-400" : state === "loading" ? "bg-amber-400" : state === "warn" ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="deploy-probe rounded-2xl border bd p-4" style={{ background: "var(--surface-1)" }}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: `${accent}1f`, color: accent }}>
          {state === "loading" ? <LoaderCircle className="size-4.5 animate-spin" /> : <Icon className="size-4.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black">{title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] tfaint">
            <span className={`size-1.5 rounded-full ${dot} ${state === "online" ? "animate-pulse" : ""}`} />
            {state === "online" ? "متصل" : state === "loading" ? "در حال بررسی…" : state === "warn" ? "نیازمند تنظیم" : "آفلاین / نمایشی"}
          </p>
        </div>
      </div>
      <ul className="mt-3 grid gap-1 text-[10.5px] leading-5 tdim">
        {lines.map((l, i) => <li key={i} className="truncate" title={l}>{l}</li>)}
      </ul>
    </div>
  );
}

function Slider({
  label, value, min, max, step = 1, unit, onChange, hint,
}: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between text-[11px] font-bold tdim">
        {label}
        <b className="rounded-md bg-brand-500/15 px-1.5 py-0.5 font-mono text-[10px] text-brand-300">{fa(value)} {unit}</b>
      </span>
      <input
        type="range" className="deploy-range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
      {hint && <span className="text-[10px] leading-4 tfaint">{hint}</span>}
    </label>
  );
}

function SecretField({ label, value, onChange, length, hint }: { label: string; value: string; onChange: (v: string) => void; length: number; hint?: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const strong = value.length >= length;
  return (
    <div className="grid gap-1.5">
      <span className="flex items-center justify-between text-[11px] font-bold tdim">
        {label}
        <span className={`text-[10px] font-bold ${strong ? "text-emerald-400" : "text-rose-400"}`}>{fa(value.length)}/{fa(length)} کاراکتر</span>
      </span>
      <div className="flex gap-1.5">
        <input
          className="input flex-1 font-mono !py-2 !text-[11px]" dir="ltr" type={shown ? "text" : "password"}
          value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off"
        />
        <button type="button" onClick={() => setShown((v) => !v)} title={shown ? "پنهان" : "نمایش"} className="grid size-9 shrink-0 place-items-center rounded-xl border bd tdim transition soft-h">
          <Lock className="size-3.5" />
        </button>
        <button
          type="button" title="تولید رمز تازه" onClick={() => onChange(randomSecret(Math.max(length, 24)))}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand-500/40 bg-brand-500/10 text-brand-300 transition hover:bg-brand-500/20"
        >
          <Wand2 className="size-3.5" />
        </button>
        <button
          type="button" title="کپی"
          onClick={() => { void navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="grid size-9 shrink-0 place-items-center rounded-xl border bd tdim transition soft-h"
        >
          {copied ? <CheckIcon className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      {hint && <span className="text-[10px] leading-4 tfaint">{hint}</span>}
    </div>
  );
}

export function DeployPanel({ onToast }: { onToast: (message: string) => void }) {
  const control = useControlState();
  const [cfg, setCfg] = useState<EnvConfig>(() => defaultEnv());
  const [probe, setProbe] = useState<{ state: ProbeState; health?: Health; error?: string; ms: number }>({ state: "idle", ms: 0 });
  const [openCheck, setOpenCheck] = useState<string | null>(null);
  const [group, setGroup] = useState<string>("همه");
  const [onlyFailing, setOnlyFailing] = useState(false);
  const [tab, setTab] = useState<"env" | "files" | "steps">("env");
  const [activeFile, setActiveFile] = useState(0);
  const [downloading, setDownloading] = useState(-1);
  const [copiedCmd, setCopiedCmd] = useState(-1);
  const [metrics, setMetrics] = useState<{ ttfb: number; dom: number; load: number; transfer: number } | null>(null);
  const autoRan = useRef(false);

  const runProbe = useCallback(async () => {
    setProbe((p) => ({ ...p, state: "loading" }));
    const result = await probeHealth();
    setProbe(result);
    return result;
  }, []);

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    void runProbe();
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      setMetrics({
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        dom: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        load: Math.round(nav.loadEventEnd - nav.startTime),
        transfer: nav.transferSize || nav.encodedBodySize || 0,
      });
    }
  }, [runProbe]);

  const gatewaysConfigured = control.gateways.filter((g) => g.enabled && gatewayIssues(g).length === 0).length;
  const checks = useMemo(
    () => auditChecks(cfg, probe.health ?? null, probe.state === "online", gatewaysConfigured),
    [cfg, probe, gatewaysConfigured],
  );
  const score = readinessScore(checks);
  const failing = checks.filter((c) => !c.pass);
  const criticals = failing.filter((c) => c.severity === "critical");
  const bundle = useMemo(() => deploymentBundle(cfg), [cfg]);
  const envText = useMemo(() => renderEnv(cfg), [cfg]);

  const groups = ["همه", ...Array.from(new Set(checks.map((c) => c.group)))];
  const visible = checks.filter((c) => (group === "همه" || c.group === group) && (!onlyFailing || !c.pass));
  const set = <K extends keyof EnvConfig>(key: K, value: EnvConfig[K]) => setCfg((c) => ({ ...c, [key]: value }));

  const copy = (text: string, i: number, label: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedCmd(i);
    setTimeout(() => setCopiedCmd(-1), 1400);
    onToast(`${label} کپی شد`);
  };

  const grabBundle = async () => {
    setDownloading(0);
    try {
      const count = await downloadDeployBundleZip(cfg, (done) => setDownloading(done));
      onToast(`بسته استقرار (${fa(count)} فایل) در قالب ZIP دانلود شد`);
    } finally {
      setDownloading(-1);
    }
  };

  const grabFullProject = async () => {
    setDownloading(0);
    try {
      const count = await downloadFullProjectZip(cfg, (done) => setDownloading(done));
      onToast(`کل پروژه + تنظیمات (${fa(count)} فایل) در قالب ZIP دانلود شد`);
    } finally {
      setDownloading(-1);
    }
  };

  const file: BundleFile = bundle[Math.min(activeFile, bundle.length - 1)];

  return (
    <div className="grid gap-5">
      <PanelHeader
        title="استقرار، امنیت و زیرساخت"
        description="تبدیل این فروشگاه به یک پروژه واقعی: PostgreSQL، فضای ذخیره‌سازی، پرداخت تأییدشده سمت سرور، ضدنفوذ و بهینه‌سازی سرعت."
        actions={
          <>
            <button onClick={() => void runProbe()} disabled={probe.state === "loading"} className="btn btn-ghost px-4 py-2.5 text-xs disabled:opacity-60">
              {probe.state === "loading" ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />} تست زنده سرور
            </button>
            <button onClick={() => void grabBundle()} disabled={downloading >= 0} className="btn btn-ghost px-4 py-2.5 text-xs disabled:opacity-60">
              {downloading >= 0 ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />} بسته استقرار (ZIP)
            </button>
            <button onClick={() => void grabFullProject()} disabled={downloading >= 0} className="btn btn-primary px-4 py-2.5 text-xs disabled:opacity-60">
              {downloading >= 0 ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />} دانلود کل پروژه + تنظیمات (ZIP)
            </button>
          </>
        }
      />

      {/* ---------------------------- readiness hero ---------------------------- */}
      <div className="deploy-hero relative overflow-hidden rounded-3xl border bd p-5 sm:p-6">
        <div className="deploy-hero-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-6">
          <ScoreRing score={score} />
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/35 bg-brand-500/10 px-3 py-1 text-[11px] font-black text-brand-300">
                <Rocket className="size-3.5" /> آماده‌سازی تولید
              </span>
              <Badge tone={criticals.length === 0 ? "green" : "rose"}>
                {criticals.length === 0 ? "هیچ ایراد حیاتی" : `${fa(criticals.length)} ایراد حیاتی`}
              </Badge>
              <Badge tone={probe.state === "online" ? "green" : "neutral"}>
                {probe.state === "online" ? "سرور واقعی متصل" : "پیش‌نمایش ایستا"}
              </Badge>
            </div>
            <h2 className="mt-3 text-lg font-black leading-8 sm:text-xl">
              {score >= 90 ? "زیرساخت آماده انتشار است" : score >= 70 ? "نزدیک به آماده‌سازی کامل" : "چند مورد حیاتی باید تکمیل شود"}
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-7 tdim">
              {fa(checks.length - failing.length)} بررسی از {fa(checks.length)} بررسی پاس شده است. هر تغییر در کنترل‌های پایین،
              بلافاصله امتیاز، فایل <b className="font-mono text-brand-300">.env</b> و بسته استقرار را به‌روز می‌کند.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["دیتابیس", "ذخیره‌سازی", "پرداخت", "امنیت", "سرعت"] as const).map((g) => {
                const all = checks.filter((c) => c.group === g);
                const bad = all.filter((c) => !c.pass).length;
                const Icon = GROUP_ICON[g];
                return (
                  <button
                    key={g} onClick={() => { setGroup(g); setOnlyFailing(false); }}
                    className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition ${
                      bad === 0 ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    }`}
                  >
                    <Icon className="size-3.5" /> {g}
                    <span className="opacity-70">{bad === 0 ? "✓" : fa(bad)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------ live probes ----------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProbeCard
          icon={Server} title="سرور API (Node.js)" accent="#ff8f45"
          state={probe.state === "idle" ? "loading" : probe.state}
          lines={probe.state === "online"
            ? [`نسخه ${probe.health?.version} · ${probe.health?.node}`, `آپتایم ${fa(probe.health?.uptimeSec ?? 0)} ثانیه`, `پاسخ ${fa(probe.ms)} میلی‌ثانیه`]
            : [probe.error ?? "در انتظار بررسی", "پس از docker compose up فعال می‌شود", "مسیر: /api/health"]}
        />
        <ProbeCard
          icon={Database} title="پایگاه داده PostgreSQL" accent="#38bdf8"
          state={probe.state === "loading" ? "loading" : probe.health?.database?.ok ? "online" : "offline"}
          lines={probe.health?.database?.ok
            ? [probe.health.database.version ?? "", `بانک ${probe.health.database.database} · ${probe.health.database.size}`, `تأخیر ${fa(probe.health.database.latencyMs ?? 0)}ms`]
            : ["۱۳ جدول + ایندکس‌های آماده", "تراکنش و قفل موجودی", "بدون پورت عمومی"]}
        />
        <ProbeCard
          icon={HardDrive} title="فضای ذخیره‌سازی" accent="#a78bfa"
          state={probe.state === "loading" ? "loading" : probe.health?.storage?.ok ? "online" : cfg.storage === "local" || (cfg.s3Bucket && cfg.s3Key) ? "warn" : "offline"}
          lines={probe.health?.storage?.ok
            ? [`درایور ${probe.health.storage.driver}`, probe.health.storage.bucket ?? probe.health.storage.dir ?? "", "WebP + حذف EXIF"]
            : [cfg.storage === "s3" ? `S3 · ${cfg.s3Bucket || "باکت تنظیم نشده"}` : "دیسک ماندگار /data/uploads", `سقف ${fa(cfg.maxUploadMb)} مگابایت`, "بازرمزگذاری خودکار"]}
        />
        <ProbeCard
          icon={Lock} title="درگاه‌های پرداخت" accent="#34d399"
          state={gatewaysConfigured > 0 ? "online" : "warn"}
          lines={[
            `${fa(gatewaysConfigured)} درگاه کامل و فعال`,
            "تأیید + تسویه سمت سرور",
            "مبلغ از دیتابیس، ضد Replay",
          ]}
        />
      </div>

      {/* --------------------------- permanent controls -------------------------- */}
      <Card
        title="کنترل زیرساخت"
        description="همه پارامترها زنده اعمال می‌شوند؛ خروجی .env و امتیاز امنیت بلافاصله تغییر می‌کند."
        action={<Badge tone={criticals.length ? "amber" : "green"}>{criticals.length ? "در حال پیکربندی" : "پیکربندی کامل"}</Badge>}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid content-start gap-4">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-bold tdim">آدرس سایت (HTTPS اجباری)</span>
              <input className="input font-mono !text-xs" dir="ltr" value={cfg.origin} onChange={(e) => set("origin", e.target.value)} placeholder="https://50500.shop" />
            </label>

            <div className="grid gap-1.5">
              <span className="text-[11px] font-bold tdim">نوع فضای ذخیره‌سازی</span>
              <div className="grid grid-cols-2 gap-2">
                {(["local", "s3"] as const).map((mode) => (
                  <button
                    key={mode} onClick={() => set("storage", mode)}
                    className={`rounded-xl border p-3 text-start transition ${cfg.storage === mode ? "border-brand-500/60 bg-brand-500/12" : "bd soft-h"}`}
                  >
                    <span className="block text-xs font-black">{mode === "local" ? "دیسک سرور" : "فضای ابری S3"}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 tdim">{mode === "local" ? "ساده، روی volume ماندگار" : "لیارا / آروان / مینو + CDN"}</span>
                  </button>
                ))}
              </div>
            </div>

            {cfg.storage === "s3" && (
              <div className="grid gap-2.5 rounded-2xl border border-violet-400/25 bg-violet-400/[0.06] p-3">
                <p className="text-[11px] font-black text-violet-300">اتصال S3</p>
                <input className="input !py-2 font-mono !text-[11px]" dir="ltr" placeholder="https://storage.iran.liara.space" value={cfg.s3Endpoint} onChange={(e) => set("s3Endpoint", e.target.value)} />
                <input className="input !py-2 font-mono !text-[11px]" dir="ltr" placeholder="bucket name" value={cfg.s3Bucket} onChange={(e) => set("s3Bucket", e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input !py-2 font-mono !text-[11px]" dir="ltr" placeholder="access key" value={cfg.s3Key} onChange={(e) => set("s3Key", e.target.value)} />
                  <input className="input !py-2 font-mono !text-[11px]" dir="ltr" type="password" placeholder="secret key" value={cfg.s3Secret} onChange={(e) => set("s3Secret", e.target.value)} />
                </div>
                <input className="input !py-2 font-mono !text-[11px]" dir="ltr" placeholder="https://cdn.50500.shop" value={cfg.s3PublicBase} onChange={(e) => set("s3PublicBase", e.target.value)} />
              </div>
            )}

            <Slider label="عمر نشست مدیریت" value={cfg.sessionHours} min={1} max={72} unit="ساعت" onChange={(v) => set("sessionHours", v)} hint="کوکی HttpOnly + SameSite=Lax" />
            <Slider label="انقضای سفارش پرداخت‌نشده" value={cfg.unpaidTtl} min={5} max={240} step={5} unit="دقیقه" onChange={(v) => set("unpaidTtl", v)} hint="موجودی خودکار برمی‌گردد" />
            <Slider label="حداکثر اتصال دیتابیس" value={cfg.poolMax} min={5} max={40} unit="اتصال" onChange={(v) => set("poolMax", v)} />
            <Slider label="سقف حجم آپلود" value={cfg.maxUploadMb} min={2} max={25} unit="مگابایت" onChange={(v) => set("maxUploadMb", v)} />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => { setCfg(defaultEnv()); onToast("همه رمزها دوباره تولید شدند"); }}
                className="btn btn-ghost px-4 py-2.5 text-xs"
              >
                <Wand2 className="size-4" /> تولید مجدد همه رمزها
              </button>
              <button onClick={() => { downloadText(".env", envText); onToast("فایل .env دانلود شد"); }} className="btn btn-primary px-4 py-2.5 text-xs">
                <Download className="size-4" /> دانلود .env
              </button>
            </div>
          </div>

          <div className="grid content-start gap-4">
            <SecretField label="رمز عبور دیتابیس" value={cfg.dbPassword} length={24} onChange={(v) => set("dbPassword", v)} hint="در POSTGRES_PASSWORD و DATABASE_URL یکسان استفاده می‌شود" />
            <SecretField label="رمز مدیر اصلی" value={cfg.adminPassword} length={16} onChange={(v) => set("adminPassword", v)} hint="حداقل ۱۶ کاراکتر؛ سرور در production بدون آن بالا نمی‌آید" />
            <SecretField label="کلید رمزنگاری (ADMIN_SECRET)" value={cfg.adminSecret} length={32} onChange={(v) => set("adminSecret", v)} hint="ثابت نگه دارید؛ تغییر آن داده‌های رمزشده را غیرقابل بازیابی می‌کند" />
            <SecretField label="کلید Cron" value={cfg.cronSecret} length={24} onChange={(v) => set("cronSecret", v)} />
            <div className="rounded-2xl border bd p-3" style={{ background: "var(--field)" }}>
              <Toggle
                checked={onlyFailing} onChange={setOnlyFailing}
                label="فقط موارد نیازمند اقدام"
                description={`${fa(failing.length)} مورد از ${fa(checks.length)} بررسی هنوز پاس نشده است`}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------- audit list ------------------------------ */}
      <Card title="ممیزی امنیت و عملکرد" description="هر ردیف یک کنترل واقعی روی کد سرور است؛ برای دیدن راه‌حل روی آن بزنید.">
        <div className="mb-4 flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <button
              key={g} onClick={() => setGroup(g)}
              className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold transition ${group === g ? "border-brand-500/60 bg-brand-500/15 text-brand-300" : "bd tdim soft-h"}`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {visible.map((check: Check) => {
            const Icon = GROUP_ICON[check.group];
            const open = openCheck === check.id;
            return (
              <div key={check.id} className={`overflow-hidden rounded-2xl border transition ${check.pass ? "bd" : "border-amber-400/30"}`} style={{ background: "var(--surface-2)" }}>
                <button onClick={() => setOpenCheck(open ? null : check.id)} className="flex w-full items-center gap-3 p-3 text-start transition soft-h">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${check.pass ? "bg-emerald-400/15 text-emerald-400" : "bg-rose-400/15 text-rose-400"}`}>
                    {check.pass ? <CheckIcon className="size-4" /> : <AlertTriangle className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <b className="text-xs">{check.title}</b>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-black ${SEVERITY[check.severity].cls}`}>{SEVERITY[check.severity].label}</span>
                      <span className="inline-flex items-center gap-1 text-[9px] tfaint"><Icon className="size-3" />{check.group}</span>
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] leading-5 tdim">{check.detail}</span>
                  </span>
                  <ChevronDown className={`size-4 shrink-0 tdim transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                <div className="deploy-collapse" data-open={open}>
                  <div className="overflow-hidden">
                    <div className="border-t bd px-4 py-3 text-[11px] leading-6 tdim">
                      <p className="text-brand-300">{check.detail}</p>
                      <p className="mt-2"><b className="text-[var(--txt)]">راه‌حل: </b>{check.fix}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <p className="rounded-2xl border border-dashed bd p-8 text-center text-xs tdim">موردی برای نمایش نیست — همه بررسی‌های این گروه پاس شده‌اند ✓</p>
          )}
        </div>
      </Card>

      {/* --------------------------- tabs: env/files/steps ----------------------- */}
      <Card
        title="خروجی استقرار"
        description="فایل‌های واقعی سرور، دیتابیس و پروکسی — آماده اجرا روی VPS."
        action={
          <div className="flex gap-1 rounded-xl border bd p-1" style={{ background: "var(--field)" }}>
            {([["env", "فایل .env"], ["files", `فایل‌ها (${fa(bundle.length)})`], ["steps", "مراحل نصب"]] as const).map(([id, label]) => (
              <button
                key={id} onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${tab === id ? "bg-brand-500 text-white" : "tdim hover:text-[var(--txt)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        {tab === "env" && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{fa(new TextEncoder().encode(envText).length)} بایت</Badge>
              <button onClick={() => copy(envText, -2, "فایل .env")} className="btn btn-ghost px-3 py-2 text-[11px]">
                {copiedCmd === -2 ? <CheckIcon className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />} کپی
              </button>
              <button onClick={() => { downloadText(".env", envText); onToast("فایل .env دانلود شد"); }} className="btn btn-primary px-3 py-2 text-[11px]">
                <Download className="size-3.5" /> دانلود
              </button>
            </div>
            <pre dir="ltr" className="deploy-code max-h-96 overflow-auto rounded-2xl border bd p-4 text-[11px] leading-6">{envText}</pre>
            <Notice tone="warning">این فایل حاوی رمزهای واقعی است؛ آن را در گیت کامیت نکنید و فقط روی سرور با دسترسی محدود نگه دارید.</Notice>
          </div>
        )}

        {tab === "files" && (
          <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="deploy-scroll grid max-h-[26rem] content-start gap-1 overflow-y-auto pe-1">
              {bundle.map((f, i) => (
                <button
                  key={f.path} onClick={() => setActiveFile(i)}
                  className={`rounded-xl border p-2.5 text-start transition ${i === activeFile ? "border-brand-500/50 bg-brand-500/12" : "bd soft-h"}`}
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="size-3.5 shrink-0 text-brand-400" />
                    <b dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[10.5px]">{f.path}</b>
                    {downloading === i && <LoaderCircle className="size-3 animate-spin text-brand-300" />}
                  </span>
                  <span className="mt-1 block truncate text-[10px] leading-4 tdim">{f.note}</span>
                </button>
              ))}
            </div>
            <div className="grid content-start gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{fa(new TextEncoder().encode(file.content).length)} بایت</Badge>
                <span className="text-[10px] tfaint">{file.note}</span>
                <button onClick={() => copy(file.content, -3, file.path)} className="btn btn-ghost ms-auto px-3 py-1.5 text-[11px]">
                  {copiedCmd === -3 ? <CheckIcon className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />} کپی
                </button>
                <button onClick={() => { downloadText(file.path, file.content); onToast(`${file.path} دانلود شد`); }} className="btn btn-primary px-3 py-1.5 text-[11px]">
                  <Download className="size-3.5" /> دانلود
                </button>
              </div>
              <pre dir="ltr" className="deploy-code max-h-[24rem] overflow-auto rounded-2xl border bd p-4 text-[10.5px] leading-5">{file.content}</pre>
              <p className="text-[10px] tfaint">مجموع بسته: {fa(Math.round(bundleBytes(bundle) / 1024))} کیلوبایت · {fa(bundle.length)} فایل</p>
            </div>
          </div>
        )}

        {tab === "steps" && (
          <ol className="grid gap-3">
            {DEPLOY_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border bd p-4" style={{ background: "var(--surface-2)" }}>
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-xs font-black text-brand-300">{fa(i + 1)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black">{step.title}</p>
                    <p className="mt-1 text-[11px] leading-6 tdim">{step.body}</p>
                    <div className="mt-2 flex items-center gap-2 rounded-xl border bd p-2" style={{ background: "var(--bg)" }}>
                      <Terminal className="size-3.5 shrink-0 text-brand-400" />
                      <code dir="ltr" className="deploy-scroll min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[10.5px]">{step.cmd}</code>
                      <button onClick={() => copy(step.cmd, i, "دستور")} className="grid size-7 shrink-0 place-items-center rounded-lg bd tdim transition soft-h" aria-label="کپی دستور">
                        {copiedCmd === i ? <CheckIcon className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* ------------------------------ performance ------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="سنجه‌های واقعی این صفحه" description="اندازه‌گیری زنده از Performance API مرورگر" icon={<Gauge className="size-4.5" />}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "TTFB", value: metrics ? `${fa(metrics.ttfb)}ms` : "—", good: (metrics?.ttfb ?? 999) < 300 },
              { label: "DOM Ready", value: metrics ? `${fa(metrics.dom)}ms` : "—", good: (metrics?.dom ?? 9999) < 1800 },
              { label: "Load", value: metrics ? `${fa(metrics.load)}ms` : "—", good: (metrics?.load ?? 9999) < 3000 },
              { label: "حجم انتقال", value: metrics?.transfer ? `${fa(Math.round(metrics.transfer / 1024))}KB` : "کش", good: true },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border bd p-3" style={{ background: "var(--field)" }}>
                <p className="text-[10px] tfaint">{m.label}</p>
                <p className={`mt-1.5 text-sm font-black ${m.good ? "text-emerald-300" : "text-amber-300"}`}>{m.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-6 tdim">
            در نسخه production، Nginx پاسخ‌ها را فشرده و کش می‌کند و تصاویر WebP با هدر immutable سرو می‌شوند؛
            بنابراین TTFB و حجم انتقال روی سرور واقعی به‌مراتب کمتر از پیش‌نمایش تک‌فایلی خواهد بود.
          </p>
        </Card>

        <Card title="لایه‌های دفاعی فعال" description="خلاصه مکانیزم‌هایی که در کد سرور پیاده شده‌اند" icon={<ShieldCheck className="size-4.5" />}>
          <div className="grid gap-2">
            {[
              { icon: KeyRound, t: "scrypt + salt", d: "هش رمز با N=32768 و مقایسه زمان‌ثابت" },
              { icon: Lock, t: "AES-256-GCM", d: "رمزنگاری کلید درگاه‌ها در دیتابیس" },
              { icon: ShieldCheck, t: "CSRF + Origin", d: "توکن هدر و کنترل مبدأ روی همه نوشتن‌ها" },
              { icon: Activity, t: "Rate limit دولایه", d: "Nginx در لبه + express-rate-limit در برنامه" },
              { icon: HardDrive, t: "Magic bytes + sharp", d: "رد فایل جعلی و حذف متادیتای تصویر" },
              { icon: Database, t: "FOR UPDATE + unique", d: "ضد فروش مازاد و ضد پرداخت تکراری" },
            ].map((row) => (
              <div key={row.t} className="flex items-center gap-3 rounded-xl border bd p-2.5" style={{ background: "var(--field)" }}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-400"><row.icon className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[11px]">{row.t}</b>
                  <span className="block truncate text-[10px] tdim">{row.d}</span>
                </span>
                <CheckIcon className="size-4 shrink-0 text-emerald-400" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="چک‌لیست پیش از انتشار" description="چهار کاری که حتماً باید روی سرور واقعی انجام شود">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            { t: "یک پرداخت آزمایشی کامل", d: "با درگاه در حالت sandbox یک سفارش ثبت، پرداخت و تأیید کنید و ببینید وضعیت سفارش «پرداخت‌شده» می‌شود." },
            { t: "فعال‌سازی ورود دومرحله‌ای", d: "برای مدیر اصلی TOTP را فعال کنید تا لو رفتن رمز به‌تنهایی کافی نباشد." },
            { t: "پشتیبان‌گیری خودکار", d: "cron روزانه pg_dump را فعال و یک بار بازیابی آن را روی سرور تست امتحان کنید." },
            { t: "بررسی واحد پول درگاه", d: "زرین‌پال IRT (تومان) و ملت IRR (ریال) است؛ قرارداد پذیرنده خود را چک کنید." },
          ].map((item, i) => (
            <div key={item.t} className="flex items-start gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/[0.06] p-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-500/20 text-[11px] font-black text-brand-300">{fa(i + 1)}</span>
              <span className="min-w-0">
                <b className="block text-xs">{item.t}</b>
                <span className="mt-1 block text-[11px] leading-6 tdim">{item.d}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => void runProbe()} className="btn btn-ghost px-4 py-2.5 text-xs"><Play className="size-4" /> اجرای دوباره تست زنده</button>
          <button onClick={() => void grabBundle()} disabled={downloading >= 0} className="btn btn-ghost px-4 py-2.5 text-xs disabled:opacity-60">
            <Download className="size-4" /> بسته استقرار سرور (ZIP)
          </button>
          <button onClick={() => void grabFullProject()} disabled={downloading >= 0} className="btn btn-primary px-4 py-2.5 text-xs disabled:opacity-60">
            <Rocket className="size-4" /> دانلود کل پروژه + تنظیمات (ZIP)
          </button>
        </div>
      </Card>
    </div>
  );
}
