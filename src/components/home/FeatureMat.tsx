import { useState } from "react";
import { ArrowLeft, BadgeCheck, Droplets, Gem, ShieldCheck, Truck } from "lucide-react";
import { ThemeLink } from "@/components/ThemeLink";
import { img } from "@/lib/images";
import styles from "./FeatureMat.module.css";

/* ------------------------------------------------------------------ *
 * Featured "هر آنچه خودروی شما نیاز دارد" block — brush title, the 5D
 * mat on its glowing podium, four exploded layers and the product panel.
 * ------------------------------------------------------------------ */

type Layer = { title: string; sub: string };

const LAYERS: Layer[] = [
  { title: "رویه چرمی", sub: "مطمئن و ضد آب" },
  { title: "فوم ۹ میلی‌متری", sub: "ضربه‌گیر" },
  { title: "پارچه جودون", sub: "بادوام" },
  { title: "لایه زیرین", sub: "ضد لغزش" },
];

const SHEET =
  "M4 34 C52 4 118 -22 186 -18 C246 -15 300 4 366 26 C374 30 373 37 363 41 C312 64 258 90 208 94 C150 98 82 66 10 40 C2 36 1 38 4 34 Z";

/** One exploded layer, drawn as a wavy quilted slab. */
function Slab({ index }: { index: number }) {
  const p = [
    { fill: "#23262c", deep: "#08090b", edge: "#050506", stitch: "#ff7a1a", quilt: true },
    { fill: "#fbfbfc", deep: "#cfd3d9", edge: "#b9bfc7", stitch: "", quilt: false },
    { fill: "#3b4048", deep: "#171a1f", edge: "#0d1013", stitch: "#262a31", quilt: true },
    { fill: "#1b1e22", deep: "#040506", edge: "#ff6b1a", stitch: "#3a3e45", quilt: true },
  ][index];
  const id = `fm${index}`;
  return (
    <svg viewBox="0 0 380 104" className={styles.slab} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${id}top`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={p.fill} />
          <stop offset="100%" stopColor={p.deep} />
        </linearGradient>
        {p.quilt && (
          <pattern id={`${id}q`} width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="scale(1 0.6) rotate(45)">
            <rect width="15" height="15" fill={p.deep} />
            <rect x="1.1" y="1.1" width="12.8" height="12.8" rx="3" fill={p.fill} />
            <path d="M0 0H15M0 0V15" stroke={p.stitch} strokeWidth="1.1" strokeOpacity=".95" />
          </pattern>
        )}
        <clipPath id={`${id}c`}>
          <path d={SHEET} />
        </clipPath>
      </defs>
      <path d={SHEET} transform="translate(0 7)" fill={p.edge} />
      <path d={SHEET} fill={`url(#${id}top)`} stroke={p.edge} strokeWidth="1.3" />
      {p.quilt && <rect width="380" height="104" fill={`url(#${id}q)`} clipPath={`url(#${id}c)`} />}
      {index === 3 && <path d={SHEET} transform="translate(0 7)" fill="none" stroke="#ff6b1a" strokeWidth="2.4" />}
      <path d={SHEET} fill="none" stroke={index === 0 ? "#ff7a1a" : "rgba(255,255,255,.18)"} strokeWidth={index === 0 ? 1.8 : 1} />
    </svg>
  );
}

export function FeatureMat() {
  const [active, setActive] = useState(0);

  return (
    <article className={styles.poster} dir="rtl" aria-labelledby="feature-poster-title">
      {/* ---------- brush title ---------- */}
      <div className={styles.titleWrap}>
        <h2 id="feature-poster-title" className={styles.brushTitle} data-text="هر آنچه خودروی شما نیاز دارد">
          هر آنچه خودروی شما <span className={styles.needWord}>نیاز دارد</span>
        </h2>
        <span className={styles.titleRule} aria-hidden="true" />
      </div>

      {/* ---------- stage ---------- */}
      <div className={styles.stage}>
        {/* right: four exploded layers */}
        <ul className={styles.layers} aria-label="لایه‌های ساختاری کفپوش 50500">
          {LAYERS.map((layer, i) => (
            <li
              key={layer.title}
              className={`${styles.layer} ${active === i ? styles.layerOn : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
            >
              <span className={styles.pill}>
                <span className={styles.pillTitle}>{layer.title}</span>
                <span className={styles.pillSub}>{layer.sub}</span>
              </span>
              <span className={styles.wire} aria-hidden="true">
                <span className={styles.wireDot} />
                <span className={styles.wireLine} />
              </span>
              <Slab index={i} />
            </li>
          ))}
        </ul>

        {/* left: mat on its glowing podium */}
        <ThemeLink href="/products" className={styles.matSide} aria-label="مشاهده کفپوش 50500">
          <span className={styles.bloom} aria-hidden="true" />
          <span className={styles.ring} aria-hidden="true" />
          <img
            src={img("images/showcase/mat-podium-clean.webp")}
            alt="کفپوش چرمی پنج بعدی 50500 روی استند نوری"
            className={styles.matImg}
          />
        </ThemeLink>
      </div>

      {/* ---------- product panel ---------- */}
      <div className={styles.panel}>
        <span className={styles.badge}>محصول پیشنهادی</span>

        <h3 className={styles.productTitle}>
          کفپوش خودرو <span dir="ltr" className={styles.number}>50500</span>
        </h3>
        <p className={styles.productDesc}>
          مدل خودروی خود را انتخاب کنید تا محصولات مرتبط و مشخصات هر گزینه را ببینید.
        </p>

        <div className={styles.usps}>
          {[
            { icon: Gem, label: "دوام بالا" },
            { icon: Droplets, label: "ضد آب" },
            { icon: Truck, label: "ارسال سریع" },
            { icon: ShieldCheck, label: "ضمانت کیفیت" },
          ].map((u) => (
            <div key={u.label} className={styles.usp}>
              <u.icon className={styles.uspIcon} strokeWidth={1.6} />
              <span className={styles.uspLabel}>{u.label}</span>
            </div>
          ))}
        </div>

        <ThemeLink href="/products" className={styles.cta}>
          <ArrowLeft className={styles.ctaArrow} />
          <span>مشاهده جزئیات بیشتر</span>
        </ThemeLink>

        <p className={styles.trust}>
          <BadgeCheck className={styles.trustIcon} /> ۱۲ ماه گارانتی تعویض بی‌قیدوشرط
        </p>
      </div>
    </article>
  );
}
