import { useState } from "react";
import { ArrowLeft, CarFront, Check, ShoppingCart } from "lucide-react";
import { ThemeLink } from "@/components/ThemeLink";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog";
import { fa } from "@/lib/format";
import { FeatureMat } from "./FeatureMat";
import { img } from "@/lib/images";
import styles from "./CollectionShowcase.module.css";

type ShowcaseItem = {
  slug: string;
  title: string;
  image: string;
  chips: [string, string];
  price: number;
};

const SHOWCASE_CARDS: ShowcaseItem[] = [
  {
    slug: "acc-wheel-cover",
    title: "روکش دو فرمان چرمی مشکی",
    image: img("images/showcase/card-wheel-cover.jpg"),
    chips: ["چرم درجه یک", "دوخت ظریف"],
    price: 899000,
  },
  {
    slug: "acc-front-5d-mat",
    title: "کفپوش چرم پنج بعدی جلو",
    image: img("images/showcase/card-front-mat.jpg"),
    chips: ["دوخت مقاوم", "لبه‌های بلند"],
    price: 399000,
  },
  {
    slug: "acc-rear-antislip-mat",
    title: "کفپوش مشکی ضدلغزش عقب",
    image: img("images/showcase/card-rear-mat.jpg"),
    chips: ["پوشش کامل", "ضد لغزش"],
    price: 499000,
  },
  {
    slug: "acc-seat-belt",
    title: "روکش چرمی کمربند ایمنی (جفت)",
    image: img("images/showcase/card-seatbelt-pads.jpg"),
    chips: ["راحتی بیشتر", "دوخت لوکس"],
    price: 299000,
  },
];

export function CollectionShowcase({
  accessories: _accessories,
  modelCount: _modelCount,
}: {
  accessories?: Product[];
  modelCount?: number;
}) {
  const { addItem } = useCart();
  const [addedSlug, setAddedSlug] = useState<string | null>(null);

  const handleAddToCart = (slug: string) => {
    addItem({ slug, qty: 1 });
    setAddedSlug(slug);
    setTimeout(() => setAddedSlug((prev) => (prev === slug ? null : prev)), 1500);
  };

  return (
    <section
      id="cabin-collection"
      dir="rtl"
      className={`container-x ${styles.collection}`}
      data-testid="collection-showcase"
    >
      <div className={styles.layout}>
        {/* RIGHT (RTL): the exact featured poster — brush title, podium, four layers, product panel */}
        <FeatureMat />


        {/* LEFT (RTL): 2×2 product cards */}
        <div className={styles.leftGrid}>
          {SHOWCASE_CARDS.map((card) => {
            const isAdded = addedSlug === card.slug;
            return (
              <article key={card.slug} className={styles.showcaseCard} data-testid="collection-accessory">
                <ThemeLink href={`/products/${card.slug}`} className={styles.cardHeader}>
                  <CarFront className={styles.cardCarIcon} />
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                </ThemeLink>

                <ThemeLink href={`/products/${card.slug}`} className={styles.cardMedia} data-testid="collection-accessory-media">
                  <img src={card.image} alt={card.title} loading="lazy" className={styles.cardImg} />
                </ThemeLink>

                <div className={styles.cardChips} data-testid="collection-accessory-copy">
                  {card.chips.map((chip) => (
                    <span key={chip} className={styles.cardChip}>
                      <span className={styles.chipCheck} aria-hidden="true">
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                      <span>{chip}</span>
                    </span>
                  ))}
                </div>

                <div className={styles.cardPriceRow}>
                  <span className={styles.cardPriceVal}>{fa(card.price)}</span>
                  <span className={styles.cardPriceUnit}>تومان</span>
                </div>

                <div className={styles.cardActions}>
                  <button type="button" onClick={() => handleAddToCart(card.slug)} className={styles.addToCartBtn}>
                    <ShoppingCart className={styles.cartIcon} />
                    <span>{isAdded ? "به سبد اضافه شد ✓" : "افزودن به سبد خرید"}</span>
                  </button>

                  <ThemeLink href={`/products/${card.slug}`} className={styles.circleArrowLink} aria-label={`مشاهده ${card.title}`}>
                    <ArrowLeft className="size-4" />
                  </ThemeLink>
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}
