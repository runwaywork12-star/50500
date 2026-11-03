import type { Metadata } from "next";
import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, Award, Factory, HeartHandshake, Leaf, Ruler, Users } from "lucide-react";
import { CountUp, Reveal } from "@/components/store/Motion";
import { PageHero, SectionHeading } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "درباره ما" };

const VALUES = [
  { icon: Ruler, t: "دقت میلی‌متری", d: "قالب هر خودرو با اسکن لیزری سه‌بعدی تهیه می‌شود تا کفپوش بدون کوچک‌ترین فاصله روی کف بنشیند." },
  { icon: Award, t: "کیفیت بی‌چون‌وچرا", d: "رویه چرمی، فوم ۹ میلی‌متری، پارچه جودون و دوخت ریزبافت." },
  { icon: HeartHandshake, t: "مشتری در مرکز", d: "مشاوره رایگان، ۱۲ ماه گارانتی و تعویض بدون قید و شرط در صورت عدم تطابق." },
  { icon: Leaf, t: "مواد بی‌خطر", d: "مواد اولیه بدون بو و فاقد ترکیبات مضر؛ ایمن برای کودکان و سلامت خانواده." },
];

const TIMELINE = [
  { y: "۱۳۹۲", t: "شروع در یک کارگاه کوچک", d: "دوخت اولین کفپوش‌های چرمی سفارشی برای خودروهای داخلی." },
  { y: "۱۳۹۶", t: "راه‌اندازی خط اسکن لیزری", d: "تهیه قالب اختصاصی برای بیش از ۴۰ مدل خودرو." },
  { y: "۱۴۰۰", t: "گلدوزی صنعتی", d: "راه‌اندازی دستگاه‌های گلدوزی صنعتی برای طرح لوزی با نخ‌های ضد UV." },
  { y: "2026", t: "فروشگاه آنلاین ۵۰۵۰۰", d: "انتخاب آنلاین رنگ چرم و گلدوزی، ارسال به سراسر ایران و به‌زودی عرضه لوازم جانبی خودرو." },
];

export default async function AboutPage() {
  const settings = await getSettings();
  const values = [1,2,3,4].map((n,i) => ({
    icon: [Ruler, Award, HeartHandshake, Leaf][i],
    t: settings[`pages.about.value${n}.title`],
    d: settings[`pages.about.value${n}.description`],
  }));
  const timeline = [1,2,3,4].map((n) => ({
    y: settings[`pages.about.timeline${n}.year`],
    t: settings[`pages.about.timeline${n}.title`],
    d: settings[`pages.about.timeline${n}.description`],
  }));
  return (
    <>
      <PageHero
        eyebrow={settings["pages.about.eyebrow"]}
        title={settings["pages.about.title"]}
        desc={settings["pages.about.description"]}
      />
      <section className="container-x grid items-center gap-10 py-16 lg:grid-cols-2">
        <Reveal>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border bd">
            <Image src="/images/craft.jpg" alt="کارگاه تولید ۵۰۵۰۰" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0 scrim-grad-soft" />
            <div className="glass absolute bottom-5 start-5 flex items-center gap-3 rounded-2xl !bg-ink-900/60 p-3 pe-5">
              <Factory className="size-8 text-brand-400" />
              <div>
                <p className="text-sm font-black">۲,۴۰۰ متر مربع</p>
                <p className="text-[11px] tdim">فضای کارگاه تولید</p>
              </div>
            </div>
          </div>
        </Reveal>
        <div>
          <SectionHeading eyebrow="چرا ۵۰۵۰۰؟" title={settings["pages.about.story_title"]} />
          <p className="text-sm leading-8 tdim sm:text-base">{settings["pages.about.story_description"]}</p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { v: 52, s: " هزار", l: "مشتری راضی" },
              { v: 78, s: "+", l: "مدل خودرو" },
              { v: 45, s: " نفر", l: "همکار متخصص" },
            ].map((x) => (
              <div key={x.l} className="surface rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-brand-300">
                  <CountUp to={x.v} suffix={x.s} />
                </p>
                <p className="mt-1 text-xs tdim">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <Reveal key={v.t} delay={i * 80}>
              <div className="surface h-full rounded-3xl p-6">
                <v.icon className="size-9 text-brand-400" />
                <h3 className="mt-4 font-black">{v.t}</h3>
                <p className="mt-2 text-sm leading-7 tdim">{v.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-x pb-10">
        <SectionHeading eyebrow="مسیر ما" title="از یک کارگاه کوچک تا ۵۰ هزار مشتری" center />
        <div className="relative mx-auto grid max-w-3xl gap-6 before:absolute before:inset-y-0 before:start-5 before:w-px before:bg-linear-to-b before:from-brand-500 before:to-transparent">
          {timeline.map((t, i) => (
            <Reveal key={t.y} delay={i * 80} className="relative ps-16">
              <span className="absolute start-0 top-1 grid size-10 place-items-center rounded-full bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/40">
                <Users className="size-4" />
              </span>
              <div className="surface rounded-2xl p-5">
                <p className="text-sm font-black text-brand-300">{t.y}</p>
                <h3 className="mt-1 font-black">{t.t}</h3>
                <p className="mt-2 text-sm leading-7 tdim">{t.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/products" className="btn btn-primary px-7 py-4">
            مشاهده محصولات <ArrowLeft className="size-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
