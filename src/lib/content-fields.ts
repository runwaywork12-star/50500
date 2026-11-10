import { BLOG_POSTS } from "@/data/content";
import type { SiteContent } from "@/lib/site-content";

export const PAGE_COPY_FIELDS: Record<string, { eyebrow?: string; title?: string; description?: string; bodyTitle?: string; body?: string; bodySecondary?: string }> = {
  products: { title: "فروشگاه کفپوش چرمی گلدوزی", description: "کفپوش مناسب خودروی خود را انتخاب کنید؛ تصاویر، رنگ‌ها و مشخصات هر محصول را ببینید." },
  about: {
    eyebrow: "درباره 50500", title: "تولیدکننده تخصصی کفپوش چرمی گلدوزی خودرو",
    description: "از سال ۱۳۹۵ در کارگاه 50500، کفپوش هر خودرو را با اسکن سه‌بعدی قالب، به‌صورت اختصاصی می‌دوزیم و گلدوزی می‌کنیم.",
    bodyTitle: "داستان ما از یک کارگاه کوچک شروع شد",
    body: "بنیان‌گذاران 50500 با این باور که کفپوش هر خودرو باید اختصاصی باشد، کار خود را آغاز کردند.",
    bodySecondary: "همه محصولات در کارگاه خودمان دوخته می‌شوند: رویه چرمی، فوم ۹ میلی‌متری، پارچه جودون و گلدوزی دستی با نخ‌های رنگی، با هولوگرام اصالت و ۱۲ ماه گارانتی.",
  },
  contact: { eyebrow: "تماس با ما", title: "در کنار شما هستیم", description: "سؤالی درباره انتخاب کفپوش، رنگ‌ها یا پیگیری سفارش دارید؟ پیام بدهید؛ همان روز پاسخ می‌دهیم.", bodyTitle: "فرم تماس" },
  blog: { eyebrow: "مجله 50500", title: "مقالات آموزشی", description: "راهنمای انتخاب، مقایسه و نگهداری از کفپوش و روکش‌های چرمی خودرو" },
  cart: { eyebrow: "سبد خرید", title: "سبد خرید شما" },
  checkout: { eyebrow: "تسویه حساب", title: "تکمیل سفارش", description: "اطلاعات ارسال را وارد کنید و روش پرداخت را انتخاب کنید" },
  track: { eyebrow: "رهگیری سفارش", title: "پیگیری سفارش", description: "کد سفارش و شماره موبایل خود را وارد کنید تا وضعیت سفارش را ببینید." },
  login: { title: "ورود به حساب کاربری", description: "برای رهگیری سفارش‌ها و سریع‌تر خرید کردن وارد شوید." },
  register: { title: "ساخت حساب کاربری", description: "نام، ایمیل و موبایل کافی است؛ شماره موبایل برای رهگیری سفارش لازم است." },
  forgot: { title: "بازیابی رمز عبور" },
  account: { eyebrow: "50500 ACCOUNT" },
  order: { eyebrow: "جزئیات سفارش" },
  pay: { eyebrow: "پرداخت امن", description: "پرداخت در صفحه رسمی بانک (شاپرک) انجام می‌شود؛ اطلاعات کارت شما هرگز وارد این سایت نمی‌شود." },
};

export const IMAGE_SLOT_DEFINITIONS: Record<string, { id: string; label: string; fallback: string; alt: string }[]> = {
  home: [
    { id: "home.featured", label: "تصویر محصول اصلی در ویترین", fallback: "images/showcase/mat-podium-clean.webp", alt: "کفپوش 50500" },
    { id: "home.spotlight", label: "تصویر بخش نگاه نزدیک‌تر", fallback: "images/showcase/card-front-mat.jpg", alt: "کفپوش خودرو" },
    { id: "home.workshop", label: "تصویر کارگاه", fallback: "images/workshop/sewing-machine.jpg", alt: "کارگاه دوخت" },
    { id: "home.workshopDetail", label: "تصویر دوم کارگاه", fallback: "images/showcase/card-rear-mat.jpg", alt: "کفپوش خودرو" },
    { id: "home.group.domestic", label: "دسته خودروهای داخلی", fallback: "images/cars/domestic.jpg", alt: "خودروهای داخلی" },
    { id: "home.group.chinese", label: "دسته خودروهای چینی", fallback: "images/cars/chinese.jpg", alt: "خودروهای چینی" },
    { id: "home.group.asian", label: "دسته خودروهای کره‌ای و ژاپنی", fallback: "images/cars/asian.jpg", alt: "خودروهای کره‌ای و ژاپنی" },
    { id: "home.group.european", label: "دسته خودروهای اروپایی و آمریکایی", fallback: "images/cars/european.jpg", alt: "خودروهای اروپایی و آمریکایی" },
    { id: "home.collection.acc-wheel-cover", label: "تصویر ویترین روکش فرمان", fallback: "images/showcase/card-wheel-cover.jpg", alt: "روکش فرمان" },
    { id: "home.collection.acc-front-5d-mat", label: "تصویر ویترین کفپوش جلو", fallback: "images/showcase/card-front-mat.jpg", alt: "کفپوش جلو" },
    { id: "home.collection.acc-rear-antislip-mat", label: "تصویر ویترین کفپوش عقب", fallback: "images/showcase/card-rear-mat.jpg", alt: "کفپوش عقب" },
    { id: "home.collection.acc-seat-belt", label: "تصویر ویترین روکش کمربند", fallback: "images/showcase/card-seatbelt-pads.jpg", alt: "روکش کمربند" },
  ],
  about: [{ id: "about.main", label: "تصویر داستان و کارگاه", fallback: "images/showcase/card-front-mat.jpg", alt: "کارگاه 50500" }],
  contact: [{ id: "contact.main", label: "تصویر صفحه تماس", fallback: "images/hero-mat.webp", alt: "فروشگاه 50500" }],
  login: [{ id: "auth.background", label: "تصویر صفحات ورود و ثبت‌نام", fallback: "images/hero-mat.webp", alt: "" }],
  register: [{ id: "auth.background", label: "تصویر صفحات ورود و ثبت‌نام", fallback: "images/hero-mat.webp", alt: "" }],
  forgot: [{ id: "auth.background", label: "تصویر صفحات ورود و ثبت‌نام", fallback: "images/hero-mat.webp", alt: "" }],
};

export function managedArticles(content: SiteContent) {
  return BLOG_POSTS.map((article) => {
    const edit = content.articles?.[article.slug];
    return {
      ...article,
      ...edit,
      image: edit?.image || article.image,
      imageAlt: edit?.imageAlt || edit?.title || article.title,
      body: edit?.body ?? article.body,
    };
  });
}