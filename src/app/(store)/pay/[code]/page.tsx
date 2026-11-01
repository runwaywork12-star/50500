import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckoutSteps } from "@/components/store/CheckoutSteps";
import { PayGateway } from "@/components/store/PayGateway";
import { getOrderByCode } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پرداخت اینترنتی" };

export default async function PayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [data, settings] = await Promise.all([getOrderByCode(code), getSettings()]);
  if (!data) notFound();
  const { order } = data;
  if (order.paymentMethod !== "online" || order.paymentStatus === "paid") redirect(`/order/${order.code}`);

  return (
    <div className="container-x py-10">
      <div className="mb-8">
        <CheckoutSteps active={2} />
      </div>
      <header className="mb-6"><h1 className="text-2xl font-black">{settings["pages.pay.title"]}</h1><p className="mt-2 text-sm leading-7 tdim">{settings["pages.pay.description"]}</p></header>
      <PayGateway code={order.code} total={order.total} name={order.customerName} />
    </div>
  );
}
