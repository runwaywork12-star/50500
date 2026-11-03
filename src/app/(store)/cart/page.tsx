import type { Metadata } from "next";
import { CartView } from "@/components/store/CartView";
import { CheckoutSteps } from "@/components/store/CheckoutSteps";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "سبد خرید" };

export default async function CartPage() {
  const settings = await getSettings();
  return (
    <div className="container-x py-10">
      <div className="mb-8 grid gap-6">
        <div><h1 className="text-3xl font-black">{settings["pages.cart.title"]}</h1><p className="mt-2 text-sm tdim">{settings["pages.cart.description"]}</p></div>
        <CheckoutSteps active={0} />
      </div>
      <CartView />
    </div>
  );
}
