import { ArrowLeft, Check, Palette, Scissors, ShieldCheck, Tag, Truck } from "lucide-react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { img } from "@/lib/images";
import styles from "./Spotlight.module.css";

/* ------------------------------------------------------------------ *
 * "نگاه نزدیک‌تر" — product spotlight + workshop card.
 * Spotlight layout follows the supplied reference: warm charcoal panel,
 * copy on the left, mat photo on the right with floating badges.
 * ------------------------------------------------------------------ */

const STEPS = [
  {
    icon: Tag,
    title: "انتخاب خودرو",
    desc: "برند و مدل را از فایندر بالای صفحه یا فروشگاه انتخاب کن تا محصولات مرتبط به خودرویت نمایش داده شود.",
  },
  {
    icon: Palette,
    title: "انتخاب رنگ چرم و نخ گلدوزی",
    desc: "از ۷ رنگ چرم و ۸ رنگ نخ، ترکیب دلخواه خود را با پیش‌نمایش زنده بساز؛ گلدوزی لوگوی خودروی روی کفپوش راننده رایگان است.",
  },
  {
    icon: Truck,
    title: "تولید اختصاصی و ارسال",
    desc: "کفپوش ظرف ۴ تا ۷ روز کاری دوخته، کنترل کیفیت و با کد رهگیری ارسال می‌شود؛ ۱۲ ماه گارانتی تعویض دارد.",
  },
];

export function Spotlight() {
  return (
    <section className={styles.section} aria-labelledby="spotlight-title">
      <div className="container-x">
        <div className={styles.panel}>
          <div className={styles.grid}>
            {/* ---------- photo (right column in RTL) ---------- */}
            <div className={styles.media}>
              <img
                src={img("images/showcase/card-front-mat.jpg")}
                alt="کفپوش چرمی گلدوزی پنج‌بعدی 50500 روی کف کابین خودرو"
                className={styles.mediaImg}
              />
              <span className={styles.mediaShade} aria-hidden="true" />

              <span className={styles.topBadge}>
                <span className={styles.topBadgeDot} aria-hidden="true" />
                طراحی برای کابین خودرو
              </span>

              <div className={styles.productCard}>
                <span className={styles.productCardTop}>
                  PRODUCT / <b dir="ltr">50500</b>
                </span>
                <span className={styles.productCardTitle}>محصولات 50500</span>
              </div>
            </div>

            {/* ---------- copy (left column in RTL) ---------- */}
            <div className={styles.copy}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowEn}>50500 / PRODUCT</span>
                <span className={styles.eyebrowSep}>•</span>
                <span>نگاه نزدیک‌تر</span>
              </span>

              <h2 id="spotlight-title" className={styles.heading}>
                کفپوش اختصاصی <span className={styles.accent}>دقیقاً برای</span>
                <br />
                خودروی شما <span className={styles.accent}>— اسکن،</span>
                <br />
                انتخاب رنگ، تولید
              </h2>

              <p className={styles.lede}>
                کفپوش 50500 فقط یک محصول نیست؛ یک سفارش شخصی است. قالب هر خودرو با اسکن سه‌بعدی
                گرفته می‌شود، رنگ چرم و نخ گلدوزی را خودت انتخاب می‌کنی و ظرف ۴ تا ۷ روز کاری در
                کارگاه دوخته و ارسال می‌شود.
              </p>

              <div className={styles.rows}>
                {STEPS.map((step) => (
                  <div key={step.title} className={styles.row}>
                    <span className={styles.iconTile}>
                      <step.icon strokeWidth={1.7} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{step.title}</span>
                      <span className={styles.rowDesc}>{step.desc}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <Link href="/products" className={styles.primary}>
                  <span>دیدن محصولات</span>
                  <ArrowLeft className={styles.primaryArrow} />
                </Link>
                <Link href="/contact" className={styles.ghost}>
                  ارتباط با ما
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WorkshopCard() {
  return (
    <article className="surface overflow-hidden rounded-[2rem] border bd lg:self-stretch">
      {/* real leather-craft photography */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="relative min-h-[200px] overflow-hidden rounded-2xl bg-ink-800">
          <img
            src={img("images/workshop/sewing-machine.jpg")}
            alt="دوخت چرم با چرخ خیاطی صنعتی در کارگاه"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="relative min-h-[200px] overflow-hidden rounded-2xl bg-ink-800">
          <img
            src={img("images/showcase/card-rear-mat.jpg")}
            alt="کفپوش چرمی صندوق عقب 50500"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
        <p className="text-[10px] font-bold tracking-[.18em] text-brand-400">FROM OUR WORKSHOP</p>
        <h2 className="mt-2 text-xl font-black leading-8 sm:text-2xl">از قالب‌بری تا بسته‌بندی</h2>
        <p className="mt-2 text-sm leading-8 tdim">
          هر سفارش پس از انتخاب خودرو و رنگ، در کارگاه 50500 برش، گلدوزی و کنترل می‌شود؛
          سپس با کارت گارانتی و بسته‌بندی ویژه ارسال می‌گردد.
        </p>

        <ul className="mt-4 grid gap-2.5">
          {[
            "برش بر اساس قالب اسکن‌شده‌ی خودروی شما",
            "گلدوزی لوزی با نخ ضدپرز در ۸ رنگ",
            "کنترل چسب، لبه‌دوزی و تمیزی دوخت پیش از ارسال",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[13px] leading-7 tdim">
              <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-400">
                <Check className="size-3" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border bd p-3 text-center soft">
          <div>
            <p className="text-base font-black text-brand-400">+۱۵۰</p>
            <p className="mt-1 text-[11px] tdim">قالب خودرو</p>
          </div>
          <div>
            <p className="text-base font-black text-brand-400">۴–۷</p>
            <p className="mt-1 text-[11px] tdim">روز تولید</p>
          </div>
          <div>
            <p className="text-base font-black text-brand-400">۱۲ ماه</p>
            <p className="mt-1 text-[11px] tdim">گارانتی کیفیت</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-brand-500/25 bg-brand-500/10 px-4 py-3">
          <span className="flex items-center gap-2 text-[12px] font-bold text-brand-300">
            <ShieldCheck className="size-4" /> تعویض بی‌قیدوشرط در صورت عدم تطابق اندازه
          </span>
        </div>

        <Link href="/about" className="btn btn-ghost mt-4 w-full justify-center px-5 py-3 text-sm">
          <Scissors className="size-4" /> آشنایی با کارگاه 50500
        </Link>
      </div>
    </article>
  );
}
