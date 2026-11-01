import type { Metadata } from "next";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck, CreditCard, PartyPopper } from "lucide-react";
import { CheckoutSteps } from "@/components/store/CheckoutSteps";
import { OrderTimeline } from "@/components/store/OrderDetails";
import { fa } from "@/lib/format";
import { getOrderByCode } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جزئیات سفارش" };

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const [data, settings] = await Promise.all([getOrderByCode(code), getSettings()]);
  if (!data) notFound();
  const { order } = data;
  const failed = sp.failed === "1" || order.paymentStatus === "failed";
  const needsPayment = order.paymentMethod === "online" && order.paymentStatus !== "paid";
  const justPaid = sp.paid === "1" && order.paymentStatus === "paid";
  const refundReview = sp.refund === "1" && order.status === "cancelled" && order.paymentStatus === "paid";

  return (
    <div className="container-x py-10">
      <div className="mb-8">
        <CheckoutSteps active={needsPayment ? 2 : 4} />
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border bd bg-ink-850 p-6 text-center sm:p-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[100px]" />
        <div className="relative">
          {failed && needsPayment ? (
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-rose-500/15 text-rose-300 ring-8 ring-rose-500/5">
              <CircleAlert className="size-10" />
            </span>
          ) : refundReview ? (
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-amber-500/15 text-amber-300 ring-8 ring-amber-500/5">
              <CircleAlert className="size-10" />
            </span>
          ) : (
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ring-8 ring-emerald-500/5">
              {justPaid ? <PartyPopper className="size-10" /> : <CircleCheck className="size-10" />}
            </span>
          )}
          <h1 className="mt-6 text-2xl font-black sm:text-3xl">
            {refundReview
              ? settings["pages.order.title_refund"]
              : failed && needsPayment
                ? settings["pages.order.title_failed"]
                : needsPayment
                  ? settings["pages.order.title_pending"]
                  : justPaid
                    ? settings["pages.order.title_paid"]
                    : settings["pages.order.title_success"]}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 tdim">
            {refundReview
              ? settings["pages.order.desc_refund"]
              : failed && needsPayment
                ? settings["pages.order.desc_failed"]
                : settings["pages.order.desc_success"]}
          </p>
          <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl border border-dashed border-brand-500/40 bg-brand-500/5 px-8 py-4">
            <span className="text-xs tdim">{settings["pages.order.code_label"]}</span>
            <span dir="ltr" className="mt-1 text-3xl font-black tracking-[0.2em] text-brand-300">
              {fa(order.code)}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {needsPayment && (
              <Link href={`/pay/${order.code}`} className="btn btn-primary px-6 py-3.5">
                <CreditCard className="size-5" /> {failed ? "تلاش مجدد برای پرداخت" : "پرداخت آنلاین"}
              </Link>
            )}
            <Link href={`/track?code=${order.code}`} className="btn btn-ghost px-6 py-3.5">
              پیگیری سفارش
            </Link>
            <Link href="/products" className="btn btn-ghost px-6 py-3.5">
              ادامه خرید
            </Link>
          </div>
        </div>
      </div>

      <div className="surface mt-6 rounded-3xl p-5 sm:p-8">
        <p className="mb-4 text-sm tdim">برای مشاهده جزئیات سفارش، شماره موبایل ثبت‌شده هنگام خرید را در صفحه پیگیری وارد کنید.</p>
        <OrderTimeline status={order.status} />
        {order.trackingNumber && (
          <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4">
            <p className="text-sm font-bold">کد رهگیری مرسوله</p>
            <p dir="ltr" className="mt-2 text-lg font-black tracking-wide">{order.trackingNumber}</p>
            <p className="mt-1 text-xs tdim">این کد توسط فروشگاه ثبت شده است؛ برای مشاهده جزئیات مسیر، آن را در سامانه شرکت حمل وارد کنید.</p>
          </div>
        )}
      </div>
    </div>
  );
}
