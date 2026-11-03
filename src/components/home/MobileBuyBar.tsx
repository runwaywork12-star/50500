"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { discountPercent, fa } from "@/lib/format";

/**
 * Sticky purchase bar for small screens. It appears only when the main
 * "add to cart" block (#buy-cta) is out of view.
 */
export function MobileBuyBar({
  price,
  comparePrice,
  inStock,
  onAdd,
  variant,
}: {
  price: number;
  comparePrice: number | null;
  inStock: boolean;
  onAdd: () => void;
  variant: "dark" | "light";
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById("buy-cta");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const dark = variant === "dark";
  const off = discountPercent(price, comparePrice);
  return (
    <div
      className={`fixed inset-x-0 z-40 transition-transform duration-300 lg:hidden ${dark ? "bottom-[60px]" : "bottom-0"} ${show ? "translate-y-0" : "translate-y-[140%]"}`}
      aria-hidden={!show}
    >
      <div
        className={`mx-3 mb-3 flex items-center gap-3 rounded-2xl p-3 shadow-2xl ${
          dark ? "border bd scrim-95 backdrop-blur-xl" : "border border-[#e5e7eb] bg-photo"
        }`}
      >
        <div className="min-w-0 flex-1">
          {off > 0 && comparePrice && <p className={`text-[11px] line-through ${dark ? "tdim" : "text-zinc-400"}`}>{fa(comparePrice)}</p>}
          <p className={`truncate text-base font-black ${dark ? "text-white" : "text-zinc-900"}`}>
            {fa(price)} <span className={`text-[11px] font-medium ${dark ? "tdim" : "text-zinc-500"}`}>تومان</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!inStock}
          tabIndex={show ? 0 : -1}
          className={
            dark
              ? "btn btn-primary shrink-0 px-5 py-3 text-sm"
              : "btn btn-primary shrink-0 px-5 py-3 text-sm disabled:opacity-50"
          }
        >
          <ShoppingBag className="size-4" /> افزودن به سبد
        </button>
      </div>
    </div>
  );
}
