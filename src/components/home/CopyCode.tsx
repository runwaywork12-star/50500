import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Coupon code with one-click copy. */
export function CopyCode({ code, variant }: { code: string; variant?: "dark" | "light" }) {
  const [copied, setCopied] = useState(false);
  const dark = variant !== "light";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="کپی کد تخفیف"
      className={`group flex items-center gap-3 rounded-2xl border-2 border-dashed px-5 py-3 transition ${
        dark ? "border-brand-400/60 soft soft-h" : "border-brand-500/45 soft soft-h"
      }`}
    >
      <span dir="ltr" className={`text-2xl font-black tracking-[0.2em] ${dark ? "text-brand-300" : "text-brand-600"}`}>
        {code}
      </span>
      <span className={`flex items-center gap-1.5 text-xs font-bold ${copied ? (dark ? "text-emerald-300" : "text-emerald-700") : "tdim group-hover:text-[var(--txt)]"}`}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "کپی شد" : "کپی"}
      </span>
    </button>
  );
}
