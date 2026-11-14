import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_SLIDES } from "@/lib/hero-slides";
import { fa } from "@/lib/format";

export function HeroSlider({ variant }: { variant: "desktop" | "mobile" }) {
  const slides = HERO_SLIDES;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef(0);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5200);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  return (
    <div
      className={"hero-slides" + (variant === "mobile" ? " hero-slides-mobile" : "")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((src, i) => (
        <img
          key={i}
          src={src}
          loading={i === index ? "eager" : "lazy"}
          fetchPriority={i === index ? "high" : "low"}
          decoding="async"
          alt="کفپوش چرمی گلدوزی 50500 در کابین خودرو"
          className={"hero-slide" + (i === index ? " is-active" : "")}
          draggable={false}
        />
      ))}
      <div className="hero-slides-nav">
        {variant !== "mobile" && (
          <button type="button" className="hero-slide-arrow" aria-label="تصویر قبلی" onClick={() => go(index - 1)}>
            <ChevronRight className="size-4" />
          </button>
        )}
        <div className="hero-slide-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`تصویر ${fa(i + 1)}`}
              aria-current={i === index}
              className={"hero-slide-dot" + (i === index ? " on" : "")}
              onClick={() => go(i)}
            />
          ))}
        </div>
        {variant !== "mobile" && (
          <button type="button" className="hero-slide-arrow" aria-label="تصویر بعدی" onClick={() => go(index + 1)}>
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
