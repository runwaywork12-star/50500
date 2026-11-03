"use client";

import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Star, Truck } from "lucide-react";
import { MAT_SLOTS, showcaseUrl } from "@/lib/mat-photos";
import { leatherById, threadById } from "@/lib/options";
import { cn, fa } from "@/lib/format";

export type HeroSlide = {
  id: string;
  label: string;
  image: string;
  /** "contain": whole product shot on white · "cover": photo fills the frame */
  fit?: "contain" | "cover";
  eyebrow: string;
  title: string;
  highlight: string;
  titleEnd?: string;
  desc: string;
  caption: string;
  sub?: string;
  cta: { href: string; label: string };
  cta2?: { href: string; label: string };
};

const DURATION = 7000;

export function HeroSlider({ slides, modelCount }: { slides: HeroSlide[]; modelCount: number }) {
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (i: number) => {
      setPicked(null);
      setIndex(((i % count) + count) % count);
    },
    [count],
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  const slide = slides[index] ?? slides[0];
  const paused = hover || picked !== null;

  // every picture that can appear in the frame (cross-faded, never unmounted → no layout jump)
  const frames = useMemo(() => {
    const map = new Map<string, "contain" | "cover">();
    for (const s of slides) map.set(s.image, s.fit ?? "cover");
    for (const m of MAT_SLOTS) map.set(showcaseUrl(m.key), "contain");
    return [...map.entries()].map(([src, fit]) => ({ src, fit }));
  }, [slides]);

  if (!slide) return null;
  const activeSrc = picked ?? slide.image;
  const activeFit = frames.find((f) => f.src === activeSrc)?.fit ?? "cover";
  const showSwatches = (slide.fit ?? "cover") === "contain";

  const progress = (i: number): CSSProperties =>
    i === index
      ? { animation: `slide-progress ${DURATION}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }
      : { transform: `scaleX(${i < index ? 1 : 0})` };


  return (
    <>
    <section
      className="relative isolate overflow-hidden bg-ink-950 [background:radial-gradient(ellipse_at_18%_82%,rgba(255,94,18,0.14),transparent_34%),linear-gradient(115deg,#050608_0%,#080a0e_52%,#100b0a_100%)]"
      aria-roledescription="carousel"
      aria-label="معرفی فروشگاه ۵۰۵۰۰"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(dx) > 50) (dx > 0 ? next : prev)();
      }}
    >
      <div className="aurora -z-10" />
      <div className="stitch-bg pointer-events-none absolute inset-0 -z-10" />


      <div className="container-x relative z-10 grid items-center gap-7 pb-8 pt-8 pointer-events-none sm:gap-10 sm:pt-10 lg:min-h-[570px] lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-10 xl:min-h-[610px]">
        {/* copy */}
        <div key={slide.id} aria-live="polite" className="pointer-events-auto relative z-10 lg:col-start-1 lg:max-w-[38rem] lg:pe-5 xl:pe-8">
          <div className="flex animate-fade-up flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border bd soft py-1.5 pe-4 ps-1.5 text-xs font-semibold tdim backdrop-blur">
              <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-black text-[#fff]">{fa(String(index + 1).padStart(2, "0"))}</span>
              {slide.eyebrow}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-200">
              <Sparkles className="size-3.5" /> {fa(modelCount)} مدل خودرو
            </span>
          </div>
          <h1 className="mt-5 max-w-[13.5em] animate-fade-up text-balance text-[2rem] font-black leading-[1.38] tracking-tight [animation-delay:80ms] sm:mt-6 sm:text-[2.45rem] sm:leading-[1.35] lg:text-[2.9rem] xl:text-[3.25rem] xl:leading-[1.3]">
            <span className="block">{slide.title}</span>
            <span className="mt-1 block">
              <span className="text-gradient">{slide.highlight}</span>{slide.titleEnd ? ` ${slide.titleEnd}` : ""}
            </span>
          </h1>
          <p className="mt-5 max-w-[34rem] animate-fade-up text-[0.94rem] leading-[2] tdim [animation-delay:160ms] sm:text-base lg:text-[1.02rem]">{slide.desc}</p>
          <div className="mt-7 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms] sm:mt-8">
            <Link href={slide.cta.href} className="btn btn-primary shine flex-1 px-8 py-4 text-base sm:flex-none">
              {slide.cta.label} <ArrowLeft className="size-5" />
            </Link>
            {slide.cta2 && (
              <Link href={slide.cta2.href} className="btn btn-ghost flex-1 px-7 py-4 text-base backdrop-blur sm:flex-none">
                {slide.cta2.label}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero media blends into the page instead of reading as a separate framed card. */}
      <div
        className={cn(
          "relative z-0 overflow-hidden transition-colors duration-700",
          // Mobile keeps media in flow under the copy; desktop lets it bleed to the left viewport edge.
          "-mx-5 h-[clamp(17rem,42vh,23rem)] w-auto overflow-hidden sm:-mx-6 sm:h-[clamp(20rem,48vh,28rem)] lg:absolute lg:inset-y-0 lg:left-0 lg:mx-0 lg:h-auto lg:w-[57vw]",
          "bg-transparent",
        )}
      >
        {frames.map((f, i) => (
          <Image
            key={f.src}
            src={f.src}
            alt=""
            fill
            priority={i === 0}
            sizes="(max-width: 1024px) 100vw, 52vw"
            className={cn(
              "transition-all duration-[900ms] ease-out motion-reduce:transition-none",
              f.fit === "contain" ? "object-contain px-1 py-3 drop-shadow-[0_30px_45px_rgba(0,0,0,0.45)] sm:px-4 sm:py-5 lg:px-0 lg:py-3" : "object-cover object-center",
              f.src === activeSrc ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
            )}
            aria-hidden="true"
          />
        ))}
        {/* Broad feathered fades merge photo, texture and copy into one composition. */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#050608_0%,transparent_30%),linear-gradient(to_left,#050608_0%,rgba(5,6,8,0.82)_12%,rgba(5,6,8,0.2)_42%,transparent_72%)] lg:bg-[linear-gradient(to_top,#050608_0%,transparent_23%),linear-gradient(to_right,rgba(5,6,8,0.05)_0%,transparent_60%),linear-gradient(to_left,#050608_0%,rgba(5,6,8,0.88)_10%,rgba(5,6,8,0.45)_34%,transparent_72%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(ellipse_at_20%_60%,rgba(255,99,21,0.22),transparent_52%)]" />

        <div className="absolute start-5 top-5 flex items-center gap-2.5 rounded-full border border-white/10 bg-black/55 px-4 py-2.5 text-[#fff] shadow-lg backdrop-blur-md sm:start-7 sm:top-7 lg:start-8 lg:top-8">
          <ShieldCheck className="size-5 text-emerald-300" />
          <span className="text-sm font-black">۱۲ ماه گارانتی</span>
        </div>

        {/* live colour picker, sitting on the photo */}
        <div className={cn("absolute inset-x-0 bottom-28 flex flex-wrap items-center justify-center gap-3 px-5 transition-opacity duration-500 sm:bottom-28 lg:bottom-28", showSwatches ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!showSwatches}>
          <span className="rounded-full scrim px-3 py-1.5 text-xs font-bold text-[rgba(255,255,255,0.85)] backdrop-blur">رنگ‌ها:</span>
          {MAT_SLOTS.map((m) => {
            const on = (picked ?? slide.image) === showcaseUrl(m.key);
            return (
              <button
                key={m.key}
                type="button"
                tabIndex={showSwatches ? 0 : -1}
                onClick={() => setPicked(showcaseUrl(m.key))}
                aria-label={m.label}
                aria-pressed={on}
                title={m.label}
                className={cn("grid size-11 place-items-center rounded-full shadow-lg transition duration-200 hover:scale-110", on ? "ring-2 ring-[#fff] ring-offset-2 ring-offset-black/40" : "ring-1 ring-[rgba(255,255,255,0.25)]")}
                style={{ background: leatherById(m.leather).hex }}
              >
                <span className="size-3.5 rounded-full shadow ring-1 ring-black/30" style={{ background: threadById(m.thread).hex }} />
              </button>
            );
          })}
        </div>

      </div>

      {/* Slider controls share the hero's background, so they feel attached to it rather than like a separate section. */}
      <div className="relative z-20 mt-4 bg-transparent lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0">
        <div className="container-x grid grid-cols-[1fr_auto] items-center gap-4 py-3 sm:py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-3">
            <div className="pointer-events-auto flex items-center gap-3">
              <span className="flex -space-x-2.5 space-x-reverse">
                {MAT_SLOTS.map((m) => (
                  <span key={m.key} className="size-8 rounded-full ring-[3px] ring-[var(--panel)]" style={{ background: leatherById(m.leather).hex, boxShadow: `inset 0 0 0 2px ${threadById(m.thread).hex}` }} />
                ))}
              </span>
              <span className="text-xs leading-6">
                <span className="flex items-center gap-1 font-black">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" /> ۴٫۹
                  <span className="font-medium tdim">از ۵</span>
                </span>
                <span className="block tdim">رضایت بیش از ۵۲ هزار خریدار</span>
              </span>
            </div>
            <div className="hidden items-center gap-3 border-s border-white/10 ps-6 sm:flex">
              <span dir="ltr" className="font-english text-2xl font-black tracking-[0.12em] text-brand-400">50500</span>
              <span className="text-xs leading-5 tdim">تولید اختصاصی<br />کفپوش چرمی گلدوزی</span>
            </div>
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center gap-3 sm:gap-5">
            <div className="hidden gap-3 md:flex">
              {slides.map((s2, i) => (
                <button key={s2.id} type="button" onClick={() => go(i)} className="group w-28 text-start lg:w-36" aria-label={`اسلاید ${fa(i + 1)}: ${s2.label}`}>
                  <span className="relative block h-[3px] overflow-hidden rounded-full soft">
                    <span key={i === index ? `on-${index}-${paused}` : `off-${i}`} className="absolute inset-0 origin-right rounded-full bg-brand-500" style={progress(i)} />
                  </span>
                  <span className={cn("mt-2 flex items-center gap-1 text-xs font-bold transition", i === index ? "text-white" : "tdim group-hover:text-[var(--txt)]")}>
                    <span className="font-english text-brand-400">{fa(String(i + 1).padStart(2, "0"), "en")}</span>
                    <span className="truncate">{s2.label}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 md:hidden">
              {slides.map((s2, i) => (
                <button key={s2.id} type="button" onClick={() => go(i)} className={cn("relative h-2 overflow-hidden rounded-full soft transition-all", i === index ? "w-10" : "w-4")} aria-label={`اسلاید ${fa(i + 1)}`}>
                  <span key={i === index ? `m-on-${index}` : `m-off-${i}`} className="absolute inset-0 origin-right rounded-full bg-brand-500" style={progress(i)} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={prev} className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.035] tdim transition hover:border-brand-500 hover:bg-brand-500 hover:text-white" aria-label="اسلاید قبلی">
                <ChevronRight className="size-5" />
              </button>
              <button type="button" onClick={next} className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.035] tdim transition hover:border-brand-500 hover:bg-brand-500 hover:text-white" aria-label="اسلاید بعدی">
                <ChevronLeft className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      </section>

      {/* hidden timer that drives autoplay */}
      <span
        key={`timer-${index}`}
        className="pointer-events-none absolute size-px opacity-0"
        style={{ animation: `slide-progress ${DURATION}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
        onAnimationEnd={next}
        aria-hidden="true"
      />
 
    </>
  );
}
