import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, ChevronDown, Quote, Layers3, Droplets, ShieldCheck } from "lucide-react";
import { CopyCode } from "@/components/home/CopyCode";
import { ProductTabs, type ProductTab } from "@/components/home/ProductTabs";
import { HomeHero } from "@/components/store/HomeHero";
import { Reveal } from "@/components/store/Motion";
import { SectionHeading, Stars } from "@/components/ui";
import { Construction } from "@/components/home/Construction";
import { CollectionShowcase } from "@/components/home/CollectionShowcase";
import { getBlogPosts } from "@/lib/blog";
import { fa } from "@/lib/format";
import { FAQ, GROUP_IMAGES, RATING_BARS, STEPS, TRUST } from "@/lib/home-content";
import { getHomeData } from "@/lib/home-data";
import { getSettings } from "@/lib/settings";
import { matUrl } from "@/lib/mat-photos";

export async function HomePageContent({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const [d, heroSettings, blogPosts] = await Promise.all([getHomeData(), getSettings(), getBlogPosts()]);

  const tabs: ProductTab[] = [
    { id: "best", label: "پرفروش‌ترین‌ها", href: "/products?sort=popular", items: d.bestSellers },
    { id: "featured", label: "منتخب ۵۰۵۰۰", href: "/products", items: d.featured },
    { id: "deals", label: "تخفیف‌دار", href: "/products?discounted=1&sort=discount", items: d.discounted },
  ].filter((t) => t.items.length > 0);

  return (
    <>
      <HomeHero modelCount={d.modelCount} finderBrands={d.finderBrands} settings={heroSettings} />

      {/* trust strip */}
      <div className="container-x relative z-20 mt-3 sm:mt-4">
        <div className="grid grid-cols-2 overflow-hidden rounded-3xl border bd bg-ink-850 lg:grid-cols-4">
          {TRUST.map((t, i) => (
            <div key={t.title} className={`flex items-center gap-3.5 p-5 ${i > 0 ? "lg:border-s lg:bd" : ""} ${i > 1 ? "border-t bd lg:border-t-0" : ""} ${i % 2 === 1 ? "border-s bd lg:border-s" : ""}`}>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <t.icon className="size-6" />
              </span>
              <span>
                <span className="block text-sm font-black">{heroSettings[`home.trust${i + 1}.title`] || t.title}</span>
                <span className="mt-0.5 block text-xs tdim">{heroSettings[`home.trust${i + 1}.description`] || t.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <CollectionShowcase
        accessories={d.accessories}
        modelCount={d.leatherCat?.count ?? d.modelCount}
      />

      {/* products (tabbed) */}
      {tabs.length > 0 && (
        <section className="border-y bd bg-ink-900/50 py-12 lg:py-20">
          <div className="container-x">
            <SectionHeading eyebrow="فروشگاه" title="محصولات پیشنهادی ما" desc="پرفروش‌ترین‌ها، منتخب تیم ۵۰۵۰۰ و تخفیف‌های فعال در یک نگاه" />
            <ProductTabs tabs={tabs} variant={theme} />
          </div>
        </section>
      )}

      {/* Admin-managed campaign banner. Date window and visibility are evaluated on the server. */}
      {heroSettings["home.promo.enabled"] !== "false" &&
        (!heroSettings["home.promo.starts_at"] || new Date(heroSettings["home.promo.starts_at"]).getTime() <= Date.now()) &&
        (!heroSettings["home.promo.ends_at"] || new Date(heroSettings["home.promo.ends_at"]).getTime() >= Date.now()) && (
      <section className="container-x py-12 lg:py-20">
        <div className="relative overflow-hidden rounded-[2rem] border border-brand-500/25 bg-linear-to-br from-brand-600/30 via-ink-850 to-ink-900 p-8 sm:p-12">
          <div className="dot-bg pointer-events-none absolute inset-0 opacity-30" />
          <div className="pointer-events-none absolute -end-16 -top-16 h-72 w-72 rounded-full bg-brand-500/30 blur-[100px]" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-3 py-1 text-xs font-black text-[#fff]">{heroSettings["home.promo.label"] || "پیشنهاد ویژه"}</span>
              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                {heroSettings["home.promo.title"] || "پیشنهاد ویژه ۵۰۵۰۰"} <span className="text-gradient">{heroSettings["home.promo.highlight"] || "تخفیف + ارسال"}</span>
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-8 tdim">{heroSettings["home.promo.description"] || "کد تخفیف را در مرحله پرداخت وارد کنید و محصولات مشمول پیشنهاد را ببینید."}</p>
              {heroSettings["home.promo.image"] && <div className="mt-4"><Image src={heroSettings["home.promo.image"]} alt={heroSettings["home.promo.label"] || "تصویر کمپین"} width={480} height={220} className="max-h-36 w-auto rounded-xl object-contain" unoptimized /></div>}
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              {heroSettings["home.promo.code"] && <CopyCode code={heroSettings["home.promo.code"]} variant={theme} />}
              <Link href={heroSettings["home.promo.href"] || "/products?discounted=1&sort=discount"} className="btn btn-primary w-full px-7 py-3.5 md:w-auto">
                {heroSettings["home.promo.button"] || "مشاهده کالاهای تخفیف‌دار"} <ArrowLeft className="size-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* shop by car type */}
      <section className="container-x pb-12 lg:pb-20">
        <SectionHeading eyebrow="خرید بر اساس خودرو" title="خودروی شما کدام است؟" desc="کفپوش اختصاصی تمام مدل‌های هر گروه را ببینید" center />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rail">
          {d.groups.map((g, i) => (
            <Reveal key={g.id} delay={i * 70} className="max-md:w-[78%] max-md:shrink-0 max-md:snap-start">
              <Link href={`/products?group=${g.id}`} className="group block h-full overflow-hidden rounded-3xl border bd bg-ink-850 transition hover:-translate-y-1 hover:border-brand-500/40">
                <span className="relative block h-44 overflow-hidden bg-ink-900">
                  <Image src={GROUP_IMAGES[g.id] ?? matUrl("black-red")} alt={g.name} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute end-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-[#fff] backdrop-blur">{fa(g.modelCount)} مدل</span>
                </span>
                <span className="block p-5 pt-3">
                  <span className="block text-lg font-black">{g.name}</span>
                  <span className="mt-1.5 line-clamp-2 block text-xs leading-6 tdim">{g.brandNames.join("، ")}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-300 transition-all group-hover:gap-3">
                    مشاهده کفپوش‌ها <ArrowLeft className="size-4" />
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="me-1 text-xs font-bold tdim">برندهای پرطرفدار:</span>
          {d.popularBrands.map((b) => (
            <Link key={b.slug} href={`/products?brand=${b.slug}`} className="chip">
              {b.name}
            </Link>
          ))}
        </div>
      </section>

      <Construction />

      {/* premium product spotlight — replaces repetitive comparison/cards */}
      <section className="product-spotlight relative isolate overflow-hidden border-y bd py-14 sm:py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 18% 50%, rgba(255,94,25,.22), transparent 30%), radial-gradient(circle at 85% 15%, rgba(255,255,255,.06), transparent 24%)" }} />
        <div className="container-x relative">
          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-5 rounded-[2.5rem] border border-brand-500/10" />
              <div className="absolute -inset-10 rounded-[3rem] border border-white/[0.04]" />
              <div className="product-spotlight-stage relative min-h-[300px] overflow-hidden rounded-[2rem] border sm:min-h-[440px]">
                <Image src="/api/site-image/mat-black-red" alt="تصویر کفپوش ۵۰۵۰۰" fill unoptimized priority={false} sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover transition duration-700 hover:scale-[1.04]" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                <div className="product-spotlight-label absolute bottom-5 start-5 rounded-2xl border px-4 py-3 backdrop-blur-md sm:bottom-7 sm:start-7">
                  <span className="block text-[10px] font-bold tracking-[.22em] text-brand-300">50500 / PRODUCT</span>
                  <span className="mt-1 block text-sm font-black text-white sm:text-base">محصولات ۵۰۵۰۰</span>
                </div>
                <div className="product-spotlight-badge absolute end-4 top-4 flex items-center gap-2 rounded-full border border-brand-400/30 px-3 py-2 text-xs font-bold backdrop-blur-md">
                  <span className="size-2 animate-pulse rounded-full bg-brand-400" /> طراحی برای کابین خودرو
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-300">
                <span className="font-english tracking-[.18em]">50500 / DESIGN</span>
                <span className="size-1 rounded-full bg-brand-400" />
                <span>نگاه نزدیک‌تر</span>
              </div>
              <h2 className="mt-5 text-3xl font-black leading-[1.35] sm:text-4xl lg:text-5xl">
                کف خودروی خود را با یک <span className="text-gradient">انتخاب درست</span> کامل کن.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-8 tdim sm:text-base">
                کفپوش هر روز زیر پای توست؛ پس ظاهر، نظافت و هماهنگی آن با فضای داخلی خودرو اهمیت دارد. مدل مناسب را پیدا کن، تصاویر واقعی محصول را ببین و مشخصات همان گزینه را پیش از خرید بررسی کن.
              </p>
              <div className="mt-7 space-y-4 border-y bd py-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-300"><Layers3 className="size-4" /></span>
                  <div><h3 className="text-sm font-black">تصاویر و مشخصات محصول</h3><p className="mt-1 text-xs leading-6 tdim">تصاویر و اطلاعات هر گزینه را بررسی کن؛ مشخصات دقیق در صفحه همان محصول درج می‌شود.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-300"><Droplets className="size-4" /></span>
                  <div><h3 className="text-sm font-black">انتخاب بر اساس نیاز تو</h3><p className="mt-1 text-xs leading-6 tdim">گزینه‌های رنگ و نوع محصول را فقط از بین تنوع‌های موجود انتخاب کن.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-300"><ShieldCheck className="size-4" /></span>
                  <div><h3 className="text-sm font-black">بررسی سازگاری پیش از خرید</h3><p className="mt-1 text-xs leading-6 tdim">مدل و تیپ خودرو را با مشخصات محصول تطبیق بده؛ در صورت ابهام از پشتیبانی کمک بگیر.</p></div>
                </div>
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/products" className="btn btn-primary justify-center px-6 py-3.5">دیدن محصولات <ArrowLeft className="size-5" /></Link>
                <Link href="/contact" className="btn justify-center border bd px-6 py-3.5">مشاوره پیش از خرید</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="container-x py-12 lg:py-20">
        <SectionHeading eyebrow="فرآیند سفارش" title="از انتخاب تا تحویل، فقط ۴ قدم" center />
        <ol className="rail rail-sm relative grid gap-6 md:grid-cols-4">
          <span className="pointer-events-none absolute inset-x-[12%] top-8 hidden h-px bg-linear-to-l from-transparent via-brand-500/40 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative text-center">
              <span className="relative mx-auto grid size-16 place-items-center rounded-2xl border bd bg-ink-800 text-brand-400 shadow-xl">
                <s.icon className="size-7" />
                <span className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full bg-brand-500 text-[11px] font-black text-[#fff] ring-4 ring-ink-950">{fa(i + 1)}</span>
              </span>
              <h3 className="mt-4 font-black">{s.title}</h3>
              <p className="mx-auto mt-1.5 max-w-[15rem] text-sm leading-7 tdim">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* reviews */}
      {d.testimonials.length > 0 && (
        <section className="border-y bd bg-ink-900/50 py-12 lg:py-20">
          <div className="container-x">
            <SectionHeading eyebrow="صدای مشتریان" title="رضایت مشتری، یک شعار نیست" />
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="surface rounded-3xl p-6">
                <p className="text-5xl font-black">۴٫۹</p>
                <div className="mt-2">
                  <Stars value={5} className="size-5" />
                </div>
                <p className="mt-2 text-xs tdim">میانگین امتیاز از ۱۲٬۴۰۰ نظر ثبت‌شده</p>
                <div className="mt-5 grid gap-2">
                  {RATING_BARS.map((r) => (
                    <div key={r.stars} className="flex items-center gap-3 text-xs tdim">
                      <span className="w-4 text-center">{fa(r.stars)}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full soft">
                        <span className="block h-full rounded-full bg-amber-400" style={{ width: `${r.pct}%` }} />
                      </span>
                      <span className="w-9 text-start">{fa(r.pct)}٪</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3 rail">
                {d.testimonials.map((t) => (
                  <figure key={t.id} className="surface spot flex h-full flex-col rounded-3xl p-5">
                    <div className="flex items-center justify-between">
                      <Stars value={t.rating} className="size-4" />
                      <Quote className="size-7 text-brand-500/30" />
                    </div>
                    <blockquote className="mt-3 line-clamp-6 flex-1 text-sm leading-8 tdim">{t.comment}</blockquote>
                    <figcaption className="mt-4 flex items-center gap-3 border-t bd pt-4">
                      <span className="grid size-10 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-700 text-sm font-black">{t.name.slice(0, 1)}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{t.name}</span>
                        <span className="block truncate text-xs tdim">{t.city}</span>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* blog */}
      <section className="container-x py-12 lg:py-20">
        <SectionHeading eyebrow="مجله ۵۰۵۰۰" title="خواندنی‌های دنیای خودرو" action={{ href: "/blog", label: "همه مقالات" }} />
        <div className="grid gap-4 md:grid-cols-3 rail">
          {blogPosts.slice(0, 3).map((p, i) => (
            <Reveal key={p.slug} delay={i * 80} className="max-md:w-[78%] max-md:shrink-0 max-md:snap-start">
              <Link href={`/blog/${p.slug}`} className="surface group block h-full overflow-hidden rounded-3xl transition hover:border-brand-500/30">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={p.cover} alt={p.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
                  <span className="glass absolute start-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold">{p.tag}</span>
                </div>
                <div className="p-5">
                  <p className="text-xs tdim">
                    {p.date} · {fa(p.readTime)} دقیقه مطالعه
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
          <article className="surface overflow-hidden rounded-[2rem] border bd lg:self-stretch">
            <div className="grid grid-cols-2 gap-2 p-3">
              <div className="relative min-h-[190px] overflow-hidden rounded-2xl bg-ink-800">
                <Image src="/images/industrial-sewing-machine.svg" alt="چرخ خیاطی صنعتی در کارگاه تولید" fill className="object-contain p-4" />
              </div>
              <div className="relative min-h-[190px] overflow-hidden rounded-2xl bg-ink-800">
                <Image src="/images/hero-workshop-50500.png" alt="نمای نزدیک فرایند تولید و دوخت کفپوش" fill className="object-cover" />
              </div>
            </div>
            <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
              <p className="text-[10px] font-bold tracking-[.18em] text-brand-400">FROM OUR WORKSHOP</p>
              <h2 className="mt-2 text-xl font-black leading-8 sm:text-2xl">جزئیات دوخت و کیفیت ساخت</h2>
              <p className="mt-2 text-sm leading-8 tdim">نمایی از فرایند تولید، دوخت صنعتی و پرداخت جزئیات کفپوش‌های ۵۰۵۰۰.</p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
