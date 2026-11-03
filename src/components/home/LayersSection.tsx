import { useState, type ReactNode } from "react";
import { ArrowLeft, Droplet, Layers, ShieldCheck } from "lucide-react";
import { ThemeLink } from "@/components/ThemeLink";
import styles from "./LayersSection.module.css";

/* ---------- custom icons that match the reference ---------- */
function HideIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3.5c1.2.9 2.6 1.2 4 1.2s2.8-.3 4-1.2l1.2 2.3 2.6.6-.6 2.7 1.5 2.4-1.9 1.5.3 2.9-2.7.7-1.1 2.6-2.4-1.3L12 20.5l-1-1.6-2.4 1.3-1.1-2.6-2.7-.7.3-2.9-1.9-1.5 1.5-2.4-.6-2.7 2.6-.6Z" />
      <path d="M12 8.2c1.6 1.4 1.6 6.2 0 7.6M9.3 9.6c.8 1.4.8 3.4 0 4.8M14.7 9.6c-.8 1.4-.8 3.4 0 4.8" strokeWidth="1.2" />
    </svg>
  );
}
function GripIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <g fill="currentColor" stroke="none">
        {[7, 10.3, 13.6, 17].map((x) => [7, 10.3, 13.6, 17].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.05" />))}
      </g>
    </svg>
  );
}

type Item = { title: string; sub: string; icon: ReactNode };

const ITEMS: Item[] = [
  { title: "روکش چرمی با کیفیت", sub: "ظاهر لوکس و مقاوم در برابر سایش", icon: <HideIcon /> },
  { title: "لایه فوم نرم", sub: "راحتی بیشتر و جذب صدا", icon: <Layers /> },
  { title: "لایه ضد آب", sub: "محافظت کامل در برابر رطوبت", icon: <Droplet /> },
  { title: "لایه تقویتی", sub: "استحکام و دوام بالا", icon: <ShieldCheck /> },
  { title: "بافت ضد لغزش", sub: "ثبات بیشتر روی کف خودرو", icon: <GripIcon /> },
];

/* ---------- wavy sheet geometry (shared by all five layers) ---------- */
const SHEET =
  "M0 44 C70 -2 170 -74 300 -66 C405 -60 505 -26 618 22 C632 30 630 44 614 52 C522 96 424 166 330 178 C216 192 92 116 10 66 C-4 58 -4 50 0 44 Z";

type Layer = {
  n: number;
  x: number;
  y: number;
  s: number;
  t: number; // thickness
  top: string;
  edge: string;
  overlay?: string;
  stroke?: string;
};

const LAYERS: Layer[] = [
  { n: 1, x: 92, y: 120, s: 1.0, t: 30, top: "url(#lyLeather)", edge: "url(#lyLeatherEdge)", overlay: "leather", stroke: "#060708" },
  { n: 2, x: 118, y: 238, s: 0.95, t: 26, top: "url(#lyFoam)", edge: "url(#lyFoamEdge)" },
  { n: 3, x: 140, y: 340, s: 0.9, t: 9, top: "url(#lyPerfBase)", edge: "#c7ccd3", overlay: "perf" },
  { n: 4, x: 158, y: 432, s: 0.86, t: 9, top: "url(#lyFelt)", edge: "#6f7783", overlay: "felt" },
  { n: 5, x: 176, y: 520, s: 0.82, t: 14, top: "url(#lyGrip)", edge: "#050506", overlay: "grip" },
];

function Sheet({ layer }: { layer: Layer }) {
  const { n, x, y, s, t, top, edge, overlay, stroke } = layer;
  const tf = `translate(${x} ${y}) scale(${s})`;
  const clipId = `lyClip${n}`;
  return (
    <g>
      {/* soft drop shadow onto the layer below */}
      <path d={SHEET} transform={`translate(${x + 10} ${y + t + 26}) scale(${s})`} fill="#000" opacity="0.5" filter="url(#lyShadow)" />
      {/* thickness */}
      <path d={SHEET} transform={`translate(${x} ${y + t}) scale(${s})`} fill={edge} />
      {n === 1 && <path d={SHEET} transform={`translate(${x} ${y + t * 0.55}) scale(${s})`} fill="none" stroke="#ff7a1a" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.65" />}
      {/* top face */}
      <clipPath id={clipId}>
        <path d={SHEET} transform={tf} />
      </clipPath>
      <path d={SHEET} transform={tf} fill={top} stroke={stroke ?? "rgba(0,0,0,0.12)"} strokeWidth={n === 1 ? 4 : 1} />
      {overlay && (
        <g clipPath={`url(#${clipId})`}>
          {overlay === "leather" && (
            <>
              <rect x={x - 40} y={y - 120} width={720} height={340} fill="url(#lyQuilt)" />
              {/* heel pad */}
              <path d="M54 30 L150 -8 L196 14 L102 54 Z" transform={tf} fill="#0b0c0f" stroke="#2a2d33" strokeWidth="2" />
              <g transform={tf} stroke="#1e2126" strokeWidth="3">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <line key={i} x1={70 + i * 14} y1={30 - i * 5.5} x2={92 + i * 14} y2={42 - i * 5.5} />
                ))}
              </g>
              {/* double orange X stitching */}
              <g transform={tf} stroke="#ff7a1a" strokeWidth="2.2" strokeDasharray="7 5" fill="none" opacity="0.95">
                <path d="M210 -48 C300 10 420 90 520 120" />
                <path d="M224 -54 C314 4 432 82 534 112" />
                <path d="M430 -40 C360 30 300 100 250 170" />
                <path d="M446 -34 C376 36 316 106 266 176" />
                <path d="M110 -20 C150 40 190 100 230 160" />
                <path d="M560 0 C520 60 470 110 420 150" />
              </g>
              {/* glossy highlight */}
              <path d={SHEET} transform={tf} fill="url(#lySheen)" />
            </>
          )}
          {overlay === "perf" && <rect x={x - 40} y={y - 120} width={720} height={340} fill="url(#lyPerf)" />}
          {overlay === "felt" && <rect x={x - 40} y={y - 120} width={720} height={340} fill="#9aa1ab" filter="url(#lyFeltNoise)" opacity="0.55" />}
          {overlay === "grip" && <rect x={x - 40} y={y - 120} width={720} height={340} fill="url(#lyGripDots)" />}
        </g>
      )}
      {/* numbered badge at the right tip, like the reference */}
      <g transform={`translate(${x - 4} ${y + 44 * s + 6})`}>
        <circle r="25" fill="#0c0d10" stroke="#ff6b1a" strokeWidth="3.5" filter="url(#lyBadgeGlow)" />
        <text textAnchor="middle" dominantBaseline="central" fontSize="23" fontWeight="800" fill="#ffffff" style={{ fontFamily: "Arial, Shabnam, sans-serif" }}>
          {n}
        </text>
      </g>
    </g>
  );
}

function ExplodedStack() {
  return (
    <svg viewBox="0 0 800 720" className={styles.stackSvg} role="img" aria-label="نمای انفجاری پنج لایه کفپوش 50500">
      <defs>
        <linearGradient id="lyLeather" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b2e33" />
          <stop offset="55%" stopColor="#141619" />
          <stop offset="100%" stopColor="#08090b" />
        </linearGradient>
        <linearGradient id="lyLeatherEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1c20" />
          <stop offset="100%" stopColor="#050506" />
        </linearGradient>
        <linearGradient id="lySheen" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="70%" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lyPuff" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#3a3d43" />
          <stop offset="55%" stopColor="#1a1c20" />
          <stop offset="100%" stopColor="#0a0b0d" />
        </radialGradient>
        <pattern id="lyQuilt" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="scale(1 0.62) rotate(45)">
          <rect width="20" height="20" fill="#050506" />
          <rect x="1" y="1" width="18" height="18" rx="4" fill="url(#lyPuff)" />
        </pattern>

        <linearGradient id="lyFoam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f2f4" />
          <stop offset="100%" stopColor="#d9dce1" />
        </linearGradient>
        <linearGradient id="lyFoamEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef0f2" />
          <stop offset="100%" stopColor="#b9bec6" />
        </linearGradient>

        <linearGradient id="lyPerfBase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbfbfc" />
          <stop offset="100%" stopColor="#d6dae0" />
        </linearGradient>
        <pattern id="lyPerf" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="skewX(-25) scale(1 0.62)">
          <circle cx="4" cy="4" r="1.9" fill="#2a2d32" />
          <circle cx="10.5" cy="10.5" r="1.9" fill="#2a2d32" />
        </pattern>

        <linearGradient id="lyFelt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b9bec6" />
          <stop offset="60%" stopColor="#8d949e" />
          <stop offset="100%" stopColor="#6b727c" />
        </linearGradient>
        <filter id="lyFeltNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.6" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>

        <linearGradient id="lyGrip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#24262a" />
          <stop offset="100%" stopColor="#060607" />
        </linearGradient>
        <pattern id="lyGripDots" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="skewX(-25) scale(1 0.6)">
          <circle cx="3" cy="3" r="2.6" fill="#3a3d43" />
          <circle cx="7.5" cy="7.5" r="2.2" fill="#2b2e33" />
          <circle cx="2.6" cy="2.4" r="0.9" fill="#6a6e76" />
        </pattern>

        <radialGradient id="lyFloor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff6b1a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff6b1a" stopOpacity="0" />
        </radialGradient>
        <filter id="lyShadow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="lyRingBlur" x="-30%" y="-100%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="lyBadgeGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ff6b1a" floodOpacity="0.9" />
        </filter>
      </defs>

      {/* glowing orange floor ring */}
      <ellipse cx="420" cy="628" rx="330" ry="92" fill="url(#lyFloor)" />
      <ellipse cx="420" cy="628" rx="318" ry="78" fill="none" stroke="#ff6b1a" strokeWidth="14" opacity="0.55" filter="url(#lyRingBlur)" />
      <ellipse cx="420" cy="628" rx="318" ry="78" fill="none" stroke="#ff7a1a" strokeWidth="4" />

      {[...LAYERS].reverse().map((l) => (
        <Sheet key={l.n} layer={l} />
      ))}
    </svg>
  );
}

export function LayersSection() {
  const [active, setActive] = useState(0);

  return (
    <section id="mat-layers" className={styles.section} dir="rtl">
      <span aria-hidden="true" className={styles.quiltLeft} />
      <span aria-hidden="true" className={styles.quiltRight} />
      <span aria-hidden="true" className={`${styles.streak} ${styles.streakTL}`} />
      <span aria-hidden="true" className={`${styles.streak} ${styles.streakBL}`} />
      <span aria-hidden="true" className={`${styles.streak} ${styles.streakBR}`} />

      <div className={`container-x ${styles.layout}`}>
        {/* RTL: first child → right side (stack) */}
        <div className={styles.stage}>
          <ExplodedStack />
        </div>

        <div className={styles.copy}>
          <span className={styles.badge}>
            <ShieldCheck className={styles.badgeIcon} strokeWidth={2.2} />
            ۵ لایه محافظتی حرفه‌ای
          </span>

          <h2 className={styles.title}>
            لایه‌های پیشرفته کفپوش <span className={styles.num}>50500</span>
          </h2>

          <p className={styles.desc}>
            <strong>ترکیبی از بهترین مواد اولیه و تکنولوژی روز دنیا برای محافظت</strong>
            <br />
            بیشتر، دوام بالاتر و راحتی بیشتر.
          </p>

          <ul className={styles.list}>
            {ITEMS.map((it, i) => (
              <li
                key={it.title}
                className={`${styles.row} ${active === i ? styles.rowActive : ""}`}
                onMouseEnter={() => setActive(i)}
              >
                <span className={styles.iconTile}>{it.icon}</span>
                <span className={styles.textCard}>
                  <span className={styles.rowTitle}>{it.title}</span>
                  <span className={styles.rowSub}>{it.sub}</span>
                </span>
              </li>
            ))}
          </ul>

          <ThemeLink href="/products" className={styles.cta}>
            <span>مشاهده جزئیات بیشتر</span>
            <ArrowLeft className={styles.ctaArrow} />
          </ThemeLink>
        </div>
      </div>
    </section>
  );
}
