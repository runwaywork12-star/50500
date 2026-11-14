import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LeatherCanvas } from "./LeatherCanvas";
import { ActiveBadge, LeatherGrain, MAT_PATTERN, ThreadSpool } from "./Swatches";
import { mixHex } from "@/lib/leather";
import { cn } from "@/lib/format";
import { LEATHER_COLORS, THREAD_COLORS } from "@/lib/options";
import { useSiteContent } from "@/lib/site-content";

/**
 * Both choices always on screen: leather samples and thread spools, each in
 * its own one-row slider, so the customer never has to toggle a mode first.
 * The shop owner can hide any colour from the admin content panel.
 */
function SlideRail({
  children,
  label,
  compact = false,
}: {
  children: React.ReactNode;
  label: string;
  compact?: boolean;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<"none" | "start" | "middle" | "end">("none");

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Everything fits on screen: hide both arrows.
    if (max <= 6) {
      setEdge("none");
      return;
    }
    const x = Math.abs(el.scrollLeft);
    setEdge(x < 6 ? "start" : x >= max - 6 ? "end" : "middle");
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
    };
  }, [measure]);

  const slide = (dir: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide-item]");
    const step = (card?.getBoundingClientRect().width ?? 70) + 8;
    el.scrollBy({ left: -dir * step * 3, behavior: "smooth" });
  };

  return (
    <div className="mat-rail-wrap">
      <div ref={rail} className={cn("mat-rail", compact && "mat-rail-compact")} dir="rtl" role="listbox" aria-label={label} data-edge={edge}>
        {children}
      </div>
      <button type="button" className="mat-nav mat-nav-start" onClick={() => slide(-1)} disabled={edge === "start" || edge === "none"} aria-label="قبلی">
        <ChevronRight className="size-4" />
      </button>
      <button type="button" className="mat-nav mat-nav-end" onClick={() => slide(1)} disabled={edge === "end" || edge === "none"} aria-label="بعدی">
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}

export function MatDesigner({
  leather,
  thread,
  onLeather,
  onThread,
}: {
  leather: string;
  thread: string;
  onLeather: (id: string) => void;
  onThread: (id: string) => void;
}) {
  const { content } = useSiteContent();
  const disabled = content.matOptions;

  /* Owner-managed availability falls back to the full set if an admin hides
     everything, so the picker never collapses empty. */
  const leathers = LEATHER_COLORS.filter((c) => !disabled.disabledLeather.includes(c.id));
  const threads = THREAD_COLORS.filter((c) => !disabled.disabledThread.includes(c.id));
  const L = leathers.length ? leathers : LEATHER_COLORS;
  const T = threads.length ? threads : THREAD_COLORS;

  const lIds = L.map((c) => c.id).join(",");
  const tIds = T.map((c) => c.id).join(",");

  /* If the owner hides the currently-selected colour, move to the first
     available one so the preview never shows an unavailable option. */
  useEffect(() => {
    if (!L.some((c) => c.id === leather)) onLeather(L[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lIds, leather]);
  useEffect(() => {
    if (!T.some((c) => c.id === thread)) onThread(T[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tIds, thread]);

  const leatherName = (L.find((c) => c.id === leather) ?? L[0]).name;
  const threadName = (T.find((c) => c.id === thread) ?? T[0]).name;
  const stitch = (T.find((c) => c.id === thread) ?? T[0]).hex;

  return (
    <div className="mat-designer">
      <div className="mat-designer-top">
        <div className="mat-designer-summary">
          <span className="mat-chip">
            <i style={{ background: (L.find((c) => c.id === leather) ?? L[0]).hex }} />
            چرم {leatherName}
          </span>
          <span className="mat-chip">
            <i style={{ background: stitch }} />
            نخ {threadName}
          </span>
        </div>
      </div>

      {/* leather row */}
      <div className="mat-row">
        <span className="mat-row-label">چرم</span>
        <div className="mat-row-rail">
          <SlideRail label="رنگ چرم">
            {L.map((c) => {
              const active = c.id === leather;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-slide-item
                  onClick={() => onLeather(c.id)}
                  aria-label={`چرم ${c.name}`}
                  className="mat-swatch"
                  data-kind="leather"
                  data-on={active}
                >
                  <span className="mat-swatch-face mat-swatch-leather">
                    <LeatherCanvas
                      leather={c.hex}
                      thread={mixHex(stitch, "#000000", 0.14)}
                      pattern={MAT_PATTERN}
                      units={150}
                      cell={30}
                      maxPixels={64_000}
                      className="size-full"
                      label={`نمونه چرم ${c.name}`}
                    />
                    <LeatherGrain />
                    {active && <ActiveBadge />}
                  </span>
                  <span className="mat-swatch-name" data-on={active}>{c.name}</span>
                </button>
              );
            })}
          </SlideRail>
        </div>
      </div>

      {/* thread row */}
      <div className="mat-row">
        <span className="mat-row-label">نخ</span>
        <div className="mat-row-rail">
          <SlideRail label="رنگ نخ گلدوزی" compact>
            {T.map((c) => {
              const active = c.id === thread;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-slide-item
                  onClick={() => onThread(c.id)}
                  aria-label={`نخ گلدوزی ${c.name}`}
                  className="mat-swatch"
                  data-kind="thread"
                  data-on={active}
                >
                  <span className="mat-swatch-face mat-swatch-thread">
                    <ThreadSpool color={c.hex} className="h-[92%] w-auto drop-shadow-[0_4px_6px_rgba(0,0,0,.55)]" />
                    {active && <ActiveBadge />}
                  </span>
                  <span className="mat-swatch-name" data-on={active}>{c.name}</span>
                </button>
              );
            })}
          </SlideRail>
        </div>
      </div>

      <p className="mat-designer-hint">ترکیب انتخابی همین‌جا روی پیش‌نمایش اعمال می‌شود.</p>
    </div>
  );
}
