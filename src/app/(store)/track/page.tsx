import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { PackageSearch, Search, SearchX } from "lucide-react";
import { OrderSummary, OrderTimeline } from "@/components/store/OrderDetails";
import { PageHero } from "@/components/ui";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { orders } from "@/db/schema";
import { fa, normalizePhone, toEnDigits } from "@/lib/format";
import { getOrderByCode } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پیگیری سفارش" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TrackPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, settings] = await Promise.all([searchParams, getSettings()]);
  const code = toEnDigits(one(sp.code)).replace(/\D/g, "").slice(0, 12);
  const phone = normalizePhone(one(sp.phone));
  const searched = Boolean(code && phone);

  let data: Awaited<ReturnType<typeof getOrderByCode>> = null;
  if (searched) {
    await ensureDb();
    const [match] = await db
      .select({ code: orders.code })
      .from(orders)
      .where(and(eq(orders.code, code), eq(orders.phone, phone)))
      .limit(1);
    if (match) data = await getOrderByCode(match.code);
  }

  return (
    <>
      <PageHero eyebrow={settings["pages.track.eyebrow"]} title={settings["pages.track.title"]} desc={settings["pages.track.description"]} />
      <div className="container-x py-10">
        <form method="GET" className="surface mx-auto grid max-w-3xl gap-3 rounded-3xl p-5 sm:grid-cols-[1fr_1fr_auto] sm:p-6">
          <input name="code" defaultValue={code} className="input text-left" dir="ltr" inputMode="numeric" placeholder={settings["pages.track.code_placeholder"]} required />
          <input name="phone" defaultValue={one(sp.phone)} className="input text-left" dir="ltr" inputMode="tel" placeholder={settings["pages.track.phone_placeholder"]} required />
          <button type="submit" className="btn btn-primary px-6 py-3.5">
            <Search className="size-5" /> {settings["pages.track.submit"]}
          </button>
        </form>

        {!searched && (
          <div className="mx-auto mt-10 grid max-w-3xl place-items-center gap-3 text-center text-sm tdim">
            <PackageSearch className="size-12 tfaint" />
            {settings["pages.track.empty"]}
          </div>
        )}

        {searched && !data && (
          <div className="mx-auto mt-10 grid max-w-3xl place-items-center gap-3 rounded-3xl border border-rose-500/20 bg-rose-500/5 p-10 text-center">
            <SearchX className="size-12 text-rose-300" />
            <p className="font-black">{settings["pages.track.not_found"]}</p>
            <p className="text-sm tdim">{settings["pages.track.not_found_desc"]}</p>
          </div>
        )}

        {data && (
          <div className="mt-10 grid gap-6">
            <div className="surface rounded-3xl p-5 sm:p-8">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <p className="text-lg font-black">
                  سفارش <span dir="ltr">#{fa(data.order.code)}</span>
                </p>
                <p className="text-sm tdim">ثبت‌شده به نام {data.order.customerName}</p>
              </div>
              <OrderTimeline status={data.order.status} />
            </div>
            <OrderSummary data={data} />
          </div>
        )}
      </div>
    </>
  );
}
