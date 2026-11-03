"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CreditCard, LoaderCircle, ShieldCheck, TriangleAlert, Wallet } from "lucide-react";
import { fa } from "@/lib/format";
import { themePath } from "@/lib/theme-path";

type Gateway = { id: "sandbox" | "zarinpal" | "zibal" | "manual"; name: string; desc: string; cardNumber?: string; cardOwner?: string };
type GatewayResponse = { gateways?: Gateway[] };
type StartResponse = { ok?: boolean; mode?: "redirect" | "page" | "manual" | "paid"; payUrl?: string; cardNumber?: string; cardOwner?: string; amount?: number; error?: string };

export function PayGateway({ code, total, name }: { code: string; total: number; name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState<StartResponse | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/pay/gateways", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("دریافت روش‌های پرداخت ناموفق بود");
        return (await res.json()) as GatewayResponse;
      })
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data.gateways) ? data.gateways : [];
        setGateways(list);
        setSelected(list[0]?.id ?? "");
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "خطا در دریافت درگاه‌ها"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const start = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    setManual(null);
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, gateway: selected }),
      });
      const data = (await res.json().catch(() => ({}))) as StartResponse;
      if (!res.ok) throw new Error(data.error || "شروع پرداخت ناموفق بود");
      if (data.mode === "paid") {
        router.push(themePath(pathname, `/order/${code}?paid=1`));
        return;
      }
      if (data.mode === "redirect" && data.payUrl) {
        window.location.assign(data.payUrl);
        return;
      }
      if (data.mode === "manual") {
        setManual(data);
        setBusy(false);
        return;
      }
      if (data.mode === "page" && selected === "sandbox") {
        // Only the explicitly enabled development sandbox can use the simulated success path.
        const sim = await fetch("/api/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, result: "success" }),
        });
        const result = (await sim.json().catch(() => ({}))) as StartResponse;
        if (!sim.ok) throw new Error(result.error || "پرداخت آزمایشی ناموفق بود");
        router.push(themePath(pathname, `/order/${code}?paid=1`));
        return;
      }
      throw new Error("پاسخ نامعتبر از سرویس پرداخت دریافت شد");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در شروع پرداخت");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-3 text-xs">
        <ShieldCheck className="size-4 shrink-0 text-emerald-300" /> پرداخت آنلاین فقط از طریق درگاه فعال‌شده انجام می‌شود؛ اطلاعات کارت را در این صفحه وارد نکنید.
      </div>
      <div className="surface rounded-[2rem] p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-sky-500/15 text-sky-300"><CreditCard className="size-6" /></span>
          <div>
            <h1 className="text-xl font-black">انتخاب روش پرداخت</h1>
            <p className="mt-1 text-sm tdim">سفارش {fa(code)} · پرداخت‌کننده: {name}</p>
          </div>
        </div>
        <div className="my-6 rounded-2xl border bd p-4">
          <p className="text-sm tdim">مبلغ قابل پرداخت</p>
          <p className="mt-1 text-2xl font-black">{fa(total)} <span className="text-sm font-medium tdim">تومان</span></p>
        </div>

        {loading ? <p className="py-5 text-sm tdim">در حال دریافت درگاه‌های فعال…</p> : gateways.length === 0 ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm"><TriangleAlert className="mb-2 inline size-4" /> در حال حاضر روش پرداختی فعال نیست. لطفاً با پشتیبانی تماس بگیرید.</div>
        ) : (
          <div className="grid gap-3">
            {gateways.map((gateway) => (
              <label key={gateway.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${selected === gateway.id ? "border-brand-500 bg-brand-500/5" : "bd"}`}>
                <input type="radio" name="gateway" value={gateway.id} checked={selected === gateway.id} onChange={() => setSelected(gateway.id)} className="mt-1" />
                <span className="flex-1"><span className="block font-bold">{gateway.name}</span><span className="mt-1 block text-sm tdim">{gateway.desc}</span></span>
              </label>
            ))}
          </div>
        )}

        {manual && <div className="mt-5 rounded-2xl border bd p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-bold"><Wallet className="size-5" /> اطلاعات واریز کارت‌به‌کارت</div>
          <p>شماره کارت: <b dir="ltr">{manual.cardNumber || "ثبت نشده"}</b></p>
          <p>به نام: <b>{manual.cardOwner || "—"}</b></p>
          <p>مبلغ: <b>{fa(manual.amount ?? total)} تومان</b></p>
          <p className="mt-3 tdim">سفارش پس از بررسی و تأیید واریز توسط فروشگاه نهایی می‌شود.</p>
        </div>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
        <button type="button" onClick={start} disabled={loading || !selected || busy || gateways.length === 0 || !!manual} className="btn btn-primary mt-6 flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50">
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
          {busy ? "در حال اتصال به درگاه…" : selected === "manual" ? "نمایش اطلاعات واریز" : "ادامه به پرداخت"}
        </button>
      </div>
    </div>
  );
}
