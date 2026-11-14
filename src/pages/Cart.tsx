import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Tag, Trash2, Truck, X } from "lucide-react";
import { PageHero } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { FREE_SHIPPING_THRESHOLD, LEATHER_COLORS, THREAD_COLORS, matImageFor } from "@/data/content";
import { cn, fa, money } from "@/lib/format";

export default function Cart() {
 const { detailed, count, subtotal, discount, coupon, setQty, removeItem, applyCoupon, removeCoupon } = useCart();
 const [code, setCode] = useState("");
 const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

 const afterDiscount = subtotal - discount;
 const shipping = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : 120000;
 const total = afterDiscount + shipping;
 const progress = Math.min(100, Math.round((afterDiscount / FREE_SHIPPING_THRESHOLD) * 100));

 const submitCoupon = () => {
  const r = applyCoupon(code);
  setMsg({ ok: r.ok, text: r.message });
  setCode("");
 };

 return (
  <>
   <PageHero eyebrow="سبد خرید" title="سبد خرید شما" desc={count > 0 ? `${fa(count)} کالا در سبد شماست` : "سبد خرید شما خالی است"} />
   <div className="container-x py-10 lg:py-14">
    {detailed.length === 0 ? (
     <div className="mx-auto grid max-w-md place-items-center gap-4 rounded-[2rem] border border-dashed bd py-20 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-brand-500/10 text-brand-400">
       <ShoppingBag className="size-8" />
      </span>
      <p className="text-lg font-black">سبد خرید شما خالی است</p>
      <p className="text-sm tdim">کفپوش اختصاصی خودروی خود را پیدا کنید و به سبد اضافه کنید.</p>
      <Link to="/products" className="btn btn-primary mt-2 px-6 py-3 text-sm">
       رفتن به فروشگاه <ArrowLeft className="size-4" />
      </Link>
     </div>
    ) : (
     <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      {/* items */}
      <div className="grid content-start gap-3">
       {detailed.map((x) => {
        const leatherName = x.leather ? LEATHER_COLORS.find((c) => c.id === x.leather)?.name : null;
        const threadName = x.thread ? THREAD_COLORS.find((c) => c.id === x.thread)?.name : null;
        return (
         <div key={`${x.slug}-${x.leather ?? ""}-${x.thread ?? ""}`} className="flex gap-4 rounded-3xl border bd p-4" style={{ background: "var(--surface-1)" }}>
          <Link to={`/products/${x.slug}`} className="block size-24 shrink-0 overflow-hidden rounded-2xl" style={{ background: "var(--muted-surface)" }}>
           <img src={x.leather ? matImageFor(x.leather) : x.product.image} alt={x.product.title} loading="lazy" decoding="async" className="h-full w-full object-contain p-1" />
          </Link>
          <div className="min-w-0 flex-1">
           <div className="flex items-start justify-between gap-3">
            <Link to={`/products/${x.slug}`} className="line-clamp-2 text-sm font-black leading-6 hover:text-brand-300">
             {x.product.title}
            </Link>
            <button
             onClick={() => removeItem(x.slug, x.leather, x.thread)}
             className="grid size-8 shrink-0 place-items-center rounded-lg tfaint transition hover:bg-rose-500/10 hover:text-rose-400"
             aria-label="حذف از سبد"
            >
             <Trash2 className="size-4" />
            </button>
           </div>
           {(leatherName || threadName) && (
            <p className="mt-1 text-[11px] tfaint">
             {[leatherName && `چرم ${leatherName}`, threadName && `گلدوزی ${threadName}`].filter(Boolean).join(" · ")}
            </p>
           )}
           <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center rounded-xl border bd" style={{ background: "var(--field)" }}>
             <button onClick={() => setQty(x.slug, x.qty - 1, x.leather, x.thread)} className="grid size-10 place-items-center transition soft-h sm:size-11" aria-label="کاهش">
              <Minus className="size-3.5" />
             </button>
             <span className="w-8 text-center text-sm font-black">{fa(x.qty)}</span>
             <button onClick={() => setQty(x.slug, x.qty + 1, x.leather, x.thread)} className="grid size-10 place-items-center transition soft-h sm:size-11" aria-label="افزایش">
              <Plus className="size-3.5" />
             </button>
            </div>
            <div className="text-end">
             {x.product.comparePrice && x.product.comparePrice > x.product.price && (
              <p className="text-[11px] tdim line-through decoration-rose-400/60">{fa(x.product.comparePrice * x.qty)}</p>
             )}
             <p className="text-base font-black">{money(x.product.price * x.qty)}</p>
            </div>
           </div>
          </div>
         </div>
        );
       })}

       {/* coupon */}
       <div className="rounded-3xl border bd p-4" style={{ background: "var(--surface-1)" }}>
        <p className="mb-3 flex items-center gap-2 text-sm font-black"><Tag className="size-4 text-brand-400" /> کد تخفیف</p>
        {coupon ? (
         <div className="flex items-center justify-between rounded-2xl bg-brand-500/10 px-4 py-3">
          <span className="text-sm font-black text-brand-400" dir="ltr">{coupon}</span>
          <button onClick={removeCoupon} className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:underline">
           <X className="size-3.5" /> حذف کد
          </button>
         </div>
        ) : (
         <div className="flex gap-2">
          <input
           className="input"
           dir="ltr"
           placeholder="کد تخفیف (مثلاً 50500)"
           value={code}
           onChange={(e) => setCode(e.target.value)}
           onKeyDown={(e) => e.key === "Enter" && submitCoupon()}
          />
          <button onClick={submitCoupon} className="btn btn-ghost px-4 text-sm whitespace-nowrap">اعمال</button>
         </div>
        )}
        {msg && <p className={cn("mt-2 text-xs font-bold", msg.ok ? "text-emerald-400" : "text-rose-400")}>{msg.text}</p>}
       </div>
      </div>

      {/* summary */}
      <aside className="hidden lg:sticky lg:top-32 lg:block lg:self-start">
       <div className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
        <h2 className="text-base font-black">خلاصه سفارش</h2>

        {/* free shipping progress */}
        <div className="mt-4 rounded-2xl border bd p-4" style={{ background: "var(--field)" }}>
         <p className="flex items-center gap-2 text-xs font-bold">
          <Truck className="size-4 text-brand-400" />
          {afterDiscount >= FREE_SHIPPING_THRESHOLD ? "ارسال شما رایگان شد! 🎉" : <>تا ارسال رایگان <span className="text-brand-400">{money(FREE_SHIPPING_THRESHOLD - afterDiscount)}</span> مانده</>}
         </p>
         <div className="mt-2.5 h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
          <div className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600 transition-all duration-500" style={{ width: `${progress}%` }} />
         </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm">
         <div className="flex justify-between tdim"><dt>جمع کالاها ({fa(count)})</dt><dd className="font-bold">{money(subtotal)}</dd></div>
         {discount > 0 && (
          <div className="flex justify-between text-emerald-400"><dt>تخفیف ({coupon})</dt><dd className="font-bold">−{money(discount)}</dd></div>
         )}
         <div className="flex justify-between tdim">
          <dt>هزینه ارسال</dt>
          <dd className="font-bold">{shipping === 0 ? <span className="text-emerald-400">رایگان</span> : money(shipping)}</dd>
         </div>
         <div className="flex justify-between border-t bd pt-3 text-base font-black">
          <dt>مبلغ قابل پرداخت</dt>
          <dd>{money(total)}</dd>
         </div>
        </dl>

        <Link to="/checkout" className="btn btn-primary shine mt-5 w-full py-4 text-sm">
         ادامه و تکمیل خرید <ArrowLeft className="size-5" />
        </Link>

       </div>
      </aside>
     </div>
    )}

    {/* Mobile: one clear action, total always visible */}
    {detailed.length > 0 && (
     <div className="mc-cart-bar lg:hidden">
      <div className="mc-cart-total">
       <small>مبلغ قابل پرداخت</small>
       <b>{money(total)} <span>تومان</span></b>
      </div>
      <Link to="/checkout" className="mc-cart-cta">
       ادامه و تسویه <ArrowLeft className="size-4" />
      </Link>
     </div>
    )}
   </div>
  </>
 );
}
