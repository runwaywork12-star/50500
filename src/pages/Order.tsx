import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
 ArrowLeft,
 Check,
 CheckCircle2,
 CreditCard,
 MapPin,
 Package,
 Phone,
 Printer,
 Truck,
} from "lucide-react";
import { PageHero } from "@/components/ui";
import { getOrder, markOrderPaid, type Order } from "@/lib/cart";
import { ORDER_STATUSES, SHIPPING_METHODS, PAYMENT_METHODS, SITE } from "@/data/content";
import { cn, fa, faDate, maskPhone, money } from "@/lib/format";
import { getControlState, type GatewayConfig } from "@/lib/control-center";
import { LIVE_GATEWAY_IDS, startGatewayPay } from "@/lib/gateways";

const TONE: Record<string, string> = {
 amber: "bg-amber-400/15 text-amber-300 border-amber-400/30",
 blue: "bg-blue-400/15 text-blue-300 border-blue-400/30",
 violet: "bg-violet-400/15 text-violet-300 border-violet-400/30",
 cyan: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
 green: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
 rose: "bg-rose-400/15 text-rose-300 border-rose-400/30",
};

export function StatusTimeline({ status }: { status: string }) {
 const idx = ORDER_STATUSES.findIndex((s) => s.id === status);
 const active = idx === -1 ? 0 : idx;
 return (
  <ol className="flex flex-wrap items-start gap-y-4">
   {ORDER_STATUSES.filter((s) => s.id !== "cancelled").map((s, i) => {
    const done = i <= active;
    return (
     <li key={s.id} className="flex flex-1 items-start gap-2" style={{ minWidth: "120px" }}>
      <span
       className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-black transition",
        done ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/30" : "border bd tfaint",
       )}
      >
       {done ? <Check className="size-4" /> : fa(i + 1)}
      </span>
      <span className="min-w-0">
       <b className={cn("block truncate text-xs", done ? "" : "tfaint")}>{s.name}</b>
       <span className={cn("mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold", TONE[s.tone])}>{s.tone === "green" && done ? "انجام شد" : done ? "انجام شد" : "در انتظار"}</span>
      </span>
      {i < ORDER_STATUSES.filter((x) => x.id !== "cancelled").length - 1 && <span className={cn("mt-4 h-0.5 flex-1", done && i < active ? "bg-brand-500" : "")} style={!done || i >= active ? { background: "var(--line)" } : undefined} />}
     </li>
    );
   })}
  </ol>
 );
}

function orderSummaryRows(order: Order) {
 return [
  ["جمع کالاها", money(order.subtotal)],
  ...(order.discount > 0 ? [["تخفیف" + (order.coupon ? ` (${order.coupon})` : ""), `−${money(order.discount)}`]] : []),
  ["هزینه ارسال", order.shipping === 0 ? "رایگان" : money(order.shipping)],
  ["مبلغ کل", money(order.total)],
 ] as [string, string][];
}

export function OrderPage() {
 const { code } = useParams();
 const order = useMemo(() => getOrder(code ?? ""), [code]);
 const navigate = useNavigate();

 if (!order) {
  return (
   <>
    <PageHero eyebrow="پیگیری سفارش" title="سفارشی با این کد یافت نشد" desc="کد سفارش را بررسی کنید یا از صفحه پیگیری با شماره موبایل جستجو کنید." />
    <div className="container-x py-16 text-center">
     <Link to="/track" className="btn btn-primary px-6 py-3 text-sm">پیگیری سفارش <ArrowLeft className="size-4" /></Link>
    </div>
   </>
  );
 }

 const status = ORDER_STATUSES.find((s) => s.id === order.status) ?? ORDER_STATUSES[0];
 const ship = SHIPPING_METHODS.find((m) => m.id === order.shippingMethod);
 const pay = PAYMENT_METHODS.find((m) => m.id === order.payment);
 const isDemo = !localStorage.getItem("50500_orders_v1")?.includes(order.code);

 return (
  <>
   <PageHero eyebrow="جزئیات سفارش" title={<>سفارش <span className="text-gradient" dir="ltr">#{order.code}</span></>} desc={`ثبت شده در ${faDate(order.createdAt, true)}`} />
   <div className="container-x py-10 lg:py-14">
    <div className="mx-auto grid max-w-4xl gap-6">
     <div className="flex flex-col items-center gap-3 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
      <CheckCircle2 className="size-12 text-emerald-400" />
      <h1 className="text-2xl font-black">سفارش شما با موفقیت ثبت شد!</h1>
      <p className="text-sm leading-7 tdim">
       کد پیگیری سفارش: <b className="text-brand-400" dir="ltr">#{order.code}</b> — این کد را junto با شماره موبایل‌تان برای پیگیری نگه دارید.
      </p>
      {order.paymentStatus !== "paid" && order.payment === "online" && (
       <button onClick={() => navigate(`/pay/${order.code}`)} className="btn btn-primary shine mt-2 px-6 py-3 text-sm">
        <CreditCard className="size-4" /> پرداخت آنلاین سفارش
       </button>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
       <Link to="/track" className="btn btn-ghost px-5 py-2.5 text-xs"><Truck className="size-4" /> پیگیری سفارش</Link>
       <button onClick={() => window.print()} className="btn btn-ghost px-5 py-2.5 text-xs"><Printer className="size-4" /> چاپ فاکتور</button>
       <Link to="/products" className="btn btn-ghost px-5 py-2.5 text-xs">ادامه خرید <ArrowLeft className="size-4" /></Link>
      </div>
     </div>

     <div className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
      <h2 className="mb-5 flex items-center gap-2 text-sm font-black"><Package className="size-5 text-brand-400" /> وضعیت سفارش — <span className={cn("rounded-full border px-2.5 py-1 text-[11px]", TONE[status.tone])}>{status.name}</span></h2>
      <StatusTimeline status={order.status} />
      {isDemo && <p className="mt-4 text-[11px] tfaint">این یک سفارش نمایشی است.</p>}
     </div>

     <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
       <h2 className="mb-4 text-sm font-black">اقلام سفارش</h2>
       <ul className="grid gap-3">
        {order.items.map((it, i) => (
         <li key={i} className="flex items-center gap-3 text-sm">
          <img src={it.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" style={{ background: "var(--muted-surface)" }} />
          <span className="min-w-0 flex-1">
           <span className="block truncate font-bold">{it.title}</span>
           <span className="text-xs tfaint">
            × {fa(it.qty)}
            {it.leather && ` · چرم ${LEATHER_NAME(it.leather)}`}
            {it.thread && ` · گلدوزی ${THREAD_NAME(it.thread)}`}
           </span>
          </span>
          <b className="text-xs">{money(it.price * it.qty)}</b>
         </li>
        ))}
       </ul>
       <dl className="mt-5 grid gap-2 border-t bd pt-4 text-sm">
        {orderSummaryRows(order).map(([k, v]) => (
         <div key={k} className="flex justify-between tdim"><dt>{k}</dt><dd className="font-bold">{v}</dd></div>
        ))}
       </dl>
      </section>

      <section className="grid content-start gap-6">
       <div className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black"><MapPin className="size-4 text-brand-400" /> اطلاعات گیرنده و ارسال</h2>
        <ul className="grid gap-2.5 text-sm tdim">
         <li><b className="text-[var(--txt)]">{order.customer.name}</b> — <span dir="ltr">{maskPhone(order.customer.phone)}</span></li>
         <li className="flex items-center gap-1.5"><Phone className="size-3.5 tfaint" /> {SITE.phone} (pushback)</li>
         <li>{order.customer.province}، {order.customer.city}، {order.customer.address}</li>
         <li>روش ارسال: <b>{ship?.name ?? order.shippingMethod}</b></li>
         <li>روش پرداخت: <b>{pay?.name ?? order.payment}</b> — <span className={order.paymentStatus === "paid" ? "text-emerald-400 font-bold" : "text-amber-300 font-bold"}>{order.paymentStatus === "paid" ? "پرداخت شده" : order.paymentStatus === "cod" ? "پرداخت در محل" : "در انتظار پرداخت"}</span></li>
         {order.customer.notes && <li>یادداشت: {order.customer.notes}</li>}
        </ul>
       </div>
       <div className="rounded-3xl border border-brand-500/25 bg-brand-500/10 p-6 text-center">
        <p className="text-sm font-black">سؤالی درباره سفارش دارید؟</p>
        <a href={SITE.phoneHref} className="btn btn-primary mt-3 px-6 py-3 text-sm w-full sm:w-auto">
         تماس با پشتیبانی: {SITE.phone}
        </a>
       </div>
      </section>
     </div>
    </div>
   </div>
  </>
 );
}

function LEATHER_NAME(id: string) {
 return ({ black: "مشکی", brown: "قهوه‌ای", tan: "عسلی", cream: "کرم", gray: "طوسی", burgundy: "زرشکی", navy: "سرمه‌ای" } as Record<string, string>)[id] ?? id;
}
function THREAD_NAME(id: string) {
 return ({ red: "قرمز", orange: "نارنجی", gold: "طلایی", cream: "کرم", brown: "قهوه‌ای", white: "سفید", blue: "آبی", black: "مشکی" } as Record<string, string>)[id] ?? id;
}

export function PayPage() {
 const { code } = useParams();
 const order = useMemo(() => getOrder(code ?? ""), [code]);
 const navigate = useNavigate();
 const [card, setCard] = useState("");
 const [busy, setBusy] = useState(false);
 const [gatewayBusy, setGatewayBusy] = useState<string | null>(null);
 const [gatewayError, setGatewayError] = useState("");
 const paidCode = order?.paymentStatus === "paid" ? order.code : null;

 useEffect(() => {
  if (paidCode) navigate(`/order/${paidCode}`, { replace: true });
 }, [paidCode, navigate]);

 if (!order) {
  return (
   <>
    <PageHero eyebrow="پرداخت" title="سفارش یافت نشد" desc="از صفحه پیگیری سفارش استفاده کنید." />
    <div className="container-x py-16 text-center">
     <Link to="/track" className="btn btn-primary px-6 py-3 text-sm">پیگیری سفارش</Link>
    </div>
   </>
  );
 }

 if (paidCode) return null;

 // Live gateways enabled from the admin panel (Zarinpal / Bank Mellat Pay Iran).
 const gateways: GatewayConfig[] = getControlState().gateways.filter((g) => g.enabled && (LIVE_GATEWAY_IDS as string[]).includes(g.id));

 const startGateway = async (gw: GatewayConfig) => {
  setGatewayError("");
  setGatewayBusy(gw.id);
  try {
   const res = await startGatewayPay(gw, order.total);
   window.location.assign(res.url);
  } catch (err) {
   setGatewayError(err instanceof Error ? err.message : "اتصال به درگاه ناموفق بود.");
   setGatewayBusy(null);
  }
 };

 const pay = () => {
  if (card.replace(/\D/g, "").length < 12) return;
  setBusy(true);
  setTimeout(() => {
   markOrderPaid(order.code);
   navigate(`/order/${order.code}`);
  }, 1200);
 };

 return (
  <>
   <PageHero eyebrow="درگاه پرداخت" title={<>پرداخت سفارش <span dir="ltr" className="text-gradient">#{order.code}</span></>} desc="پرداخت در صفحه رسمی بانک انجام می‌شود؛ اطلاعات کارت شما هرگز وارد این سایت نمی‌شود." />
   <div className="container-x py-10">
    <div className="mx-auto grid max-w-lg gap-5 rounded-[2rem] border bd p-8" style={{ background: "var(--surface-1)" }}>
     <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-black"><CreditCard className="size-5 text-brand-400" /> درگاه پرداخت 50500</span>
      <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-black text-amber-300">{gateways.length === 0 ? "Sandbox" : "درگاه فعال"}</span>
     </div>
     <div>
      <p className="text-xs tfaint">مبلغ قابل پرداخت</p>
      <p className="mt-1 text-3xl font-black">{money(order.total)} <span className="text-sm tdim">تومان</span></p>
     </div>

     {gateways.length > 0 && (
      <div className="grid gap-2">
       {gateways.map((gw) => (
        <button
         key={gw.id}
         onClick={() => void startGateway(gw)}
         disabled={gatewayBusy !== null}
         className="btn btn-primary w-full justify-between py-3.5 text-sm disabled:opacity-60"
        >
         <span>پرداخت با {gw.name}</span>
         <span className="flex items-center gap-2">
          {gw.mode === "sandbox" && <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold">آزمایشی</span>}
          {gatewayBusy === gw.id ? "در حال اتصال..." : "ادامه"}
         </span>
        </button>
       ))}
       {gatewayError && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-bold leading-6 text-rose-400">{gatewayError}</p>}
       <p className="text-center text-[10px] leading-5 tfaint">
        با کلیک روی درگاه، درخواست آغاز پرداخت بر اساس مستندات درگاه (زرین‌پال zap.ir/apiv2 یا PaymentStartRequest بانک ملت) ارسال و شما به صفحه بانکی هدایت می‌شوید.
       </p>
      </div>
     )}

     <div className="rounded-2xl border border-dashed bd p-4" style={{ background: "var(--field)" }}>
      <p className="text-xs font-black tdim">شبیه‌ساز پرداخت (تست بدون کسر مبلغ)</p>
      <label className="mt-3 grid gap-1.5">
       <span className="text-xs font-bold tdim">شماره کارت (تست)</span>
       <input
        className="input font-mono"
        dir="ltr"
        inputMode="numeric"
        placeholder="6037-9911-2233-4455"
        value={card}
        onChange={(e) => setCard(e.target.value.replace(/[^0-9-]/g, "").slice(0, 19))}
       />
      </label>
      <button onClick={pay} disabled={busy || card.replace(/\D/g, "").length < 12} className="btn btn-ghost mt-3 w-full py-3 text-sm">
       {busy ? "در حال اتصال به درگاه..." : `تسویه تستی ${money(order.total)} تومان`}
      </button>
      <p className="mt-2 text-center text-[10px] tfaint">با کلیک روی تسویه تستی، سفارش شما «پرداخت‌شده» ثبت می‌شود.</p>
     </div>
    </div>
   </div>
  </>
  );
}
