import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product } from "@/lib/catalog";
import styles from "./ProductTabs.module.css";

export type ProductTab = { id: string; label: string; href: string; items: Product[] };

type ProductHeading = { id: string; eyebrow: string; title: string; description: string };

function brandText(text: string) {
  return text.split(/(50500)/g).map((part, index) =>
    part === "50500" ? <bdi key={index} className={styles.brand} dir="ltr">50500</bdi> : part,
  );
}

export function ProductTabs({ tabs, heading, variant = "dark" }: {
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
    // Visual order is right-to-left, so Left moves to the next tab.
    switch (event.key) {
      case "ArrowLeft": next = (index + 1) % tabs.length; break;
      case "ArrowRight": next = (index - 1 + tabs.length) % tabs.length; break;
      case "Home": next = 0; break;
      case "End": next = tabs.length - 1; break;
      default: return;
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
          <h2 id={heading.id} className={styles.title}>{heading.title}</h2>
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
                  ref={(element) => { tabRefs.current[index] = element; }}
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
        <div key={tab.id} className={`${styles.items} grid animate-fade-up grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4`}>
          {tab.items.slice(0, 8).map((p, i) => (
            <div key={p.id} className={i >= 4 ? "h-full max-sm:hidden" : "h-full"}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
