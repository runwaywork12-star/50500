import { requireAdminPermission } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft, Banknote, ImageIcon, ClipboardList, Clock, Inbox, MessageSquare, Package, TrendingUp, BarChart3, Sparkles, Plug, Settings, CreditCard } from "lucide-react";
import { getAdminStats } from "@/lib/admin-queries";
import { MAT_SLOTS } from "@/lib/mat-photos";
import { getSiteImageUploadId } from "@/lib/uploads";
import { cn, fa, faDate } from "@/lib/format";
import { PAYMENT_STATUSES, TONES, orderStatus } from "@/lib/options";

export default async function AdminDashboard() {
  await requireAdminPermission("dashboard:read");

  const s = await getAdminStats();
  const uploadedPhotos = (await Promise.all(MAT_SLOTS.map((m) => getSiteImageUploadId(`mat-${m.key}`)))).filter(Boolean).length;
  const max = Math.max(1, ...s.days.map((d) => d.total));
  const kpis = [
    { label: "درآمد قطعی", value: `${fa(s.revenue)}`, unit: "تومان", icon: Banknote, tone: "from-emerald-500/20 text-emerald-300" },
    { label: "سود ناخالص تخمینی", value: `${fa(s.estimatedGrossProfit)}`, unit: "تومان · با بهای تمام‌شده فعلی کالا", icon: TrendingUp, tone: "from-violet-500/20 text-violet-300" },
    { label: "کل سفارش‌ها", value: fa(s.orderCount), unit: `${fa(s.todayCount)} سفارش در ۲۴ ساعت اخیر`, icon: ClipboardList, tone: "from-sky-500/20 text-sky-300" },
    { label: "در انتظار تایید", value: fa(s.pendingCount), unit: "سفارش نیازمند بررسی", icon: Clock, tone: "from-amber-500/20 text-amber-300" },
    { label: "محصولات فعال", value: fa(s.productCount), unit: "محصول در فروشگاه", icon: Package, tone: "from-brand-500/20 text-brand-300" },
  ];

  return (
    <div className="grid gap-6">
      {uploadedPhotos < MAT_SLOTS.length && (
        <Link href="/admin/images" className="flex flex-wrap items-center gap-4 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 transition hover:bg-amber-400/15">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-400/20 text-amber-300">
            <ImageIcon className="size-6" />
          </span>
          <span className="flex-1">
            <b className="block">عکس‌های واقعی کفپوش را آپلود کنید ({fa(uploadedPhotos)} از {fa(MAT_SLOTS.length)})</b>
            <span className="text-sm text-white/60">هر ۴ عکس را یک‌جا بیندازید تا در کل سایت جایگزین عکس‌های نمونه شوند.</span>
          </span>
          <ArrowLeft className="size-5 text-amber-300" />
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-black">داشبورد</h1>
        <p className="mt-1 text-sm text-white/50">نمای کلی عملکرد فروشگاه</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className={cn("surface relative overflow-hidden rounded-3xl bg-linear-to-br to-transparent p-5", k.tone.split(" ")[0])}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">{k.label}</p>
              <k.icon className={cn("size-6", k.tone.split(" ")[1])} />
            </div>
            <p className="mt-4 text-2xl font-black">{k.value}</p>
            <p className="mt-1 text-xs text-white/45">{k.unit}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { href: "/admin/analytics", label: "تحلیل بازدیدکننده‌ها", desc: "منابع ورود، کمپین و صفحات", icon: BarChart3 },
          { href: "/admin/content", label: "استودیوی هوش مصنوعی", desc: "کلمات کلیدی و محتوا", icon: Sparkles },
          { href: "/admin/integrations", label: "ایجنت‌ها و API", desc: "اتصال ChatGPT و Claude", icon: Plug },
          { href: "/admin/payments", label: "درگاه‌های پرداخت", desc: "زرین‌پال، زیبال و دستی", icon: CreditCard },
          { href: "/admin/settings", label: "تنظیمات سایت", desc: "محتوا، تماس و سئو", icon: Settings },
        ].map((item) => <Link key={item.href} href={item.href} className="surface flex items-center gap-3 rounded-2xl p-4 transition hover:border-brand-400/30"><item.icon className="size-5 shrink-0 text-brand-300"/><span><b className="block text-sm">{item.label}</b><span className="mt-1 block text-xs text-white/40">{item.desc}</span></span></Link>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="surface rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-black">فروش ۷ روز اخیر</h2>
            <span className="text-xs text-white/45">مبالغ به تومان</span>
          </div>
          <div className="mt-8 flex h-60 gap-3">
            {s.days.map((d) => (
              <div key={d.key} className="group flex h-full flex-1 flex-col items-center gap-2">
                <span className="text-[10px] text-white/45 transition group-hover:text-white">
                  {d.total ? `${fa(Math.round(d.total / 100000) / 10)} م` : "۰"}
                </span>
                <div className="relative w-full flex-1 overflow-hidden rounded-t-xl bg-white/[0.03]">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-xl bg-linear-to-t from-brand-600 to-brand-300 shadow-[0_0_24px_-6px_rgba(255,107,26,0.6)] transition-all duration-700 group-hover:from-brand-500"
                    style={{ height: `${Math.max(3, (d.total / max) * 100)}%`, opacity: d.total ? 1 : 0.25 }}
                  />
                </div>
                <span className="text-[11px] text-white/50">{d.label}</span>
                <span className="text-[10px] text-white/30">{fa(d.count)} سفارش</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <Link href="/admin/reviews" className="surface flex items-center gap-4 rounded-3xl p-5 transition hover:border-brand-500/30">
            <span className="grid size-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
              <MessageSquare className="size-6" />
            </span>
            <div className="flex-1">
              <p className="font-black">{fa(s.pendingReviews)} نظر در انتظار تایید</p>
              <p className="text-xs text-white/45">بررسی و انتشار نظرات مشتریان</p>
            </div>
            <ArrowLeft className="size-5 text-white/30" />
          </Link>
          <Link href="/admin/messages" className="surface flex items-center gap-4 rounded-3xl p-5 transition hover:border-brand-500/30">
            <span className="grid size-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-300">
              <Inbox className="size-6" />
            </span>
            <div className="flex-1">
              <p className="font-black">{fa(s.unreadMessages)} پیام خوانده‌نشده</p>
              <p className="text-xs text-white/45">پیام‌های فرم تماس با ما</p>
            </div>
            <ArrowLeft className="size-5 text-white/30" />
          </Link>
          <Link href="/admin/products" className="surface flex items-center gap-4 rounded-3xl p-5 transition hover:border-brand-500/30">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
              <Package className="size-6" />
            </span>
            <div className="flex-1">
              <p className="font-black">مدیریت محصولات</p>
              <p className="text-xs text-white/45">قیمت، موجودی، تخفیف و محصولات ویژه</p>
            </div>
            <ArrowLeft className="size-5 text-white/30" />
          </Link>
        </div>
      </div>

      <div className="surface overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between p-6">
          <h2 className="font-black">آخرین سفارش‌ها</h2>
          <Link href="/admin/orders" className="text-sm text-brand-300 hover:underline">
            همه سفارش‌ها
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-white/[0.03] text-xs text-white/45">
              <tr>
                <th className="px-6 py-3 text-start font-medium">کد</th>
                <th className="px-3 py-3 text-start font-medium">مشتری</th>
                <th className="px-3 py-3 text-start font-medium">مبلغ</th>
                <th className="px-3 py-3 text-start font-medium">پرداخت</th>
                <th className="px-3 py-3 text-start font-medium">وضعیت</th>
                <th className="px-6 py-3 text-start font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {s.recent.map((o) => {
                const st = orderStatus(o.status);
                const pay = PAYMENT_STATUSES[o.paymentStatus] ?? PAYMENT_STATUSES.pending;
                return (
                  <tr key={o.id} className="border-t border-white/5">
                    <td className="px-6 py-3 font-bold" dir="ltr">
                      #{fa(o.code)}
                    </td>
                    <td className="px-3 py-3">
                      {o.customerName}
                      <span className="block text-xs text-white/40">{o.city}</span>
                    </td>
                    <td className="px-3 py-3 font-bold">{fa(o.total)}</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[pay.tone])}>{pay.name}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[st.tone])}>{st.name}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-white/50">{faDate(o.createdAt, true)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
