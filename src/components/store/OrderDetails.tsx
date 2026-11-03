import Image from "next/image";
import { Ban, Check, CircleCheck, ClipboardCheck, Factory, PackageCheck, Truck } from "lucide-react";
import type { OrderWithItems } from "@/lib/queries";
import { cn, fa, faDate, maskPhone } from "@/lib/format";
import { PAYMENT_STATUSES, SHIPPING_METHODS, TONES, orderStatus } from "@/lib/options";

const FLOW = [
  { id: "pending", name: "ثبت سفارش", icon: ClipboardCheck },
  { id: "confirmed", name: "تایید و پرداخت", icon: CircleCheck },
  { id: "producing", name: "در حال تولید", icon: Factory },
  { id: "shipped", name: "ارسال شده", icon: Truck },
  { id: "delivered", name: "تحویل شده", icon: PackageCheck },
];

export function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
        <Ban className="size-5" /> این سفارش لغو شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.
      </div>
    );
  }
  const idx = Math.max(0, FLOW.findIndex((f) => f.id === status));
  return (
    <ol className="grid grid-cols-5 gap-1">
      {FLOW.map((f, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={f.id} className="relative flex flex-col items-center text-center">
            {i < FLOW.length - 1 && (
              <span className={cn("absolute top-5 h-0.5 w-full", i < idx ? "bg-emerald-500" : "soft")} style={{ insetInlineStart: "50%" }} />
            )}
            <span
              className={cn(
                "relative z-10 grid size-10 place-items-center rounded-full border-2 transition",
                done && "border-emerald-500 bg-emerald-500 text-[#fff]",
                current && "border-brand-500 bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/40",
                !done && !current && "bd bg-ink-800 tdim",
              )}
            >
              {done ? <Check className="size-5" /> : <f.icon className="size-5" />}
            </span>
            <span className={cn("mt-2 text-[10px] font-bold sm:text-xs", done || current ? "text-white" : "tdim")}>{f.name}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderSummary({ data }: { data: OrderWithItems }) {
  const { order, items } = data;
  const status = orderStatus(order.status);
  const pay = PAYMENT_STATUSES[order.paymentStatus] ?? PAYMENT_STATUSES.pending;
  const ship = SHIPPING_METHODS.find((m) => m.id === order.shippingMethod);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="surface rounded-3xl p-5 sm:p-6">
        <h3 className="font-black">اقلام سفارش</h3>
        <div className="mt-4 grid gap-3">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-2xl soft p-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-ink-700">
                <Image src={it.image || "/api/site-image/mat"} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold">{it.title}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {it.options.map((o) => (
                    <span key={o.key} className="flex items-center gap-1 rounded-full soft px-2 py-0.5 text-[10px] tdim">
                      {o.hex && <span className="size-2 rounded-full" style={{ background: o.hex }} />}
                      {o.value}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-left text-xs">
                <p className="tdim">{fa(it.quantity)} عدد</p>
                <p className="mt-1 font-bold">{fa(it.unitPrice * it.quantity)} تومان</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface rounded-3xl p-5 sm:p-6">
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="tdim">وضعیت</dt>
            <dd className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", TONES[status.tone])}>{status.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="tdim">پرداخت</dt>
            <dd className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", TONES[pay.tone])}>{pay.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="tdim">تاریخ ثبت</dt>
            <dd>{faDate(order.createdAt, true)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="tdim">گیرنده</dt>
            <dd>{order.customerName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="tdim">موبایل</dt>
            <dd dir="ltr">{maskPhone(order.phone)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="tdim">مقصد</dt>
            <dd>
              {order.province}، {order.city}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="tdim">روش ارسال</dt>
            <dd>{ship?.name ?? order.shippingMethod}</dd>
          </div>
          <div className="mt-2 grid gap-2 border-t bd pt-4">
            <div className="flex justify-between tdim">
              <dt>جمع کالاها</dt>
              <dd>{fa(order.subtotal)} تومان</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-300">
                <dt>تخفیف</dt>
                <dd>− {fa(order.discount)} تومان</dd>
              </div>
            )}
            <div className="flex justify-between tdim">
              <dt>ارسال</dt>
              <dd>{order.shippingCost ? `${fa(order.shippingCost)} تومان` : order.shippingMethod === "tipax" ? "پس‌کرایه" : "رایگان"}</dd>
            </div>
            <div className="flex justify-between pt-2 text-base font-black">
              <dt>مبلغ کل</dt>
              <dd className="text-brand-300">{fa(order.total)} تومان</dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  );
}
