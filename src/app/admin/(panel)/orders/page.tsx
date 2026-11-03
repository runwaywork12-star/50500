import { requireAdminPermission } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, MapPin, Phone } from "lucide-react";
import { OrderControls, OrderOperations } from "@/components/admin/AdminClient";
import { OrderBulkActions } from "@/components/admin/OrderBulkActions";
import { getAdminOrders } from "@/lib/admin-queries";
import { cn, fa, faDate } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, SHIPPING_METHODS, TONES, orderStatus } from "@/lib/options";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPermission("orders:read");

  const sp = await searchParams;
  const rawStatus = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = ORDER_STATUSES.some((s) => s.id === rawStatus) ? rawStatus : undefined;
  const rawQuery = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 100) : "";
  const list = await getAdminOrders(status, q);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">سفارش‌ها</h1>
        <p className="mt-1 text-sm text-white/50">مدیریت وضعیت تولید، ارسال، پرداخت، کد رهگیری و یادداشت‌های داخلی · نمایش حداکثر ۲۵۰ سفارش در هر فهرست</p>
      </div>

      <form action="/admin/orders" className="surface grid gap-3 rounded-3xl p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="grid gap-1 text-xs text-white/55">جست‌وجوی سفارش، مشتری، موبایل، شهر یا کد سفارش
          <input className="input" name="q" defaultValue={q} maxLength={100} placeholder="مثلاً 0912… یا نام مشتری یا کد سفارش" />
        </label>
        {status && <input type="hidden" name="status" value={status} />}
        <button className="btn btn-primary px-5 py-3" type="submit">جست‌وجو</button>
        <a className="btn btn-ghost px-5 py-3" href={`/api/admin/order-export?${new URLSearchParams({ ...(status ? {status} : {}), ...(q ? {q} : {}) }).toString()}`}>خروجی Excel / CSV</a>
      </form>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <Link href={`/admin/orders${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={cn("chip shrink-0", !status && "chip-active")}>
          همه
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s.id} href={`/admin/orders?${new URLSearchParams({status:s.id, ...(q ? {q} : {})}).toString()}`} className={cn("chip shrink-0", status === s.id && "chip-active")}>
            {s.name}
          </Link>
        ))}
      </div>

      {list.length > 0 && <OrderBulkActions orders={list.map((o) => ({ id: o.id, code: o.code, status: o.status, paymentStatus: o.paymentStatus }))} />}
      {list.length === 0 && <div className="surface rounded-3xl p-12 text-center text-sm text-white/50">سفارشی یافت نشد.</div>}

      <div className="grid gap-3">
        {list.map((o) => {
          const st = orderStatus(o.status);
          const pay = PAYMENT_STATUSES[o.paymentStatus] ?? PAYMENT_STATUSES.pending;
          return (
            <details key={o.id} className="surface group rounded-3xl">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-6 gap-y-3 p-5">
                <div className="min-w-32">
                  <p className="font-black" dir="ltr">
                    #{fa(o.code)}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">{faDate(o.createdAt, true)}</p>
                </div>
                <div className="min-w-36">
                  <p className="text-sm font-bold">{o.customerName}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {o.province}، {o.city}
                  </p>
                </div>
                <p className="min-w-28 text-sm font-black">{fa(o.total)} تومان</p>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", TONES[st.tone])}>{st.name}</span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", TONES[pay.tone])}>{pay.name}</span>
                <span className="text-xs text-white/40">{fa(o.items.reduce((s, i) => s + i.quantity, 0))} قلم</span>
                <ChevronDown className="ms-auto size-5 text-white/40 transition group-open:rotate-180" />
              </summary>
              <div className="grid gap-5 border-t border-white/5 p-5 lg:grid-cols-[1.3fr_1fr]">
                <div className="grid gap-2">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.02] p-3">
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-ink-700">
                        <Image src={it.image || "/api/site-image/mat"} alt="" fill sizes="48px" className="object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-bold">{it.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {it.options.map((op) => (
                            <span key={op.key} className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                              {op.hex && <span className="size-2 rounded-full" style={{ background: op.hex }} />}
                              {op.label}: {op.value}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-white/60">
                        {fa(it.quantity)} × {fa(it.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid content-start gap-3 text-sm">
                  <p className="flex items-center gap-2 text-white/70">
                    <Phone className="size-4 text-brand-400" /> <span dir="ltr">{o.phone}</span>
                  </p>
                  <p className="flex items-start gap-2 leading-7 text-white/70">
                    <MapPin className="mt-1 size-4 shrink-0 text-brand-400" /> {o.province}، {o.city}، {o.address}
                    {o.postalCode ? ` — کد پستی: ${o.postalCode}` : ""}
                  </p>
                  <p className="text-xs text-white/50">
                    ارسال: {SHIPPING_METHODS.find((m) => m.id === o.shippingMethod)?.name ?? o.shippingMethod} · پرداخت:{" "}
                    {PAYMENT_METHODS.find((m) => m.id === o.paymentMethod)?.name ?? o.paymentMethod}
                    {o.couponCode ? ` · کد تخفیف: ${o.couponCode}` : ""}
                  </p>
                  {o.notes && <p className="rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200">یادداشت مشتری: {o.notes}</p>}
                  {o.trackingNumber && <p className="rounded-xl bg-sky-400/10 p-3 text-xs text-sky-200">کد رهگیری: <span dir="ltr">{o.trackingNumber}</span></p>}
                  <div className="mt-2">
                    <OrderControls id={o.id} status={o.status} paymentStatus={o.paymentStatus} paymentMethod={o.paymentMethod} hasPendingManualTransfer={o.hasPendingManualTransfer} />
                    <OrderOperations id={o.id} trackingNumber={o.trackingNumber ?? ""} adminNote={o.adminNote ?? ""} />
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/order/${o.code}`} target="_blank" className="btn btn-ghost px-3 py-2 text-xs">صفحه سفارش</Link>
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
