import { useMemo, useState } from "react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, ChevronDown, Phone, Quote } from "lucide-react";
import { ProductTabs, type ProductTab } from "@/components/home/ProductTabs";
import { HomeHero } from "@/components/store/HomeHero";
import { Reveal } from "@/components/store/Motion";
import { SectionHeading, Stars } from "@/components/ui";
import { LayersSection } from "@/components/home/LayersSection";
import { BRANDS, getProducts, modelCount } from "@/lib/catalog";
import { fa } from "@/lib/format";
import { useSiteContent } from "@/lib/site-content";
import {
  CAR_GROUPS,
  FAQ,
  POPULAR_BRANDS,
  RATING_BARS,
  REVIEWS,
} from "@/data/content";

const AVG_RATING = Math.round((REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length) * 10) / 10;
const REVIEW_COUNT = 1284;

function TestimonialsSection() {
  const { content } = useSiteContent();
  const h = content.headings.testimonials;

  const trackCards = (list: typeof REVIEWS, prefix: number, hidden: boolean) => (
    <div key={prefix} className="flex shrink-0 gap-4" aria-hidden={hidden}>
      {list.map((r, i) => (
        <figure key={`${prefix}-${i}`} dir="rtl" className="surface spot flex w-[300px] shrink-0 flex-col rounded-3xl p-5 sm:w-[340px]">
          <div className="flex items-center justify-between">
            <Stars value={r.rating} className="size-4" />
            <Quote className="size-6 text-brand-500/30" />
          </div>
          <blockquote className="mt-3 line-clamp-4 flex-1 text-[13px] leading-7 tdim">{r.comment}</blockquote>
          <figcaption className="mt-4 flex items-center gap-3 border-t bd pt-4">
            <span className="grid size-9 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-700 text-sm font-black text-white">
              {r.name.slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold">{r.name}</span>
              <span className="block truncate text-[11px] tdim">{r.city} · خرید تأییدشده</span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );

  const shifted = [...REVIEWS.slice(5), ...REVIEWS.slice(0, 5)];

  return (
    <section className="testimonials relative overflow-hidden border-y bd py-8 lg:py-10">
      <div className="pointer-events-none absolute -start-32 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-brand-500/10 blur-[120px]" />
      <div className="container-x relative grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-center lg:gap-10">
        <div className="testimonial-intro">
          <SectionHeading eyebrow={h.eyebrow} title={h.title} desc={h.desc} />
          <div className="rounded-3xl border bd p-5" style={{ background: "var(--surface-1)" }}>
            <div className="flex items-end gap-4">
              <span className="text-5xl font-black leading-none text-brand-300">{fa(AVG_RATING)}</span>
              <span className="pb-1">
                <Stars value={AVG_RATING} className="size-4" />
                <span className="mt-1.5 block text-xs tdim">از {fa(REVIEW_COUNT)} نظر ثبت‌شده</span>
              </span>
            </div>
            <ul className="mt-5 grid gap-2">
              {RATING_BARS.map((bar) => (
                <li key={bar.stars} className="flex items-center gap-3 text-[11px]">
                  <span className="w-9 shrink-0 font-bold tdim">{fa(bar.stars)} ستاره</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full soft">
                    <span className="block h-full rounded-full bg-linear-to-l from-brand-300 to-brand-600" style={{ width: `${bar.pct}%` }} />
                  </span>
                  <span className="w-9 shrink-0 text-end font-bold">{fa(bar.pct)}٪</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 text-[11px] leading-5 tdim">
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" /> {fa(Math.round(RATING_BARS[0].pct + RATING_BARS[1].pct))}٪ خریداران خرید خود را به دیگران پیشنهاد داده‌اند
            </p>
          </div>
        </div>

        <div className="testimonial-marquee relative grid content-center gap-4" dir="ltr">
          <div className="testimonial-track flex w-max gap-4">
            {[0, 1].map((copy) => trackCards(REVIEWS, copy, copy === 1))}
          </div>
          <div className="testimonial-track flex w-max gap-4" style={{ animationDirection: "reverse", animationDuration: "88s" }}>
            {[0, 1].map((copy) => trackCards(shifted, copy, true))}
          </div>
        </div>
      </div>
    </section>
  );
}

const HEADSET_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="2.5" y="13" width="4.5" height="7" rx="2"/><rect x="17" y="13" width="4.5" height="7" rx="2"/><path d="M20 20a3.5 3.5 0 0 1-3.5 3H13"/></svg>';
const CLOCK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>';

function FaqSection() {
  const { content } = useSiteContent();
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="faq-x border-t bd">
      <div className="container-x py-12 lg:py-16">
        <div className="faq-grid">
          <div className="faq-main">
            <SectionHeading
              eyebrow="پرسش‌های پرتکرار"
              title="سؤالات متداول"
              desc="پاسخ روشن به پرتکرارترین پرسش‌ها دربارهٔ سفارش، قالب و گارانتی کفپوش."
            />
            <div className="faq-list">
              {FAQ.map((item, idx) => (
                <div key={item.q} className={"faq-item" + (open === idx ? " open" : "")}>
                  <button
                    type="button"
                    className="faq-q"
                    onClick={() => setOpen(open === idx ? -1 : idx)}
                    aria-expanded={open === idx}
                  >
                    <span className="faq-num">۰{fa(idx + 1)}</span>
                    <span className="faq-q-text">{item.q}</span>
                    <ChevronDown className="faq-chevron" />
                  </button>
                  <div className="faq-a-wrap">
                    <div className="faq-a-inner">
                      <p className="faq-a">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="faq-help">
            <span className="faq-help-glow" aria-hidden="true" />
            <div className="faq-help-top">
              <span className="faq-help-badge" dangerouslySetInnerHTML={{ __html: HEADSET_SVG }} />
              <h3 className="faq-help-title">جواب سؤالت رو پیدا نکردی؟</h3>
              <p className="faq-help-desc">کارشناس‌های 50500 برای انتخاب کفپوش مناسب خودرو و پیگیری سفارش کنارت هستن.</p>
            </div>
            <div className="faq-help-rows">
              <a href={content.contact.phoneHref} className="faq-help-row">
                <Phone className="size-4" />
                <span>
                  <b>{content.contact.phone}</b>
                  <small>پاسخ‌گویی تلفنی</small>
                </span>
              </a>
              <div className="faq-help-row">
                <span className="faq-help-rowic" dangerouslySetInnerHTML={{ __html: CLOCK_SVG }} />
                <span>
                  <b>{content.contact.hours}</b>
                  <small>ساعات کاری</small>
                </span>
              </div>
            </div>
            <div className="faq-help-actions">
              <Link href="/contact" className="faq-help-btn">
                تماس با پشتیبانی
                <ArrowLeft className="size-4" />
              </Link>
              <Link href="/track" className="faq-help-btn ghost">
                پیگیری سفارش
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default function Home({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const { content } = useSiteContent();
  const products = useMemo(() => getProducts(), []);
  const allBrands = BRANDS;
  const totalModels = modelCount();

  const bestSellers = useMemo(
    () => [...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 8),
    [products],
  );

  const featured = useMemo(
    () => products.filter((p) => p.featured).slice(0, 8),
    [products],
  );

  const discounted = useMemo(
    () => products.filter((p) => p.comparePrice && p.comparePrice > p.price).slice(0, 8),
    [products],
  );

  const tabs: ProductTab[] = [
    { id: "best", label: "پرفروش‌ترین‌ها", href: "/products?sort=popular", items: bestSellers },
    { id: "featured", label: "منتخب 50500", href: "/products", items: featured },
    { id: "deals", label: "تخفیف‌دار", href: "/products?discounted=1&sort=discount", items: discounted },
  ].filter((t) => t.items.length > 0);

  const popularBrands = POPULAR_BRANDS.map((slug) => allBrands.find((b) => b.slug === slug)).filter(
    (b): b is NonNullable<typeof b> => Boolean(b),
  );

  const finderBrands = allBrands.map((b) => ({
    slug: b.slug,
    name: b.name,
    models: b.models.map((m) => ({ slug: m.slug, name: m.name })),
  }));

  return (
    <>
      <HomeHero modelCount={totalModels} finderBrands={finderBrands} />

      {/* products (tabbed) */}
      {tabs.length > 0 && (
        <section id="recommended-products" aria-labelledby="recommended-products-title" className="border-y bd bg-ink-900/50 py-10 lg:py-12">
          <div className="container-x">
            <ProductTabs
              tabs={tabs}
              variant={theme}
              heading={{
                id: "recommended-products-title",
                eyebrow: "فروشگاه",
                title: "محصولات پیشنهادی ما",
                description: "پرفروش‌ترین‌ها، منتخب تیم 50500 و تخفیف‌های فعال در یک نگاه",
              }}
            />
          </div>
        </section>
      )}

      {/* shop by car type — photo-led cards, one real car per group */}
      <section className="container-x pb-12 lg:pb-20">
        <SectionHeading
          eyebrow={content.headings.groups.eyebrow}
          title={content.headings.groups.title}
          desc={content.headings.groups.desc}
          center
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rail">
          {CAR_GROUPS.map((g, i) => {
            const groupBrands = allBrands.filter((b) => g.brands.includes(b.slug));
            const count = groupBrands.reduce((s, b) => s + b.models.length, 0);
            const brandNames = groupBrands.map((b) => b.name);
            return (
              <Reveal key={g.id} delay={i * 70} className="max-md:w-[78%] max-md:shrink-0 max-md:snap-start">
                <Link
                  href={`/products?group=${g.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border bd transition hover:-translate-y-1 hover:border-brand-500/45"
                  style={{ background: "var(--surface-1)" }}
                >
                  <span className="relative block aspect-[16/10] overflow-hidden" style={{ background: "var(--muted-surface)" }}>
                    <img
                      src={g.image}
                      alt={g.imageAlt ?? g.name}
                      title={g.imageCredit}
                      width={1280}
                      height={800}
                      decoding="async"
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                    <span className="absolute end-2.5 top-2.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                      {fa(count)} مدل
                    </span>
                  </span>

                  <span className="flex flex-1 flex-col p-4">
                    <span className="text-[15px] font-black leading-7">{g.name}</span>
                    <span className="mt-1.5 line-clamp-3 text-[11px] leading-6 tdim">{brandNames.join("، ")}</span>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-bold text-brand-300 transition-all group-hover:gap-3">
                      مشاهده کفپوش‌ها <ArrowLeft className="size-4" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="me-1 text-xs font-bold tdim">برندهای پرطرفدار:</span>
          {popularBrands.map((b) => (
            <Link key={b.slug} href={`/products?brand=${b.slug}`} className="chip">
              {b.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Advanced 5-layer isometric construction */}
      <LayersSection />

      {/* Testimonials marquee */}
      <TestimonialsSection />

      {/* Interactive FAQ + support card */}
      <FaqSection />
    </>
  );
}
