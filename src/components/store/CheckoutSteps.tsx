import { Check } from "lucide-react";
import { cn, fa } from "@/lib/format";

const STEPS = ["سبد خرید", "اطلاعات ارسال", "پرداخت", "تکمیل سفارش"];

export function CheckoutSteps({ active }: { active: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2 sm:gap-3">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full text-xs font-black transition",
              i < active ? "bg-emerald-500 text-[#fff]" : i === active ? "bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/40" : "soft tdim",
            )}
          >
            {i < active ? <Check className="size-4" /> : fa(i + 1)}
          </span>
          <span className={cn("hidden text-xs font-bold sm:inline", i <= active ? "text-white" : "tdim")}>{s}</span>
          {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < active ? "bg-emerald-500/60" : "soft")} />}
        </li>
      ))}
    </ol>
  );
}
