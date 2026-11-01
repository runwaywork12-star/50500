"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Small global behaviours for the dark storefront:
 *  - reading-progress bar at the very top
 *  - cursor-following light on every `.spot` card (one listener for the whole page)
 *  - back-to-top button on desktop
 */
export function ScrollUi() {
  const bar = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      setShowTop(window.scrollY > 900);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as HTMLElement | null)?.closest?.(".spot") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" aria-hidden="true">
        <div ref={bar} className="h-full origin-right scale-x-0 bg-linear-to-l from-brand-300 via-brand-500 to-rose-500 shadow-[0_0_12px_rgba(255,107,26,0.7)]" />
      </div>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="بازگشت به بالای صفحه"
        className={`fixed bottom-6 right-4 z-40 hidden size-12 place-items-center rounded-full border bd bg-ink-900/80 text-[#fff] shadow-xl backdrop-blur transition-all duration-300 hover:border-brand-500 hover:bg-brand-500 lg:grid ${showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
      >
        <ArrowUp className="size-5" />
      </button>
    </>
  );
}
