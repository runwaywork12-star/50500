import { useMemo } from "react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, ChevronDown, Quote } from "lucide-react";
import { CopyCode } from "@/components/home/CopyCode";
import { ProductTabs, type ProductTab } from "@/components/home/ProductTabs";
import { HomeHero } from "@/components/store/HomeHero";
import { Reveal } from "@/components/store/Motion";
import { SectionHeading, Stars } from "@/components/ui";
import { LayersSection } from "@/components/home/LayersSection";
import { Spotlight, WorkshopCard } from "@/components/home/Editorial";
import { CollectionShowcase } from "@/components/home/CollectionShowcase";
import { BRANDS, getProducts, modelCount } from "@/lib/catalog";
import { fa } from "@/lib/format";
import { useSiteContent } from "@/lib/site-content";
import {
  BLOG_POSTS,
  CAR_GROUPS,
  FAQ,
  POPULAR_BRANDS,
  REVIEWS,
  TRUST,
} from "@/data/content";

export default function Home({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const { content } = useSiteContent();
  const products = useMemo(() => getProducts(), []);
  const allBrands = BRANDS;
  const totalModels = modelCount();

  const accessories = useMemo(
    () => products.filter((p) => p.category === "accessories"),
    [products],
  );

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

  const popularBrands = POPULAR_BRANDS.map((slug) => allBrands.find((b) => b.slug === slug)).filter((b): b is NonNullable<typeof b> => Boolean(b));

  const finderBrands = allBrands.map((b) => ({
    slug: b.slug,
    name: b.name,
    models: b.models.map((m) => ({ slug: m.slug, name: m.name })),
  }));

  return (
    <>
      <HomeHero modelCount={totalModels} finderBrands={finderBrands} />

      {/* trust strip — copy managed in Admin → محتوای سایت */}
      <div className="container-x relative z-20 mt-3 sm:mt-4">
        <div className="grid grid-cols-2 overflow-hidden rounded-3xl border bd bg-ink-850 lg:grid-cols-4">
          {content.trust.map((t, i) => {
            const Icon = TRUST[i]?.icon ?? TRUST[0].icon;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3.5 sm:gap-3.5 sm:p-5 ${i > 0 ? "lg:border-s lg:bd" : ""} ${i > 1 ? "border-t bd lg:border-t-0" : ""} ${i % 2 === 1 ? "border-s bd lg:border-s" : ""}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 sm:size-12">
                  <Icon className="size-6" />
                </span>
                <span>
                  <span className="block text-[13px] font-black sm:text-sm">{t.title}</span>
                  <span className="mt-0.5 block text-xs tdim">{t.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collection Showcase */}
      <CollectionShowcase accessories={accessories} modelCount={totalModels} />

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

      {/* Campaign banner — copy managed in Admin → محتوای سایت */}
      {content.promo.enabled && (
        <section className="container-x py-12 lg:py-20">
          <div className="relative overflow-hidden rounded-[2rem] border border-brand-500/25 bg-linear-to-br from-brand-600/30 via-ink-850 to-ink-900 p-8 sm:p-12">
            <div className="dot-bg pointer-events-none absolute inset-0 opacity-30" />
            <div className="pointer-events-none absolute -end-16 -top-16 h-72 w-72 rounded-full bg-brand-500/30 blur-[100px]" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-3 py-1 text-xs font-black text-[#fff]">{content.promo.label}</span>
                <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                  {content.promo.title} <span className="text-gradient">{content.promo.highlight}</span>
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-8 tdim">{content.promo.description}</p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <CopyCode code={content.promo.code} variant={theme} />
                <Link href={content.promo.href} className="btn btn-primary w-full px-7 py-3.5 md:w-auto">
                  {content.promo.button} <ArrowLeft className="size-5" />
                </Link>
              </div>
            </div>
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
                  {/* wide photo, aspect like the reference cards */}
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
                    <span className="mt-1.5 line-clamp-3 text-[11px] leading-6 tdim">
                      {brandNames.join("، ")}
                    </span>
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

      {/* product spotlight: real product facts + real product photo */}
      <Spotlight />

      {/* testimonials */}
      <section className="container-x py-12 lg:py-20">
        <SectionHeading eyebrow={content.headings.testimonials.eyebrow} title={content.headings.testimonials.title} desc={content.headings.testimonials.desc} />
        <div className="grid gap-4 md:grid-cols-3 rail">
          {REVIEWS.slice(0, 3).map((t, idx) => (
            <figure key={idx} className="surface spot flex h-full flex-col rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <Stars value={t.rating} className="size-4" />
                <Quote className="size-7 text-brand-500/30" />
              </div>
              <blockquote className="mt-3 line-clamp-6 flex-1 text-sm leading-8 tdim">{t.comment}</blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t bd pt-4">
                <span className="grid size-10 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-700 text-sm font-black text-white">{t.name.slice(0, 1)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{t.name}</span>
                  <span className="block truncate text-xs tdim">{t.city}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* blog */}
      <section className="container-x py-12 lg:py-20">
        <SectionHeading eyebrow={content.headings.blog.eyebrow} title={content.headings.blog.title} desc={content.headings.blog.desc} action={{ href: "/blog", label: "همه مقالات" }} />
        <div className="grid gap-4 md:grid-cols-3 rail">
          {BLOG_POSTS.slice(0, 3).map((p, i) => (
            <Reveal key={p.slug} delay={i * 80} className="max-md:w-[78%] max-md:shrink-0 max-md:snap-start">
              <Link href={`/blog/${p.slug}`} className="surface group block h-full overflow-hidden rounded-3xl transition hover:border-brand-500/30">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={p.image} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <span className="glass absolute start-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold">آموزشی</span>
                </div>
                <div className="p-5">
                  <p className="text-xs tdim">
                    {p.date} · {p.readTime}
                  </p>
                  <h3 className="mt-2 text-base font-black leading-7 transition-colors group-hover:text-brand-300">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-7 tdim">{p.excerpt}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* faq + contact */}
      <section className="container-x pb-4">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeading eyebrow="پرسش‌های پرتکرار" title="سؤالات متداول" />
            <div className="grid gap-3">
              {FAQ.map((f, i) => (
                <details key={f.q} className="surface group rounded-2xl p-5 open:border-brand-500/30" open={i === 0}>
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-bold sm:text-base">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 tdim transition-transform group-open:rotate-180 group-open:text-brand-400" />
                  </summary>
                  <p className="mt-3 text-sm leading-8 tdim">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <WorkshopCard />
        </div>
      </section>
    </>
  );
}
