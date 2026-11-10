import { useState } from "react";
import { KeyRound, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, Card, Field, Notice } from "./ControlUi";

export type AdminInfo = { id: string; email: string; name: string; role: string; totpEnabled: boolean };

/** Owner/staff account security: two-factor authentication and password rotation. */
export function AdminSecurityCard({ admin, onChange, onToast }: { admin: AdminInfo; onChange: (admin: AdminInfo) => void; onToast: (message: string) => void }) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [disable, setDisable] = useState({ password: "", code: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "عملیات ناموفق بود"); } finally { setBusy(""); }
  };

  return (
    <Card title="امنیت حساب مدیر" description={`${admin.email} · ${admin.role === "owner" ? "مدیر اصلی" : "کارمند"}`} action={<Badge tone={admin.totpEnabled ? "green" : "amber"}>{admin.totpEnabled ? "ورود دومرحله‌ای فعال" : "ورود دومرحله‌ای غیرفعال"}</Badge>}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid content-start gap-3">
          <p className="flex items-center gap-2 text-xs font-black"><Smartphone className="size-4 text-brand-400" /> ورود دومرحله‌ای (TOTP)</p>
          {!admin.totpEnabled && !setup && (
            <>
              <Notice tone="warning">به‌شدت توصیه می‌شود: با فعال‌سازی، حتی اگر رمز شما لو برود، ورود بدون کد شش‌رقمی گوشی ممکن نیست.</Notice>
              <button onClick={() => void run("setup", async () => setSetup(await api<{ secret: string; uri: string }>("/api/admin/totp/setup", { method: "POST" })))} className="btn btn-primary py-2.5 text-xs">
                {busy === "setup" ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} شروع فعال‌سازی
              </button>
            </>
          )}
          {setup && (
            <>
              <p className="text-[11px] leading-6 tdim">در Google Authenticator یا Microsoft Authenticator گزینه «Enter a setup key» را بزنید و این کلید را وارد کنید، سپس کد شش‌رقمی را بنویسید:</p>
              <code className="select-all break-all rounded-xl soft p-3 text-center font-mono text-sm font-black tracking-widest" dir="ltr">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
              <Field label="کد شش‌رقمی برنامه"><input className="input text-center font-mono tracking-[.4em]" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></Field>
              <button disabled={code.length !== 6} onClick={() => void run("enable", async () => {
                await api("/api/admin/totp/enable", { method: "POST", body: { code } });
                onChange({ ...admin, totpEnabled: true }); setSetup(null); setCode(""); onToast("ورود دومرحله‌ای فعال شد");
              })} className="btn btn-primary py-2.5 text-xs disabled:opacity-50">{busy === "enable" ? <LoaderCircle className="size-4 animate-spin" /> : null} تأیید و فعال‌سازی</button>
            </>
          )}
          {admin.totpEnabled && (
            <>
              <Field label="رمز فعلی"><input className="input" type="password" dir="ltr" autoComplete="current-password" value={disable.password} onChange={(e) => setDisable({ ...disable, password: e.target.value })} /></Field>
              <Field label="کد شش‌رقمی فعلی"><input className="input font-mono" dir="ltr" inputMode="numeric" maxLength={6} value={disable.code} onChange={(e) => setDisable({ ...disable, code: e.target.value.replace(/\D/g, "") })} /></Field>
              <button onClick={() => void run("disable", async () => {
                await api("/api/admin/totp/disable", { method: "POST", body: disable });
                onChange({ ...admin, totpEnabled: false }); setDisable({ password: "", code: "" }); onToast("ورود دومرحله‌ای غیرفعال شد");
              })} className="btn btn-ghost py-2.5 text-xs !text-rose-400">غیرفعال‌سازی</button>
            </>
          )}
        </div>

        <div className="grid content-start gap-3">
          <p className="flex items-center gap-2 text-xs font-black"><KeyRound className="size-4 text-brand-400" /> تغییر رمز مدیر</p>
          <Field label="رمز فعلی"><input className="input" type="password" dir="ltr" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="رمز جدید" hint="حداقل ۱۲ کاراکتر؛ بعد از تغییر، همه نشست‌های دیگر خارج می‌شوند"><input className="input" type="password" dir="ltr" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          <Field label="تکرار رمز جدید"><input className="input" type="password" dir="ltr" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
          <button disabled={!pw.current || pw.next.length < 12 || pw.next !== pw.confirm} onClick={() => void run("pw", async () => {
            await api("/api/admin/password", { method: "POST", body: { current: pw.current, next: pw.next } });
            setPw({ current: "", next: "", confirm: "" }); onToast("رمز مدیر تغییر کرد و نشست‌های دیگر بسته شدند");
          })} className="btn btn-primary py-2.5 text-xs disabled:opacity-50">{busy === "pw" ? <LoaderCircle className="size-4 animate-spin" /> : null} ذخیره رمز جدید</button>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-400">{error}</p>}
    </Card>
  );
}
