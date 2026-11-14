import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { IMAGES, img } from "@/lib/images";

/* ------------------------------------------------------------------ *
 * Live site content store. The admin panel edits this; the storefront
 * reads it. One localStorage-backed source of truth for all editable
 * copy, imagery, contact details and section headings.
 * ------------------------------------------------------------------ */

const KEY = "50500_content_v1";

export type HeroLink = { label: string; href: string };

import { pushSetting } from "./api";

export const HERO_LINK_OPTIONS: HeroLink[] = [
  { label: "جستجوی خودرو (پایین صفحه)", href: "#car-finder" },
  { label: "صفحه همه محصولات", href: "/products" },
  { label: "فقط کفپوش‌ها", href: "/products?category=embroidered-leather" },
  { label: "فقط کفپوش اختصاصی", href: "/products" },
  { label: "پیشنهادهای ویژه", href: "/products?discounted=1&sort=discount" },
  { label: "تماس با ما", href: "/contact" },
  { label: "درباره ما", href: "/about" },
];

export type SiteContent = {
  defaultTheme: "dark" | "light";
  maintenance: boolean;
  announcement: string;
  promoBar: { shipping: string; code: string; percent: string };
  contact: { phone: string; phoneHref: string; email: string; address: string; hours: string };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleHighlight: string;
    titleLine2: string;
    description: string;
    primary: HeroLink;
    secondary: HeroLink;
    finderTitle: string;
    finderDesc: string;
    image: string;
    imageAlt: string;
  };
  trust: { title: string; desc: string }[];
  promo: {
    enabled: boolean;
    label: string;
    title: string;
    highlight: string;
    description: string;
    code: string;
    button: string;
    href: string;
  };
  headings: {
    tabs: { eyebrow: string; title: string; desc: string };
    groups: { eyebrow: string; title: string; desc: string };
    testimonials: { eyebrow: string; title: string; desc: string };
    blog: { eyebrow: string; title: string; desc: string };
  };
  footer: { about: string; copyright: string; note: string };
  /** Which leather / thread colours the shop currently offers. */
  matOptions: { disabledLeather: string[]; disabledThread: string[] };
  /** Editable texts for every storefront page, keyed by page id then field key. */
  pageContent: Record<string, Record<string, string>>;
  /** Editable image slots, keyed by slot id (e.g. "about.cover"). */
  imageSlots: Record<string, { src: string; alt: string }>;
  /** Blog article overrides, keyed by slug. */
  articles: Record<string, { title?: string; excerpt?: string; body?: string[]; image?: string }>;
};

export const DEFAULT_CONTENT: SiteContent = {
  defaultTheme: "dark",
  maintenance: false,
  announcement: "ارسال رایگان برای خریدهای بالای ۵ میلیون تومان",
  promoBar: { shipping: "ارسال به سراسر کشور", code: "50500", percent: "۱۰٪" },
  contact: {
    phone: "۰۲۱-۹۱۰۵۰۵۰۰",
    phoneHref: "tel:+982191050500",
    email: "info@50500.shop",
    address: "تهران، بزرگراه جلال آل‌احمد، دفتر فروش 50500",
    hours: "شنبه تا پنجشنبه، ۹ صبح تا ۸ شب",
  },
  hero: {
    eyebrow: "کفپوش تخصصی خودرو 50500",
    titleLine1: "پوشش کامل،",
    titleHighlight: "محافظت واقعی",
    titleLine2: "از خودروی شما",
    description: "کفپوش مناسب خودروی خود را پیدا کنید؛ مشخصات و قیمت محصولات را ببینید و با اطمینان انتخاب کنید.",
    primary: { label: "انتخاب خودروی من", href: "#car-finder" },
    secondary: { label: "مشاهده محصولات", href: "/products" },
    finderTitle: "کفپوش مخصوص خودروی شما",
    finderDesc: "برند و مدل خودرو را انتخاب کنید",
    image: "images/hero-mat.webp",
    imageAlt: "نمایی از تولید و ساخت محصولات 50500",
  },
  trust: [
    { title: "۱۲ ماه گارانتی", desc: "تعویض بدون قید و شرط" },
    { title: "ارسال رایگان", desc: "برای خریدهای بالای ۵ میلیون" },
    { title: "اسکن سه‌بعدی", desc: "فیت دقیق کف هر خودرو" },
    { title: "مشاوره رایگان", desc: "کمک در انتخاب رنگ و طرح" },
  ],
  promo: {
    enabled: true,
    label: "پیشنهاد ویژه",
    title: "پیشنهاد ویژه 50500",
    highlight: "تخفیف + ارسال",
    description: "کد تخفیف را در مرحله پرداخت وارد کنید و محصولات مشمول پیشنهاد را ببینید.",
    code: "50500",
    button: "مشاهده کالاهای تخفیف‌دار",
    href: "/products?discounted=1&sort=discount",
  },
  headings: {
    tabs: { eyebrow: "فروشگاه", title: "محصولات پیشنهادی ما", desc: "پرفروش‌ترین‌ها، منتخب تیم 50500 و تخفیف‌های فعال در یک نگاه" },
    groups: { eyebrow: "خرید بر اساس خودرو", title: "خودروی شما کدام است؟", desc: "کفپوش اختصاصی تمام مدل‌های هر گروه را ببینید" },
    testimonials: { eyebrow: "دیدگاه خریداران", title: "تجربه خریداران 50500", desc: "نظر مشتریانی که قبلاً از 50500 خریده‌اند" },
    blog: { eyebrow: "مجله 50500", title: "خواندنی‌های دنیای خودرو", desc: "راهنما، مقایسه و نکات نگهداری کفپوش و روکش چرمی" },
  },
  footer: {
    about: "فروشگاه 50500.shop؛ محصولات تخصصی خودرو با مشخصات شفاف و امکان انتخاب متناسب با خودروی شما.",
    copyright: "تمامی حقوق برای 50500.shop محفوظ است.",
    note: "ساخته‌شده با عشق به خودرو 🧡",
  },
  pageContent: {},
  imageSlots: {},
  articles: {},
  matOptions: { disabledLeather: [], disabledThread: [] },
};

/** Older saves used «فروشگاه 50500» and info@store50500.ir — keep the other
 *  values the owner edited, but correct the brand name once on load. */
export function rebrandText(value: string): string {
  return value
    .replace(/info@store50500\.ir/gi, "info@50500.shop")
    .replace(/فروشگاه ۵۰۵۰۰/gi, "50500.shop")
    .replace(/فروشگاه 50500/gi, "50500.shop")
    .replace(/50500\.co\b/gi, "50500.shop");
}

function rebrandContent(c: SiteContent): SiteContent {
  return {
    ...c,
    contact: { ...c.contact, email: rebrandText(c.contact.email) },
    footer: {
      about: rebrandText(c.footer.about),
      copyright: rebrandText(c.footer.copyright),
      note: rebrandText(c.footer.note),
    },
  };
}

export function loadSiteContent(): SiteContent {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) return DEFAULT_CONTENT;
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    const merged = {
      ...DEFAULT_CONTENT,
      ...parsed,
      promoBar: { ...DEFAULT_CONTENT.promoBar, ...(parsed.promoBar ?? {}) },
      contact: { ...DEFAULT_CONTENT.contact, ...(parsed.contact ?? {}) },
      hero: { ...DEFAULT_CONTENT.hero, ...(parsed.hero ?? {}), primary: parsed.hero?.primary ?? DEFAULT_CONTENT.hero.primary, secondary: parsed.hero?.secondary ?? DEFAULT_CONTENT.hero.secondary },
      promo: { ...DEFAULT_CONTENT.promo, ...(parsed.promo ?? {}) },
      headings: {
        tabs: { ...DEFAULT_CONTENT.headings.tabs, ...(parsed.headings?.tabs ?? {}) },
        groups: { ...DEFAULT_CONTENT.headings.groups, ...(parsed.headings?.groups ?? {}) },
        testimonials: { ...DEFAULT_CONTENT.headings.testimonials, ...(parsed.headings?.testimonials ?? {}) },
        blog: { ...DEFAULT_CONTENT.headings.blog, ...(parsed.headings?.blog ?? {}) },
      },
      footer: { ...DEFAULT_CONTENT.footer, ...(parsed.footer ?? {}) },
      trust: parsed.trust?.length === 4 ? parsed.trust : DEFAULT_CONTENT.trust,
      pageContent: parsed.pageContent ?? {},
      imageSlots: parsed.imageSlots ?? {},
      articles: parsed.articles ?? {},
      matOptions: {
        disabledLeather: Array.isArray(parsed.matOptions?.disabledLeather) ? parsed.matOptions.disabledLeather : [],
        disabledThread: Array.isArray(parsed.matOptions?.disabledThread) ? parsed.matOptions.disabledThread : [],
      },
    };
    return rebrandContent(merged);
  } catch {
    return DEFAULT_CONTENT;
  }
}

const CONTENT_EVENT = "50500:content";

export function saveSiteContent(content: SiteContent) {
  pushSetting("site_content", content);
  try {
    localStorage.setItem(KEY, JSON.stringify(content));
  } catch {
    /* storage unavailable: keep in memory */
  }
  // Tell the mounted provider so the storefront and editors see the change immediately.
  window.dispatchEvent(new CustomEvent<SiteContent>(CONTENT_EVENT, { detail: content }));
}

export function resetSiteContent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Publishes the full content document (used by the CMS editors). */
export async function publishSiteContent(next: SiteContent): Promise<void> {
  saveSiteContent(next);
}

/** Every image already embedded in the bundle — the panel's media library. */
export const MEDIA_LIBRARY = Object.keys(IMAGES).filter((key) => /\.(webp|jpe?g|png|svg)$/.test(key));

type ContentContextValue = {
  content: SiteContent;
  update: (patch: Partial<SiteContent>) => void;
  updateHero: (patch: Partial<SiteContent["hero"]>) => void;
  updatePromo: (patch: Partial<SiteContent["promo"]>) => void;
  updateContact: (patch: Partial<SiteContent["contact"]>) => void;
  updateFooter: (patch: Partial<SiteContent["footer"]>) => void;
  updateHeading: <K extends keyof SiteContent["headings"]>(key: K, patch: Partial<SiteContent["headings"][K]>) => void;
  updateTrust: (index: number, patch: Partial<SiteContent["trust"][number]>) => void;
  replace: (content: SiteContent) => void;
  reset: () => void;
};

const ContentContext = createContext<ContentContextValue | null>(null);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() => loadSiteContent());

  useEffect(() => {
    saveSiteContent(content);
  }, [content]);

  useEffect(() => {
    const onChange = (event: Event) => setContent((event as CustomEvent<SiteContent>).detail);
    window.addEventListener(CONTENT_EVENT, onChange);
    return () => window.removeEventListener(CONTENT_EVENT, onChange);
  }, []);

  const update = useCallback((patch: Partial<SiteContent>) => setContent((c) => ({ ...c, ...patch })), []);
  const updateHero = useCallback((patch: Partial<SiteContent["hero"]>) => setContent((c) => ({ ...c, hero: { ...c.hero, ...patch } })), []);
  const updatePromo = useCallback((patch: Partial<SiteContent["promo"]>) => setContent((c) => ({ ...c, promo: { ...c.promo, ...patch } })), []);
  const updateContact = useCallback((patch: Partial<SiteContent["contact"]>) => setContent((c) => ({ ...c, contact: { ...c.contact, ...patch } })), []);
  const updateFooter = useCallback((patch: Partial<SiteContent["footer"]>) => setContent((c) => ({ ...c, footer: { ...c.footer, ...patch } })), []);
  const updateHeading = useCallback(<K extends keyof SiteContent["headings"]>(key: K, patch: Partial<SiteContent["headings"][K]>) => {
    setContent((c) => ({ ...c, headings: { ...c.headings, [key]: { ...(c.headings[key] as object), ...(patch as object) } } as SiteContent["headings"] }));
  }, []);
  const updateTrust = useCallback((index: number, patch: Partial<SiteContent["trust"][number]>) => {
    setContent((c) => ({ ...c, trust: c.trust.map((row, i) => (i === index ? { ...row, ...patch } : row)) }));
  }, []);
  const replace = useCallback((next: SiteContent) => setContent(next), []);
  const reset = useCallback(() => setContent(DEFAULT_CONTENT), []);

  const value = useMemo(
    () => ({ content, update, updateHero, updatePromo, updateContact, updateFooter, updateHeading, updateTrust, replace, reset }),
    [content, update, updateHero, updatePromo, updateContact, updateFooter, updateHeading, updateTrust, replace, reset],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useSiteContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return ctx;
}

export { img };
