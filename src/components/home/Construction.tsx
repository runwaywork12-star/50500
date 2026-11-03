"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/format";

const LAYERS = [
  {
    id: "01",
    name: "رویه چرمی با دوخت ریزبافت",
    short: "رویه چرمی",
    desc: "رویه چرمی با دوخت ریزبافت؛ ظاهر مرتب و پرداخت ظریف کفپوش.",
    color: "#ff6b1a",
  },
  {
    id: "02",
    name: "فوم ۹ میلی‌متری",
    short: "فوم ۹ میل",
    desc: "لایه فومی با ضخامت ۹ میلی‌متر در ساختار کفپوش.",
    color: "#4b3d36",
  },
  {
    id: "03",
    name: "لایه پارچه جودون",
    short: "پارچه جودون",
    desc: "لایه جودون در کنار سایر اجزای ساختار چهارلایه کفپوش قرار می‌گیرد.",
    color: "#343a40",
  },
  {
    id: "04",
    name: "لایه زیرین و پشتیبان",
    short: "لایه زیرین",
    desc: "لایه پایینی مجموعه؛ جنس و جزئیات دقیق آن را می‌توان مطابق مشخصات تولید وارد کرد.",
    color: "#20252b",
  },
] as const;

export function Construction() {
  const [active, setActive] = useState(0);

  return (
    <section className="construction-section relative overflow-hidden">
      {/* faint mat texture as watermark */}
      <div className="construction-texture pointer-events-none absolute inset-0 opacity-[0.07]">
        <Image src="/api/site-image/mat-black-red" alt="" fill unoptimized className="object-cover" />
      </div>
      <div className="construction-overlay pointer-events-none absolute inset-0" />
      
      <div className="container-x relative grid gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
        {/* Left: Exploded visual */}
        <div className="construction-panel relative rounded-[28px] border p-5 backdrop-blur sm:p-7">
          <div className="construction-muted flex items-center justify-between text-[10px] tracking-[0.14em]">
            <span className="font-english text-brand-400">50500 / 4L</span>
            <span>نمای شماتیک ساختار کفپوش</span>
          </div>

          {/* Isometric stack */}
          <div className="construction-stack relative mx-auto mt-6 aspect-[4/3] max-w-[520px]">
            {/* shadow under stack */}
            <div className="construction-shadow absolute bottom-[18%] left-[18%] right-[22%] h-8 bg-black/40 blur-xl" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[14px] sm:gap-[18px]">
              {LAYERS.map((layer, i) => {
                const isActive = i === active;
                // perspective tilt via clip-path diamond
                return (
                  <button
                    key={layer.id}
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "relative w-[58%] max-w-[360px] transition-all duration-300",
                      isActive ? "z-10 scale-[1.04]" : "opacity-90 hover:opacity-100"
                    )}
                    style={{ transform: `translateY(${i * -2}px)` }}
                    aria-label={layer.name}
                  >
                    {/* top face */}
                    <div
                      className="relative flex h-[64px] items-center justify-center sm:h-[74px]"
                      style={{
                        background: layer.color,
                        clipPath: "polygon(18% 0%, 100% 0%, 82% 100%, 0% 100%)",
                        boxShadow: isActive ? `0 8px 24px ${layer.color}55` : "none",
                        borderTop: isActive ? `1px dashed ${i === 0 ? "var(--construction-rule)" : layer.color}` : "none",
                      }}
                    >
                      {i === 0 && (
                        <span className="construction-stitch absolute inset-x-[14%] top-[16%] h-[1px] border-t border-dashed" />
                      )}
                    </div>
                    {/* side thickness */}
                    <div
                      className="h-[14px] sm:h-[16px]"
                      style={{
                        background: `color-mix(in srgb, ${layer.color} 75%, black)`,
                        clipPath: "polygon(0 0, 82% 0, 100% 100%, 18% 100%)",
                        marginTop: "-1px",
                      }}
                    />
                    {/* label on the right of the layer */}
                    <span className="construction-layer-label pointer-events-none absolute -end-[22%] top-1/2 hidden -translate-y-1/2 select-none items-center gap-1.5 text-[11px] font-bold sm:flex">
                      <span className="size-1.5 rounded-full bg-brand-500" />
                      {layer.short}
                      <span className="construction-index font-english">{layer.id}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="construction-stats mt-6 grid grid-cols-2 gap-y-4 border-t pt-4 text-center sm:grid-cols-4">
            <div>
              <div className="text-lg font-black text-brand-400">۴</div>
              <div className="construction-muted text-[10px]">لایه ساختاری</div>
            </div>
            <div>
              <div className="text-lg font-black text-brand-400">۹ <span className="text-xs">میل</span></div>
              <div className="construction-muted text-[10px]">ضخامت فوم</div>
            </div>
            <div>
              <div className="text-lg font-black text-brand-400">چرمی</div>
              <div className="construction-muted text-[10px]">جنس رویه</div>
            </div>
            <div>
              <div className="text-lg font-black text-brand-400">ریز‌بافت</div>
              <div className="construction-muted text-[10px]">نوع دوخت</div>
            </div>
          </div>
        </div>

        {/* Right: Text */}
        <div className="flex flex-col justify-center">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-brand-400">
            CONSTRUCTION
            <span className="h-px w-8 bg-brand-400" />
          </p>
          <h2 className="mt-4 text-3xl font-black leading-[1.35] sm:text-4xl">
            چهار لایه، <span className="text-brand-400">یک ساختار حساب‌شده</span>
          </h2>
          <p className="construction-description mt-4 max-w-xl text-sm leading-8">
            ساختار کفپوش چرمی ۵۰۵۰۰ شامل رویه چرمی با دوخت ریزبافت، فوم ۹ میلی‌متری، پارچه جودون و لایه زیرین است. این بخش نمای کلی لایه‌ها را نشان می‌دهد؛ جزئیات هر محصول در مشخصات همان محصول درج می‌شود.
          </p>

          <div className="construction-layer-list mt-8 divide-y border-y">
            {LAYERS.map((layer, i) => (
              <button
                key={layer.id}
                onClick={() => setActive(i)}
                className={cn(
                  "construction-layer-choice flex w-full items-start gap-4 py-5 text-start transition",
                  i === active ? "is-active" : ""
                )}
              >
                <span
                  className={cn(
                    "mt-1 grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-black",
                    i === active ? "is-active" : ""
                  )}
                >
                  {layer.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("construction-layer-title block text-sm font-black", i === active ? "is-active" : "")}>{layer.name}</span>
                  <span className="construction-muted mt-1.5 block text-xs leading-6">{layer.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
