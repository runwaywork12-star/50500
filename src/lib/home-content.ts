import { BadgeCheck, Car, Factory, Fingerprint, Headset, Palette, Ruler, ShieldCheck, Truck, type LucideIcon } from "lucide-react";

export type IconItem = { icon: LucideIcon; title: string; desc: string };

/** Slim trust strip shown right under the hero. */
export const TRUST: IconItem[] = [
  { icon: ShieldCheck, title: "۱۲ ماه گارانتی", desc: "تعویض بدون قید و شرط" },
  { icon: Truck, title: "ارسال رایگان", desc: "برای خریدهای بالای ۵ میلیون" },
  { icon: Ruler, title: "اسکن سه‌بعدی", desc: "فیت دقیق کف هر خودرو" },
  { icon: Headset, title: "مشاوره رایگان", desc: "کمک در انتخاب رنگ و طرح" },
];

export type CompareRow = { feature: string; good: string; bad: string };

/** Honest 50500-vs-ordinary-mat comparison shown on the home page. */
export const COMPARE: CompareRow[] = [
  { feature: "قالب", good: "اختصاصی هر خودرو با اسکن سه‌بعدی", bad: "قالب عمومی؛ لق می‌زند" },
  { feature: "دوخت", good: "دوخت ریزبافت و پرداخت ظریف", bad: "چاپی یا بدون دوخت" },
  { feature: "ساختار", good: "کفپوش چرمی چهارلایه با فوم ۹ میلی‌متری و پارچه جودون", bad: "ساختار نامشخص" },
  { feature: "لبه‌ها", good: "لبه بلند ۱۲ سانتی", bad: "بدون لبه؛ آب به موکت می‌رسد" },
  { feature: "گارانتی", good: "۱۲ ماه تعویض بی‌قیدوشرط", bad: "بدون گارانتی" },
  { feature: "اصالت", good: "هولوگرام + کارت گارانتی", bad: "نامشخص" },
];

export const STEPS: IconItem[] = [
  { icon: Car, title: "انتخاب خودرو", desc: "برند و مدل خودروی خود را انتخاب کنید" },
  { icon: Palette, title: "انتخاب رنگ", desc: "رنگ چرم و رنگ گلدوزی را مشخص کنید" },
  { icon: Factory, title: "تولید اختصاصی", desc: "ظرف ۴ تا ۷ روز کاری دوخته و گلدوزی می‌شود" },
  { icon: Truck, title: "ارسال به سراسر ایران", desc: "با بسته‌بندی ویژه و کد رهگیری" },
];

export const FAQ = [
  { q: "آیا می‌توانم رنگ چرم و رنگ گلدوزی را خودم انتخاب کنم؟", a: "بله؛ در صفحه هر محصول از بین ۷ رنگ چرم و ۸ رنگ نخ گلدوزی، ترکیب دلخواه خود را انتخاب می‌کنید و نمونه رنگ را همان‌جا می‌بینید. طرح گلدوزی همه کفپوش‌ها لوزی (الماسی) است." },
  { q: "زمان تولید و ارسال سفارش چقدر است؟", a: "کفپوش‌های چرمی گلدوزی به دلیل تولید سفارشی ظرف ۴ تا ۷ روز کاری آماده می‌شوند و با پست پیشتاز یا تیپاکس به سراسر کشور ارسال می‌شوند." },
  { q: "آیا کفپوش دقیقاً اندازه خودروی من است؟", a: "بله. قالب هر خودرو با اسکن سه‌بعدی تهیه شده و کفپوش کاملاً فیت کف خودرو دوخته می‌شود. در صورت عدم تطابق، بدون قید و شرط تعویض می‌شود." },
  { q: "شرایط گارانتی و مرجوعی چگونه است؟", a: "تمامی کفپوش‌ها ۱۲ ماه گارانتی کیفیت دارند. در صورت هرگونه ایراد در تولید یا عدم تطابق با خودرو، محصول بدون هزینه تعویض یا مرجوع می‌شود." },
  { q: "آیا امکان پرداخت در محل وجود دارد؟", a: "بله؛ علاوه بر پرداخت اینترنتی، امکان پرداخت در محل با کارتخوان هنگام تحویل سفارش نیز وجود دارد." },
];

/** Brands highlighted on the home page (the rest are reachable through the car finder). */
export const POPULAR_BRANDS = [
  "iran-khodro", "peugeot", "saipa", "toyota", "hyundai", "kia", "bmw", "benz",
  "chery", "mvm", "nissan", "mazda", "renault", "jac", "haima", "kmc",
];

/** Per-group cover for "خودروی شما کدام است" — real car silhouettes (high-res, no mats). */
export const GROUP_IMAGES: Record<string, string> = {
  domestic: "/images/cars/domestic.jpg",
  chinese: "/images/cars/chinese.jpg",
  asian: "/images/cars/asian.jpg",
  european: "/images/cars/european.jpg",
};

/** Rating distribution shown in the reviews summary. */
export const RATING_BARS = [
  { stars: 5, pct: 88 },
  { stars: 4, pct: 9 },
  { stars: 3, pct: 2 },
  { stars: 2, pct: 1 },
  { stars: 1, pct: 0 },
];
