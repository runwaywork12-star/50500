import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product } from "@/lib/catalog";
import { fa } from "@/lib/format";
import styles from "./ProductTabs.module.css";

export type ProductTab = { id: string; label: string; href: string; items: Product[] };

type ProductHeading = { id: string; eyebrow: string; title: string; description: string };

function brandText(text: string) {
  return text.split(/(50500)/g).map((part, index) =>
    part === "50500" ? (
      <bdi key={index} className={styles.brand} dir="ltr">
        50500
      </bdi>
    ) : (
      part
    ),
  );
}

function ProductRail({ items, href }: { items: Product[]; href: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stepWidth = () => {
    const rail = railRef.current;
    if (!rail) return 0;
    const card = rail.querySelector("[data-pr-card]");
    return card ? card.getBoundingClientRect().width + 16 : 0;
  };

  const scrollByCards = (dir: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const step = stepWidth();
    const max = rail.scrollWidth - rail.clientWidth;
    const target = Math.max(0, Math.min(max, rail.scrollLeft + dir * step));
    rail.scrollTo({ left: target, behavior: "smooth" });
  };

  const scrollToCard = (idx: number) => {
    const rail = railRef.current;
    if (rail) rail.scrollTo({ left: stepWidth() * idx, behavior: "smooth" });
  };

  const onScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const step = stepWidth() || 1;
    const idx = Math.round(rail.scrollLeft / step);
    setActiveIndex(Math.max(0, Math.min(count - 1, idx)));
    const max = rail.scrollWidth - rail.clientWidth;
    setProgress(max > 0 ? rail.scrollLeft / max : 0);
  };

  useEffect(() => {
    onScroll();
  }, [count]);

  useEffect(() => {
    if (!visible || paused || dragging || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const rail = railRef.current;
      if (!rail) return;
      const step = stepWidth();
      const max = rail.scrollWidth - rail.clientWidth;
      if (rail.scrollLeft >= max - 8) {
        rail.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      rail.scrollBy({ left: step, behavior: "smooth" });
    }, 4200);
    return () => clearInterval(id);
  }, [visible, paused, dragging, count]);

  return (
    <div
      ref={wrapRef}
      className="pr-wrap"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="pr-head">
        <div className="pr-count" aria-live="polite">
          <b>{fa(activeIndex + 1)}</b>
          <span>/</span>
          <span>{fa(count)}</span>
        </div>
        <div className="pr-arrows">
          <button type="button" className="pr-arrow" onClick={() => scrollByCards(-1)} aria-label="محصول قبلی">
            <ChevronRight className="size-4" />
          </button>
          <button type="button" className="pr-arrow" onClick={() => scrollByCards(1)} aria-label="محصول بعدی">
            <ArrowLeft className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        dir="ltr"
        className="pr-rail"
        onScroll={onScroll}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {items.map((p) => (
          <div key={p.id} dir="rtl" data-pr-card="true" className="pr-card">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      <div className="pr-progress" aria-hidden="true">
        <span style={{ width: `${Math.max(8, progress * 100)}%` }} />
      </div>

      <div className="pr-dots">
        {items.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            className={"pr-dot" + (idx === activeIndex ? " on" : "")}
            aria-label={`رفتن به محصول ${fa(idx + 1)}`}
            aria-current={idx === activeIndex}
            onClick={() => scrollToCard(idx)}
          />
        ))}
      </div>

      <Link href={href} className="pr-all">
        مشاهده همه محصولات
        <ArrowLeft className="size-4" />
      </Link>
    </div>
  );
}

export function ProductTabs({
  tabs,
  heading,
  variant = "dark",
}: {
  tabs: ProductTab[];
  heading: ProductHeading;
  variant?: "dark" | "light";
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!tab) return null;

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = (index + 1) % tabs.length;
        break;
      case "ArrowRight":
        next = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActive(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={styles.root} data-variant={variant} dir="rtl">
      <div className={styles.header}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" /> {heading.eyebrow}
          </p>
          <h2 id={heading.id} className={styles.title}>
            {heading.title}
          </h2>
          <p className={styles.description}>{brandText(heading.description)}</p>
          <span className={styles.rule} aria-hidden="true" />
        </div>

        <div className={styles.controls}>
          <div role="tablist" aria-label="دسته‌بندی محصولات پیشنهادی" className={styles.tabList}>
            {tabs.map((t, index) => {
              const on = t.id === tab.id;
              return (
                <button
                  key={t.id}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  id={`${id}-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={`${id}-panel`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(t.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={styles.tab}
                >
                  {brandText(t.label)}
                </button>
              );
            })}
          </div>
          <Link href={tab.href} className={styles.viewAll} aria-label={`مشاهده همه ${tab.label}`}>
            مشاهده همه <ArrowLeft className={styles.arrow} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab.id}`} tabIndex={0} className={styles.panel}>
        <div className="animate-fade-up">
          <ProductRail key={tab.id} items={tab.items.slice(0, 8)} href={tab.href} />
        </div>
      </div>
    </div>
  );
}
