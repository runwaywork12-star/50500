import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ThemeLink } from "@/components/ThemeLink";
import { SectionHeading } from "@/components/ui";
import type { ProductCardData } from "@/lib/queries";
import { fa } from "@/lib/format";
import styles from "./CollectionShowcase.module.css";

const CUTOUTS: Record<string, string> = {
  "acc-steering-lock": "steering-lock",
  "acc-pedal-lock": "pedal-lock",
  "acc-wheel-cover": "wheel-cover",
  "acc-wheel-cover-brown": "wheel-cover-brown",
  "acc-gap-organizer": "gap-organizer",
  "acc-neck-pillow": "neck-pillow",
  "acc-seat-belt": "seatbelt-pads",
  "acc-trunk-organizer": "trunk-organizer",
  "acc-trunk-organizer-suede": "trunk-organizer-2",
  "acc-seat-back": "seat-organizer",
  "acc-armrest-organizer": "armrest-organizer",
  "acc-key-case": "key-case",
};

function displayImage(product: ProductCardData) {
  // Preserve product-specific uploads. Only replace our own stock illustrations.
  const base = CUTOUTS[product.slug];
  const isDefault = product.image.startsWith("/images/accessories/") || product.image.startsWith("/images/p/");
  return base && isDefault ? `/images/showcase/${base}.webp` : product.image;
}

/** Identical layout for both skins, with explicitly paired image/text surfaces. */
export function CollectionShowcase({ accessories, modelCount }: { accessories: ProductCardData[]; modelCount: number }) {
  return (
    <section id="cabin-collection" className={`container-x ${styles.collection}`} data-testid="collection-showcase">
      <SectionHeading
        eyebrow="کلکسیون خودرو"
        title={<>هر آنچه خودروی شما <span className="text-gradient">نیاز دارد</span></>}
        action={{ href: "/products?category=accessories", label: "همه لوازم جانبی" }}
      />

      <div className={styles.layout}>
        <div className={styles.matFeature}>
          <ThemeLink
            href="/products"
            className={styles.matLink}
            aria-label="مشاهده کفپوش‌های خودرو"
            data-testid="collection-mat"
          >
            <div className={styles.matVisual}>
              <Image
                src="/api/site-image/mat-black-red"
                alt="تصویر کفپوش خودرو ۵۰۵۰۰"
                fill
                unoptimized
                sizes="(max-width: 600px) 92vw, (max-width: 900px) 600px, 45vw"
                className={styles.matImage}
              />
            </div>
            <div className={styles.matCopy}>
              <p className={styles.eyebrow}>
                <span>محصول اصلی فروشگاه</span>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                <span>مخصوص {fa(modelCount)} مدل خودرو</span>
              </p>
              <h3 className={styles.matTitle}>کفپوش خودرو ۵۰۵۰۰</h3>
              <p className={styles.matDescription}>مدل خودروی خود را انتخاب کنید تا محصولات مرتبط و مشخصات هر گزینه را ببینید.</p>
              <span className={styles.matCta}>
                پیدا کردن کفپوش خودروی من <ArrowLeft className={styles.arrow} />
              </span>
            </div>
          </ThemeLink>
        </div>

        <div className={styles.accessories}>
          {accessories.slice(0, 4).map((product) => (
            <ThemeLink
              key={product.id}
              href={`/products/${product.slug}`}
              className={styles.accessoryCard}
              data-testid="collection-accessory"
            >
              <div className={styles.accessoryImage} data-testid="collection-accessory-media">
                <Image
                  src={displayImage(product)}
                  alt={product.title}
                  fill
                  unoptimized={displayImage(product).startsWith("/images/showcase/")}
                  sizes="(max-width: 480px) 43vw, (max-width: 900px) 46vw, 23vw"
                  className={styles.productImage}
                />
              </div>
              <div className={styles.accessoryBody} data-testid="collection-accessory-copy">
                <p className={styles.category}>لوازم جانبی خودرو</p>
                <h3 className={styles.productTitle}>{product.title}</h3>
                <div className={styles.productFooter}>
                  <p className={styles.price}>
                    <span>{fa(product.price)}</span>
                    <span className={styles.unit}>تومان</span>
                  </p>
                  <span className={styles.cardArrow} aria-hidden="true"><ArrowLeft /></span>
                </div>
              </div>
            </ThemeLink>
          ))}
        </div>
      </div>
    </section>
  );
}
