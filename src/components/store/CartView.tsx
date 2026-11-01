"use client";

import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { fa } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/options";

export function CartView() {
  const { items, ready, subtotal, compareTotal, update, remove, count } = useCart();

  if (!ready) {
    return (
      <div className="grid gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl soft" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="surface grid place-items-center rounded-[2rem] px-6 py-20 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-2xl" />
          <span className="relative grid size-24 place-items-center rounded-full border bd bg-ink-800">
            <ShoppingBag className="size-10 text-brand-400" />
          </span>
        </div>
        <h2 className="mt-6 text-2xl font-black">سبد خرید شما خالی است</h2>
        <p className="mt-2 text-sm tdim">کفپوش چرمی گلدوزی مخصوص خودروی خود را پیدا کنید و رنگ دلخواهتان را انتخاب کنید.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/products" className="btn btn-primary px-6 py-3.5">
            رفتن به فروشگاه <ArrowLeft className="size-4" />
          </Link>
          <Link href="/products?discounted=1&sort=discount" className="btn btn-ghost px-6 py-3.5">
            پیشنهادهای ویژه
          </Link>
        </div>
      </div>
    );
  }

  const savings = compareTotal - subtotal;
  const toFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-3">
        <div className="surface rounded-3xl p-5">
          <p className="flex items-center gap-2 text-sm">
            <Truck className="size-5 text-brand-400" />
            {toFree > 0 ? (
              <>
                فقط <b className="text-brand-300">{fa(toFree)} تومان</b> تا ارسال رایگان با پست پیشتاز
              </>
            ) : (
              <b className="text-emerald-300">تبریک! ارسال سفارش شما با پست پیشتاز رایگان است 🎉</b>
            )}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full soft">
            <div className="h-full rounded-full bg-linear-to-l from-brand-300 to-brand-600 transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {items.map((item) => (
          <div key={item.id} className="surface flex gap-4 rounded-3xl p-4 sm:p-5">
            <Link href={`/products/${item.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-ink-700 sm:size-28">
              <Image src={item.image || "/api/site-image/mat"} alt={item.title} fill sizes="112px" className="object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/products/${item.slug}`} className="line-clamp-2 text-sm font-bold leading-7 hover:text-brand-300 sm:text-base">
                  {item.title}
                </Link>
                <button onClick={() => remove(item.id)} className="grid size-9 shrink-0 place-items-center rounded-xl tdim transition hover:bg-rose-500/10 hover:text-rose-300" aria-label="حذف">
                  <Trash2 className="size-4" />
                </button>
              </div>
              {item.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.options.map((o) => (
                    <span key={o.key} className="flex items-center gap-1.5 rounded-full soft px-2.5 py-1 text-[11px] tdim">
                      {o.hex && <span className="size-2.5 rounded-full ring-1 ring-[var(--line)]" style={{ background: o.hex }} />}
                      {o.label}: {o.value}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                <div className="flex items-center rounded-xl border bd soft">
                  <button onClick={() => update(item.id, item.quantity + 1)} className="grid size-9 place-items-center tdim hover:text-white" aria-label="افزایش">
                    <Plus className="size-4" />
                  </button>
                  <span className="w-7 text-center text-sm font-black">{fa(item.quantity)}</span>
                  <button onClick={() => update(item.id, item.quantity - 1)} className="grid size-9 place-items-center tdim hover:text-white" aria-label="کاهش">
                    <Minus className="size-4" />
                  </button>
                </div>
                <div className="text-left">
                  {item.comparePrice && item.comparePrice > item.price && (
                    <p className="text-xs tdim line-through">{fa(item.comparePrice * item.quantity)}</p>
                  )}
                  <p className="font-black">
                    {fa(item.price * item.quantity)} <span className="text-xs font-medium tdim">تومان</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="surface rounded-3xl p-6">
          <h2 className="text-lg font-black">خلاصه سفارش</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between tdim">
              <dt>قیمت کالاها ({fa(count)} عدد)</dt>
              <dd>{fa(compareTotal)} تومان</dd>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-rose-300">
                <dt>سود شما از این خرید</dt>
                <dd>{fa(savings)} تومان</dd>
              </div>
            )}
            <div className="flex justify-between tdim">
              <dt>هزینه ارسال</dt>
              <dd className="text-xs">در مرحله بعد محاسبه می‌شود</dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t bd pt-4">
              <dt className="font-bold">جمع سبد خرید</dt>
              <dd className="text-xl font-black">
                {fa(subtotal)} <span className="text-xs font-medium tdim">تومان</span>
              </dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn btn-primary shine mt-6 w-full py-4 text-base">
            ادامه و ثبت سفارش <ArrowLeft className="size-5" />
          </Link>
          <p className="mt-4 flex items-center gap-2 text-xs tdim">
            <ShieldCheck className="size-4 text-emerald-400" /> خرید امن با ضمانت اصالت و ۱۲ ماه گارانتی
          </p>
        </div>
      </aside>
    </div>
  );
}
