import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { CheckoutSteps } from "@/components/store/CheckoutSteps";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "تسویه حساب" };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <div className="container-x py-10">
      <div className="mb-8 grid gap-6">
        <div><h1 className="text-3xl font-black">{settings["pages.checkout.title"]}</h1><p className="mt-2 text-sm tdim">{settings["pages.checkout.description"]}</p></div>
        <CheckoutSteps active={1} />
      </div>
      <CheckoutForm />
    </div>
  );
}
