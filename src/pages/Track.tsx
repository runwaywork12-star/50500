import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, PackageSearch, Search, ShoppingBag } from "lucide-react";
import { PageHero } from "@/components/ui";
import { useSiteContent } from "@/lib/site-content";
import { StatusTimeline } from "./Order";
import { findOrders, getOrder, type Order } from "@/lib/cart";
import { ORDER_STATUSES, PAYMENT_METHODS, SHIPPING_METHODS } from "@/data/content";
import { cn, fa, faDate, maskPhone, money, normalizePhone } from "@/lib/format";

export default function Track() {
  const { content } = useSiteContent();
  const trackPage = content.pageContent.track ?? {};
 const [code, setCode] = useState("");
 const [phone, setPhone] = useState("");
 const [result, setResult] = useState<Order | null>(null);
 const [error, setError] = useState("");

 const recent = useMemo(() => findOrders(""), [result]); // stored orders (any) — demo list shown separately

 const submit = (e: FormEvent) => {
  e.preventDefault();
  setError("");
    const order = getOrder(code);
  if (!order) {
   setResult(null);
   setError("سفارشی با این کد یافت نشد. کد ۸ رقمیِ سفارش را درست وارد کنید.");
   return;
  }
  const p = normalizePhone(phone);
  const okPhone = normalizePhone(order.customer.phone) === p || (order as unknown as { phone?: string }).phone === p;
  if (p && !okPhone) {
   setResult(null);
   setError("شماره موبایل با این سفارش تطابق ندارد.");
   return;
  }
  setResult(order);
 };

 const status = result ? ORDER_STATUSES.find((s) => s.id === result.status) ?? ORDER_STATUSES[0] : null;

 return (
  <>
   <PageHero
    eyebrow="رهگیری سفارش"
    title={trackPage.title || "پیگیری سفارش"}
    desc={trackPage.desc || "کد سفارش (۸ رقمی) و شماره موبایل خود را وارد کنید تا وضعیت سفارش را ببینید."}
   />
   <div className="container-x py-10 lg:py-14">
    <form onSubmit={submit} className="mx-auto grid max-w-2xl gap-3 rounded-[2rem] border bd p-6 sm:grid-cols-[1fr_1fr_auto] sm:p-5" style={{ background: "var(--surface-1)" }}>
     <input className="input" dir="ltr" inputMode="numeric" placeholder="کد سفارش — مثلاً 40001234" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9۰-۹]/g, ""))} />
     <input className="input" dir="ltr" inputMode="tel" placeholder="شماره موبایل — 09121234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
     <button type="submit" className="btn btn-primary px-6 py-3 text-sm whitespace-nowrap">
      <Search className="size-4" /> رهگیری
     </button>
    </form>

    {error && (
     <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-bold text-rose-400">
      {error}
     </div>
    )}

    {result && status && (
     <div className="mx-auto mt-8 grid max-w-4xl gap-6">
      <div className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
       <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-black">
         سفارش <span dir="ltr" className="text-brand-400">#{result.code}</span>
        </h2>
        <span className={cn("rounded-full border px-3 py-1 text-[11px] font-black", status.tone === "green" ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300" : "border-brand-500/40 bg-brand-500/10 text-brand-300")}>
         {status.name}
        </span>
       </div>
       <p className="mt-1 text-xs tfaint">ثبت‌شده در {faDate(result.createdAt, true)} · گیرنده: {result.customer.name} · <span dir="ltr">{maskPhone(result.customer.phone)}</span></p>
       <div className="mt-5">
        <StatusTimeline status={result.status} />
       </div>
       <div className="mt-6 grid gap-6 border-t bd pt-5 sm:grid-cols-2">
        <div>
         <h3 className="mb-3 text-sm font-black">اقلام</h3>
         <ul className="grid gap-2 text-sm tdim">
          {result.items.map((it, i) => (
           <li key={i} className="flex justify-between gap-3">
            <span className="truncate">{it.title} <span className="tfaint">× {fa(it.qty)}</span></span>
            <b className="shrink-0 text-xs">{money(it.price * it.qty)}</b>
           </li>
          ))}
         </ul>
        </div>
        <div>
         <h3 className="mb-3 text-sm font-black">خلاصه پرداخت</h3>
         <dl className="grid gap-2 text-sm tdim">
          <div className="flex justify-between"><dt>جمع</dt><dd className="font-bold">{money(result.subtotal)}</dd></div>
          {result.discount > 0 && <div className="flex justify-between text-emerald-400"><dt>تخفیف</dt><dd className="font-bold">−{money(result.discount)}</dd></div>}
          <div className="flex justify-between"><dt>ارسال ({SHIPPING_METHODS.find((m) => m.id === result.shippingMethod)?.name ?? result.shippingMethod})</dt><dd className="font-bold">{result.shipping === 0 ? "رایگان" : money(result.shipping)}</dd></div>
          <div className="flex justify-between border-t bd pt-2 text-[var(--txt)]"><dt className="font-black">کل</dt><dd className="font-black">{money(result.total)}</dd></div>
          <div className="flex justify-between"><dt>پرداخت ({PAYMENT_METHODS.find((m) => m.id === result.payment)?.name ?? result.payment})</dt><dd className="font-bold">{result.paymentStatus === "paid" ? <span className="text-emerald-400">پرداخت شده</span> : result.paymentStatus === "cod" ? <span className="text-amber-300">در محل</span> : <span className="text-amber-300">در انتظار پرداخت</span>}</dd></div>
         </dl>
        </div>
       </div>
       <Link to={`/order/${result.code}`} className="btn btn-ghost mt-6 px-5 py-2.5 text-sm">
        مشاهده کامل سفارش <ArrowLeft className="size-4" />
       </Link>
      </div>
     </div>
    )}

    {/* quick demo hints + stored orders */}
    <div className="mx-auto mt-10 grid max-w-4xl gap-6 lg:grid-cols-2">
     <div className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
      <h3 className="flex items-center gap-2 text-sm font-black"><PackageSearch className="size-4 text-brand-400" /> سفارش‌های ثبت‌شده در این مرورگر</h3>
      {recent.length === 0 ? (
       <p className="mt-3 text-sm tdim">هنوز سفارشی در این دستگاه ثبت نکرده‌اید.</p>
      ) : (
       <ul className="mt-3 grid gap-2">
        {recent.slice(0, 5).map((o) => (
         <li key={o.code}>
          <Link to={`/order/${o.code}`} className="flex items-center justify-between rounded-2xl border bd px-4 py-3 text-sm transition hover:border-brand-500/40">
           <span className="font-black" dir="ltr">#{o.code}</span>
           <span className="tfaint">{faDate(o.createdAt)} · {money(o.total)}</span>
          </Link>
         </li>
        ))}
       </ul>
      )}
     </div>
     <div className="rounded-3xl border border-dashed bd p-6">
      <h3 className="flex items-center gap-2 text-sm font-black"><ShoppingBag className="size-4 text-brand-400" /> کدهای نمایشی برای تست</h3>
      <p className="mt-3 text-xs leading-6 tdim">برای تست رهگیری می‌توانید از کدهای زیر با شماره موبایل مربوطه استفاده کنید:</p>
      <ul className="mt-3 grid gap-2 text-xs">
       {[
        ["40001234", "09121234567"],
        ["40017072", "09137778899"],
        ["40032910", "09151239876"],
        ["40056667", "09125556677"],
       ].map(([c, p]) => (
        <li key={c} className="flex items-center justify-between rounded-xl border bd px-3 py-2">
         <span dir="ltr" className="font-black text-brand-300">{c}</span>
         <span dir="ltr" className="tfaint">{p}</span>
        </li>
       ))}
      </ul>
     </div>
    </div>
   </div>
  </>
 );
}
