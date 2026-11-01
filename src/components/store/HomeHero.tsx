import Image from "next/image";
import { ArrowLeft, CarFront, Layers3 } from "lucide-react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { CarFinder } from "@/components/store/CarFinder";
import { fa } from "@/lib/format";

type FinderBrand = { slug: string; name: string; models: { slug: string; name: string }[] };

type HeroSettings = Record<string, string>;

/** Static, admin-editable hero for 50500. No carousel and no unrelated branding. */
export function HomeHero({ modelCount, finderBrands, settings }: { modelCount: number; finderBrands: FinderBrand[]; settings: HeroSettings }) {
  const value = (key: string, fallback: string) => settings[key]?.trim() || fallback;
  return (
    <section dir="rtl" className="home-hero relative isolate overflow-hidden border-b bd">
      <div aria-hidden="true" className="home-hero-backdrop pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="stitch-bg pointer-events-none absolute inset-0 -z-10 opacity-40" />

      <div className="relative mx-auto grid min-h-[unset] max-w-[1920px] items-center gap-0 px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5 lg:min-h-[390px] lg:grid-cols-2 lg:px-0 lg:py-0 xl:min-h-[410px]">
        {/* Copy intentionally sits on the right for the Persian RTL layout. */}
        <div className="relative z-10 order-1 py-1 sm:px-4 lg:px-8 lg:py-5 xl:px-12 2xl:px-16">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/35 bg-brand-500/10 px-4 py-2 text-xs font-bold text-brand-200">
              <CarFront className="size-4" /> {value("hero.eyebrow", "کفپوش تخصصی خودرو ۵۰۵۰۰")}
            </span>
            <span className="home-hero-count inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-brand-400" /> {fa(modelCount)} {value("hero.model_count_label", "مدل خودرو")}
            </span>
          </div>

          <h1 className="mt-3 max-w-none text-pretty text-[1.35rem] font-black leading-[1.45] tracking-tight sm:text-[1.65rem] sm:leading-[1.4] lg:mt-3 lg:whitespace-nowrap lg:text-[1.55rem] xl:text-[1.8rem] xl:leading-[1.35]">
            {value("hero.title_line1", "پوشش کامل،")} <span className="text-gradient">{value("hero.title_highlight", "محافظت واقعی")}</span> {value("hero.title_line2", "از خودروی شما")}
          </h1>
          <p className="home-hero-description mt-2 max-w-[39rem] text-xs leading-6 sm:text-[13px] sm:leading-6 lg:mt-2">
            {value("hero.description", "کفپوش مناسب خودروی خود را پیدا کنید؛ مشخصات و قیمت محصولات را ببینید و با اطمینان انتخاب کنید.")}
          </p>


          <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row">
            <Link href={value("hero.primary_href", "#car-finder")} className="btn btn-primary shine justify-center px-5 py-3 text-sm sm:text-sm">
              {value("hero.primary_label", "انتخاب خودروی من")} <ArrowLeft className="size-5" />
            </Link>
            <Link href={value("hero.secondary_href", "/products")} className="btn btn-ghost justify-center px-5 py-3 text-sm backdrop-blur sm:text-sm">
              {value("hero.secondary_label", "مشاهده محصولات")} <Layers3 className="size-4" />
            </Link>
          </div>
        </div>

        {/* Independent desktop/mobile hero images are managed in Admin → Image Library. */}
        <div className="home-hero-image pointer-events-none absolute inset-y-0 left-0 w-[68%] overflow-hidden opacity-20 sm:w-[64%] sm:opacity-30 lg:w-[52%] lg:opacity-100">
          <Image
            src="/api/site-image/hero-mobile"
            alt={value("hero.image_alt", "نمایی از تولید و ساخت محصولات ۵۰۵۰۰")}
            fill
            priority
            unoptimized
            sizes="(max-width: 1024px) 100vw, 1px"
            className="object-cover object-center lg:hidden"
          />
          <Image
            src="/api/site-image/hero"
            alt={value("hero.image_alt", "نمایی از تولید و ساخت محصولات ۵۰۵۰۰")}
            fill
            priority
            unoptimized
            sizes="(max-width: 1023px) 1px, 55vw"
            className="hidden object-cover object-center lg:block"
          />
          <div aria-hidden="true" className="home-hero-image-overlay pointer-events-none absolute inset-0" />
        </div>
      </div>

      {/* Functional vehicle finder sits directly under the hero as one continuous composition. */}
      <div id="car-finder" className="relative z-20 mx-auto -mt-2 max-w-[1790px] px-4 pb-3 sm:px-6 sm:pb-4 lg:-mt-4 lg:px-8">
        <CarFinder
          brands={finderBrands}
          title={value("hero.finder_title", "کفپوش مخصوص خودروی شما")}
          description={value("hero.finder_desc", "برند و مدل خودرو را انتخاب کنید")}
          buttonLabel={value("hero.finder_button", "نمایش کفپوش‌ها")}
          brandPlaceholder={value("hero.finder_brand_placeholder", "برند خودرو")}
          modelPlaceholder={value("hero.finder_model_placeholder", "همه مدل‌ها")}
          modelFirstPrompt={value("hero.finder_model_first_prompt", "ابتدا برند را انتخاب کنید")}
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
                      <Link key={`${copy}-${brand.slug}`} href={`/products?brand=${brand.slug}`} tabIndex={copy ? -1 : 0} className="home-brand-chip rounded-full border bd px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] transition hover:border-brand-500/50 hover:text-brand-400">
                        {brand.slug.replaceAll("-", " ")}
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
