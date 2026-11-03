import { ArrowLeft, CarFront, Layers3 } from "lucide-react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { CarFinder, type FinderBrand } from "@/components/store/CarFinder";
import { fa } from "@/lib/format";
import { img } from "@/lib/images";
import { useSiteContent } from "@/lib/site-content";
import styles from "./HomeHeroMobile.module.css";

/** Hero copy is fully admin-editable through the live content store. */
export function HomeHero({
  modelCount,
  finderBrands,
}: {
  modelCount: number;
  finderBrands: FinderBrand[];
}) {
  const { content } = useSiteContent();
  const hero = content.hero;
  const showFinder = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("car-finder")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
  };

  return (
    <section dir="rtl" className="home-hero relative isolate overflow-hidden border-b bd">
      <div aria-hidden="true" className="home-hero-backdrop pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="stitch-bg pointer-events-none absolute inset-0 -z-10 opacity-40" />

      <div className={styles.hero} data-testid="mobile-home-hero">
        <div className={styles.visual}>
          <img className={styles.image} src={img(hero.image)} alt={hero.imageAlt} fetchPriority="high" />
          <span className={styles.imageBlend} aria-hidden="true" />
        </div>
        <div className={styles.content}>
          <p className={styles.brand} dir="ltr">50500<span>.co</span></p>
          <h1 className={styles.heading}>
            {hero.titleLine1} <span className={styles.highlight}>{hero.titleHighlight}</span> {hero.titleLine2}
          </h1>
          <p className={styles.description}>{hero.description}</p>
          {hero.primary.href === "#car-finder" ? (
            <button type="button" className={styles.primary} onClick={showFinder}>
              {hero.primary.label} <ArrowLeft size={19} aria-hidden="true" />
            </button>
          ) : (
            <Link href={hero.primary.href} className={styles.primary}>
              {hero.primary.label} <ArrowLeft size={19} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <div className="relative mx-auto hidden min-h-[unset] max-w-[1920px] items-center gap-0 px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5 md:grid lg:min-h-[390px] lg:grid-cols-2 lg:px-0 lg:py-0 xl:min-h-[410px]">
        {/* Copy intentionally sits on the right for the Persian RTL layout. */}
        <div className="relative z-10 order-1 py-1 sm:px-4 lg:px-8 lg:py-5 xl:px-12 2xl:px-16">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/35 bg-brand-500/10 px-4 py-2 text-xs font-bold text-brand-200">
              <CarFront className="size-4" /> {hero.eyebrow}
            </span>
            <span className="home-hero-count inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-brand-400" /> {fa(modelCount)} مدل خودرو
            </span>
          </div>

          <h1 className="mt-3 max-w-none text-pretty text-[1.35rem] font-black leading-[1.45] tracking-tight sm:text-[1.65rem] sm:leading-[1.4] lg:mt-3 lg:whitespace-nowrap lg:text-[1.55rem] xl:text-[1.8rem] xl:leading-[1.35]">
            {hero.titleLine1} <span className="text-gradient">{hero.titleHighlight}</span> {hero.titleLine2}
          </h1>
          <p className="home-hero-description mt-2 max-w-[39rem] text-xs leading-6 sm:text-[13px] sm:leading-6 lg:mt-2">
            {hero.description}
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row">
            <Link href={hero.primary.href} className="btn btn-primary shine justify-center px-5 py-3 text-sm sm:text-sm">
              {hero.primary.label} <ArrowLeft className="size-5" />
            </Link>
            <Link href={hero.secondary.href} className="btn btn-ghost justify-center px-5 py-3 text-sm backdrop-blur sm:text-sm">
              {hero.secondary.label} <Layers3 className="size-4" />
            </Link>
          </div>
        </div>

        {/* Hero image on desktop and mobile */}
        <div className="home-hero-image pointer-events-none absolute inset-y-0 left-0 w-[68%] overflow-hidden opacity-20 sm:w-[64%] sm:opacity-30 lg:w-[52%] lg:opacity-100">
          <img
            src={img(hero.image)}
            alt={hero.imageAlt}
            className="h-full w-full object-cover object-center"
          />
          <div aria-hidden="true" className="home-hero-image-overlay pointer-events-none absolute inset-0" />
        </div>
      </div>

      {/* Functional vehicle finder sits directly under the hero as one continuous composition. */}
      <div id="car-finder" className="relative z-20 mx-auto mt-0 max-w-[1790px] px-4 pb-3 sm:px-6 sm:pb-4 md:-mt-2 lg:-mt-4 lg:px-8">
        <CarFinder
          brands={finderBrands}
          title={hero.finderTitle}
          description={hero.finderDesc}
          buttonLabel="نمایش کفپوش‌ها"
          brandPlaceholder="برند خودرو"
          modelPlaceholder="همه مدل‌ها"
          modelFirstPrompt="ابتدا برند را انتخاب کنید"
          className="home-hero-finder !rounded-2xl !p-3 shadow-2xl backdrop-blur-xl sm:!p-3"
        />
      </div>

      {/* Seamless, database-driven brand ticker. Slugs provide stable English labels and live filters. */}
      {finderBrands.length > 0 && (
        <div className="home-brand-strip w-full border-t bd py-3" aria-label="انتخاب برند خودرو">
          <div className="home-brand-marquee w-full overflow-hidden" dir="ltr">
            <div className="home-brand-track flex w-max items-center gap-0">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center gap-3 pe-3" aria-hidden={copy === 1}>
                  {finderBrands.map((brand) => (
                    <Link
                      key={`${copy}-${brand.slug}`}
                      href={`/products?brand=${brand.slug}`}
                      tabIndex={copy ? -1 : 0}
                      className="home-brand-chip rounded-full border bd px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] transition hover:border-brand-500/50 hover:text-brand-400"
                    >
                      {brand.slug.replace(/-/g, " ")}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
