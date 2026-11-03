import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

export function Carousel({ children, itemClassName = "w-[72%] sm:w-[44%] md:w-[31%] lg:w-[23.5%]" }: { children: ReactNode; itemClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 sm:mx-0 sm:px-0">
        {Children.map(children, (child) => (
          <div className={`shrink-0 snap-start ${itemClassName}`}>{child}</div>
        ))}
      </div>
      <button
        onClick={() => scroll(1)}
        className="absolute -right-4 top-[40%] hidden size-11 place-items-center rounded-full border-0 scrim text-[#fff] shadow-xl backdrop-blur transition hover:bg-brand-500 md:grid"
        aria-label="قبلی"
      >
        <ChevronRight className="size-5" />
      </button>
      <button
        onClick={() => scroll(-1)}
        className="absolute -left-4 top-[40%] hidden size-11 place-items-center rounded-full border-0 scrim text-[#fff] shadow-xl backdrop-blur transition hover:bg-brand-500 md:grid"
        aria-label="بعدی"
      >
        <ChevronLeft className="size-5" />
      </button>
    </div>
  );
}
