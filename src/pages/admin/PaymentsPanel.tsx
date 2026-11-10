import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, CreditCard, Download, Save, ShieldCheck, XCircle } from "lucide-react";
import { GATEWAY_FIELDS, downloadJSON, gatewayIssues, getSecret, patchControlState, setSecret, useControlState, type GatewayConfig, type GatewayId } from "@/lib/control-center";
import { dateFa, money, type AdminOrder } from "@/lib/admin";
import { fa } from "@/lib/format";
import { api, isServerMode } from "@/lib/api";
import { Badge, Card, EmptyState, Field, Notice, PanelHeader, Toggle } from "./ControlUi";

const PAYMENT_LABEL: Record<AdminOrder["payment"], string> = { paid: "پرداخت شده", pending: "در انتظار پرداخت", cod: "پرداخت در محل", refunded: "بازگشت وجه" };

export function PaymentsPanel({ onToast, orders }: { onToast: (message: string) => void; orders: AdminOrder[] }) {
  const state = useControlState();
  const [selectedId, setSelectedId] = useState<GatewayId>("zarinpal");
  const [draft, setDraft] = useState<GatewayConfig | null>(null);
  const [secretVersion, setSecretVersion] = useState(0);
  const [validated, setValidated] = useState(false);

  const selected = state.gateways.find((gateway) => gateway.id === selectedId) ?? state.gateways[0];
  useEffect(() => { setDraft(selected ? { ...selected, fields: { ...selected.fields } } : null); setValidated(false); }, [selectedId, selected?.enabled, selected?.mode, selected?.position, selected?.callbackUrl, selected?.currency]);

  const issues = useMemo(() => draft ? gatewayIssues(draft) : [], [draft, state.gateways, secretVersion]);
  const sorted = [...state.gateways].sort((a, b) => a.position - b.position);
  const active = state.gateways.filter((gateway) => gateway.enabled);
  const complete = active.filter((gateway) => gatewayIssues(gateway).length === 0);
  const paidTotal = orders.filter((order) => order.payment === "paid").reduce((sum, order) => sum + order.total, 0);

  const save = async () => {
    if (!draft) return;
    const position = Math.max(1, Number(draft.position) || 1);
    if (isServerMode()) {
      // Credentials are encrypted in the server vault; secrets are removed from the browser right after.
      const secretKeys = GATEWAY_FIELDS[draft.id].filter((f) => f.secret).map((f) => f.key);
      const secrets = Object.fromEntries(secretKeys.map((k) => [k, getSecret(draft.id, k)]));
      const fields = Object.fromEntries(Object.entries(draft.fields).filter(([k]) => !k.startsWith("__")));
      try {
        const res = await api<{ gateways: Partial<GatewayConfig>[] }>(`/api/admin/gateways/${draft.id}`, {
          method: "PUT", body: { enabled: draft.enabled, mode: draft.mode, currency: draft.currency, position, fields, secrets },
        });
        secretKeys.forEach((k) => setSecret(draft.id, k, ""));
        setSecretVersion((v) => v + 1);
        patchControlState("gateways", state.gateways.map((g) => {
          const serverGw = res.gateways.find((x) => x.id === g.id);
          return serverGw ? ({ ...g, ...serverGw, fields: { ...(serverGw.fields ?? {}) } } as GatewayConfig) : g;
        }));
        setValidated(true);
        onToast(`تنظیمات ${draft.name} رمزنگاری و روی سرور ذخیره شد`);
      } catch (error) {
        onToast(error instanceof Error ? error.message : "ذخیره درگاه ناموفق بود");
      }
      return;
    }
    patchControlState("gateways", state.gateways.map((gateway) => gateway.id === draft.id ? { ...draft, position } : gateway));
    setValidated(true);
    onToast(`تنظیمات ${draft.name} ذخیره شد`);
  };

  const exportOrders = () => {
    const rows = [["کد سفارش", "مشتری", "موبایل", "مبلغ (تومان)", "وضعیت پرداخت", "تاریخ"], ...orders.map((order) => [order.code, order.customer, order.phone, String(order.total), PAYMENT_LABEL[order.payment], order.createdAt])];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "50500-payment-orders.csv"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid gap-5">
      <PanelHeader
        title="درگاه‌های پرداخت"
        description="تنظیم زرین‌پال، سداد، سپ، زیبال و کارت‌به‌کارت؛ اعتبارسنجی اطلاعات و مشاهده وضعیت مالی سفارش‌ها."
        actions={<>
          <button onClick={() => downloadJSON("50500-gateway-settings.json", state.gateways)} className="btn btn-ghost px-4 py-2.5 text-xs"><Download className="size-4" /> خروجی بدون رمز</button>
          <button onClick={exportOrders} className="btn btn-ghost px-4 py-2.5 text-xs"><Download className="size-4" /> خروجی CSV سفارش‌ها</button>
        </>}
      />
      {isServerMode()
        ? <Notice>درگاه‌ها به سرور متصل‌اند: مبلغ همیشه از دیتابیس خوانده می‌شود، تأیید تراکنش سرور‌به‌سرور انجام می‌شود و اطلاعات پذیرنده با AES-256 رمزنگاری شده است. قبل از حالت «واقعی»، یک پرداخت آزمایشی کامل انجام دهید.</Notice>
        : <Notice tone="warning">نسخه نمایشی: تنظیمات و اعتبارسنجی واقعی است اما اتصال بانکی فقط در نسخه سرور انجام می‌شود.</Notice>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "درگاه‌های فعال", value: fa(active.length) },
          { label: "تنظیمات کامل", value: fa(complete.length) },
          { label: "سفارش‌های در انتظار", value: fa(orders.filter((order) => order.payment === "pending").length) },
          { label: "مبلغ پرداخت‌شده", value: money(paidTotal) },
        ].map((item) => <Card key={item.label}><p className="text-[11px] tdim">{item.label}</p><p className="mt-2 text-xl font-black">{item.value}</p></Card>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
        <Card className="self-start" title="روش‌های پرداخت" description="ترتیب نمایش با عدد موقعیت تغییر می‌کند">
          <div className="grid gap-2">
            {sorted.map((gateway) => {
              const count = gatewayIssues(gateway).length;
              return (
                <button key={gateway.id} onClick={() => setSelectedId(gateway.id)} className={`rounded-2xl border p-3 text-start transition ${selectedId === gateway.id ? "border-brand-500/40 bg-brand-500/10" : "bd soft-h"}`}>
                  <span className="flex items-center justify-between gap-2"><span className="text-xs font-black">{gateway.name}</span><Badge tone={gateway.enabled ? count ? "amber" : "green" : "neutral"}>{gateway.enabled ? count ? "ناقص" : "آماده" : "خاموش"}</Badge></span>
                  <span className="mt-1.5 block text-[10px] leading-5 tdim">{gateway.description}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {draft && (
          <Card title={`تنظیمات ${draft.name}`} description="رمزها و کلیدهای مخفی فقط در نشست فعلی مرورگر نگهداری می‌شوند" action={<Badge tone={draft.mode === "production" ? "rose" : "amber"}>{draft.mode === "production" ? "واقعی" : "آزمایشی"}</Badge>}>
            <div className="grid gap-4">
              <Toggle checked={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} label={`فعال‌سازی ${draft.name}`} description="فعال‌بودن به معنی آماده‌بودن برای اتصال سرور است؛ پرداخت واقعی از همین پنل انجام نمی‌شود" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="محیط">
                  <select className="input" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as GatewayConfig["mode"] })} disabled={draft.id === "card"}>
                    <option value="sandbox">آزمایشی / Sandbox</option><option value="production">واقعی / Production</option>
                  </select>
                </Field>
                <Field label="واحد مبلغ">
                  <select className="input" value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as GatewayConfig["currency"] })}>
                    <option value="IRT">تومان (IRT)</option><option value="IRR">ریال (IRR)</option>
                  </select>
                </Field>
                <Field label="موقعیت نمایش"><input className="input" type="number" min={1} max={20} value={draft.position} onChange={(event) => setDraft({ ...draft, position: Number(event.target.value) })} /></Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {GATEWAY_FIELDS[draft.id].map((field) => {
                  const value = field.secret ? getSecret(draft.id, field.key) : draft.fields[field.key] ?? "";
                  return (
                    <Field key={field.key} label={`${field.label}${field.required ? " *" : ""}`} hint={field.secret ? "فقط در sessionStorage؛ با بستن نشست پاک می‌شود" : undefined}>
                      <input
                        className="input"
                        dir={field.dir ?? "rtl"}
                        type={field.secret ? "password" : "text"}
                        value={value}
                        placeholder={field.placeholder}
                        autoComplete="off"
                        onChange={(event) => {
                          if (field.secret) { setSecret(draft.id, field.key, event.target.value); setSecretVersion((value) => value + 1); }
                          else setDraft({ ...draft, fields: { ...draft.fields, [field.key]: event.target.value } });
                          setValidated(false);
                        }}
                      />
                    </Field>
                  );
                })}
              </div>

              {draft.id !== "card" && (
                <Field label="آدرس Callback پیشنهادی" hint="این آدرس باید در نسخه سرور به endpoint تأیید تراکنش متصل شود">
                  <div className="relative">
                    <input className="input pe-11" dir="ltr" value={draft.callbackUrl} onChange={(event) => setDraft({ ...draft, callbackUrl: event.target.value })} />
                    <button onClick={() => { void navigator.clipboard?.writeText(draft.callbackUrl); onToast("آدرس callback کپی شد"); }} className="absolute inset-y-0 end-0 grid w-11 place-items-center tdim" aria-label="کپی callback"><Copy className="size-4" /></button>
                  </div>
                </Field>
              )}

              <div className="flex flex-wrap gap-2">
                <button onClick={() => void save()} className="btn btn-primary px-5 py-2.5 text-xs"><Save className="size-4" /> ذخیره تنظیمات</button>
                <button onClick={() => setValidated(true)} className="btn btn-ghost px-4 py-2.5 text-xs"><ShieldCheck className="size-4" /> بررسی کامل بودن اطلاعات</button>
              </div>

              {validated && (issues.length ? (
                <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
                  <p className="flex items-center gap-2 text-xs font-black text-amber-300"><XCircle className="size-4" /> اطلاعات هنوز کامل نیست</p>
                  <ul className="mt-2 grid gap-1 text-[11px] leading-6 text-amber-200/80">{issues.map((issue) => <li key={issue}>— {issue}</li>)}</ul>
                </div>
              ) : (
                <p className="flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-xs font-bold text-emerald-300"><CheckCircle2 className="size-4" /> همه فیلدهای الزامی کامل و آدرس‌ها معتبر هستند.</p>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card title="وضعیت مالی سفارش‌ها" description="این جدول از همان داده‌های سفارش پنل خوانده می‌شود" action={<CreditCard className="size-5 text-brand-400" />}>
        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start text-xs">
              <thead><tr className="border-b bd text-start tdim"><th className="p-3 text-start">سفارش</th><th className="p-3 text-start">مشتری</th><th className="p-3 text-start">مبلغ</th><th className="p-3 text-start">وضعیت</th><th className="p-3 text-start">تاریخ</th></tr></thead>
              <tbody>{orders.slice(0, 30).map((order) => <tr key={order.code} className="border-b bd last:border-0"><td className="p-3 font-black" dir="ltr">{order.code}</td><td className="p-3"><span className="block font-bold">{order.customer}</span><span className="text-[10px] tdim" dir="ltr">{order.phone}</span></td><td className="p-3 font-bold">{money(order.total)}</td><td className="p-3"><Badge tone={order.payment === "paid" ? "green" : order.payment === "pending" ? "amber" : order.payment === "refunded" ? "rose" : "neutral"}>{PAYMENT_LABEL[order.payment]}</Badge></td><td className="p-3 tdim">{dateFa(order.createdAt)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <EmptyState icon={<CreditCard className="size-7" />} title="سفارشی ثبت نشده" description="بعد از ثبت سفارش، وضعیت مالی آن اینجا نمایش داده می‌شود." />}
      </Card>
    </div>
  );
}
