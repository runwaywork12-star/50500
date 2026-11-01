"use client";

import { ThemeLink as Link } from "@/components/ThemeLink";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import type { ProductCardData } from "@/lib/queries";

export type ProductTab = { id: string; label: string; href: string; items: ProductCardData[] };

/** One tabbed product section instead of three separate, repetitive lists. */
export function ProductTabs({ tabs, variant }: { tabs: ProductTab[]; variant: "dark" | "light" }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!tab) return null;
  const dark = variant === "dark";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          className={
            dark
              ? "inline-flex gap-1 rounded-2xl border bd soft p-1"
              : "inline-flex gap-1 rounded-2xl border bd soft p-1 shadow-sm"
          }
        >
          {tabs.map((t) => {
            const on = t.id === tab.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => setActive(t.id)}
                className={
                  dark
                    ? `rounded-xl px-4 py-2.5 text-sm font-bold transition ${on ? "bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/30" : "tdim hover:text-[#fff]"}`
                    : `rounded-xl px-4 py-2.5 text-sm font-bold transition ${on ? "bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/25" : "tdim hover:text-[var(--txt)] hover:bg-[var(--field-hover)]"}`
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <Link
          href={tab.href}
          className={
            dark
              ? "flex items-center gap-1.5 text-sm font-bold tdim transition hover:text-brand-300"
              : "flex items-center gap-1.5 text-sm font-bold tdim transition hover:text-brand-600"
          }
        >
          مشاهده همه <ArrowLeft className="size-4" />
        </Link>
      </div>
      <div key={tab.id} className="grid animate-fade-up grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {tab.items.slice(0, 8).map((p, i) => (
          <div key={p.id} className={i >= 4 ? "h-full max-sm:hidden" : "h-full"}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
