import type { LucideIcon } from "lucide-react";
import {
 Car,
 Factory,
 Headset,
 Palette,
 Ruler,
 ShieldCheck,
 Truck,
} from "lucide-react";
import { img } from "@/lib/images";
import { BLOG_IMAGES } from "@/lib/blog-images";

export type Swatch = { id: string; name: string; hex: string };

/** Natural leather tones (nano PU leather). */
export const LEATHER_COLORS: Swatch[] = [
 { id: "black", name: "مشکی", hex: "#1f1f21" },
 { id: "tan", name: "عسلی", hex: "#9a6337" },
 { id: "cream", name: "کرم", hex: "#d6c3a0" },
 { id: "gray", name: "طوسی", hex: "#6b6d71" },
 { id: "burgundy", name: "زرشکی", hex: "#5e1b26" },
 { id: "navy", name: "سرمه‌ای", hex: "#1f2940" },
];

/** Embroidery thread colours. */
export const THREAD_COLORS: Swatch[] = [
 { id: "red", name: "قرمز", hex: "#c62a32" },
 { id: "orange", name: "نارنجی", hex: "#e2711d" },
 { id: "gold", name: "طلایی", hex: "#c9a043" },
 { id: "cream", name: "کرم", hex: "#e8d9b5" },
 { id: "brown", name: "قهوه‌ای", hex: "#7a4e2d" },
 { id: "white", name: "سفید", hex: "#f2f1ed" },
 { id: "blue", name: "آبی", hex: "#2f67c8" },
 { id: "black", name: "مشکی", hex: "#161617" },
];

export type CarGroup = {
 id: string;
 name: string;
 shortName: string;
 brands: string[];
 image: string;
 imageAlt?: string;
 imageCredit?: string;
};

export const CAR_GROUPS: CarGroup[] = [
 { id: "domestic", name: "خودروهای داخلی", shortName: "داخلی", brands: ["iran-khodro", "peugeot", "saipa", "renault", "rega-copa"], image: img("images/cars/domestic.jpg"), imageAlt: "دنا پلاس ایران خودرو، نمونه خودروی ایرانی", imageCredit: "IKCO Dena Plus | Jeeputer, Wikimedia Commons | CC BY-SA 4.0 | Background adapted" },
 { id: "chinese", name: "خودروهای چینی", shortName: "چینی", brands: ["kmc", "mvm", "chery", "jac", "mg", "geely", "haima", "brilliance", "lifan", "greatwall", "changan", "dongfeng", "faw", "capra", "byd", "swm", "baic", "bisu"], image: img("images/cars/chinese.jpg"), imageAlt: "چری تیگو ۸ پرو، نمونه خودروی چینی", imageCredit: "Chery Tiggo 8 Pro PHEV | User3204, Wikimedia Commons | CC BY-SA 4.0 | Background adapted" },
 { id: "asian", name: "خودروهای کره‌ای و ژاپنی", shortName: "کره‌ای و ژاپنی", brands: ["toyota", "hyundai", "kia", "mazda", "nissan", "suzuki", "ssangyong", "lexus", "honda", "daewoo", "infiniti", "subaru", "mitsubishi", "landmark"], image: img("images/cars/asian.jpg"), imageAlt: "هیوندای آزرا گرنجور، نمونه خودروی کره‌ای", imageCredit: "Hyundai Grandeur (Azera) | Hyundai Motor Group, Pexels | Background adapted" },
 { id: "european", name: "خودروهای اروپایی و آمریکایی", shortName: "اروپایی و آمریکایی", brands: ["benz", "volkswagen", "bmw", "citroen", "porsche", "audi", "volvo", "maserati", "dodge"], image: img("images/cars/european.jpg"), imageAlt: "دوج چلنجر SRT، نمونه خودروی آمریکایی", imageCredit: "Dodge Challenger SRT | MOHAMAD ALOUL, Pexels | Background adapted" },
];

export function carGroupById(id: string | undefined): CarGroup | undefined {
 return CAR_GROUPS.find((g) => g.id === id);
}

export const FREE_SHIPPING_THRESHOLD = 5000000;

export const SHIPPING_METHODS = [
 { id: "post", name: "پست پیشتاز", desc: "۲ تا ۴ روز کاری پس از تولید", cost: 120000, freeOver: FREE_SHIPPING_THRESHOLD as number | null },
 { id: "tipax", name: "تیپاکس (پس‌کرایه)", desc: "ارسال سریع؛ هزینه هنگام تحویل پرداخت می‌شود", cost: 0, freeOver: null as number | null },
 { id: "pickup", name: "تحویل حضوری", desc: "دفتر فروش 50500 — تهران، بزرگراه جلال آل‌احمد", cost: 0, freeOver: null as number | null },
];

export function shippingCost(methodId: string, amount: number): number {
 const method = SHIPPING_METHODS.find((m) => m.id === methodId);
 if (!method) return 0;
 if (method.freeOver !== null && amount >= method.freeOver) return 0;
 return method.cost;
}

export const PAYMENT_METHODS = [
 { id: "online", name: "پرداخت اینترنتی", desc: "پرداخت امن با تمام کارت‌های عضو شتاب" },
 { id: "cod", name: "پرداخت در محل", desc: "پرداخت با کارتخوان هنگام تحویل سفارش" },
];

export const ORDER_STATUSES = [
 { id: "pending", name: "در انتظار تایید", tone: "amber" },
 { id: "confirmed", name: "تایید شد", tone: "blue" },
 { id: "producing", name: "در حال تولید", tone: "violet" },
 { id: "shipped", name: "ارسال شد", tone: "cyan" },
 { id: "delivered", name: "تحویل داده شد", tone: "green" },
 { id: "cancelled", name: "لغو شد", tone: "rose" },
];

export const COUPONS: Record<string, { percent: number; label: string }> = {
 "50500": { percent: 10, label: "کد 50500 — ۱۰٪ تخفیف" },
 WELCOME: { percent: 15, label: "کد WELCOME — ۱۵٪ تخفیف خوش‌آمدگویی" },
};

/* --- accessories catalogue --- */
export type Accessory = {
 slug: string;
 title: string;
 price: number;
 comparePrice: number | null;
 stock: number;
 image: string;
 rating: number;
 ratingCount: number;
 salesCount: number;
 featured: boolean;
 delivery: string;
 body: string;
 specs: { label: string; value: string }[];
};

export const ACCESSORIES: Accessory[] = [
 {
  slug: "acc-steering-lock",
  title: "قفل فرمان ضدسرقت دوقلاب",
  price: 1450000,
  comparePrice: 1750000,
  stock: 120,
  image: img("images/accessories/steering-lock.svg"),
  rating: 4.8,
  ratingCount: 212,
  salesCount: 1640,
  featured: true,
  delivery: "۱ تا ۳ روز کاری",
  body: "قفل فرمان فولادی با دو قلاب قابل تنظیم و قفل سیلندری مقاوم؛ روی همه فرمان‌ها بسته می‌شود و یک مانع دیداری جدی برای سارقان است. دارای پوشش لاستیکی برای جلوگیری از خط افتادن فرمان.",
  specs: [
   { label: "جنس", value: "فولاد آلیاژی" },
   { label: "طول قابل تنظیم", value: "۳۶ تا ۸۴ سانتی‌متر" },
   { label: "کلید", value: "۲ عدد" },
   { label: "گارانتی", value: "۱۲ ماه" },
  ],
 },
 {
  slug: "acc-pedal-lock",
  title: "قفل پدال ترمز و کلاچ",
  price: 1250000,
  comparePrice: null,
  stock: 120,
  image: img("images/accessories/pedal-lock.svg"),
  rating: 4.7,
  ratingCount: 148,
  salesCount: 1180,
  featured: true,
  delivery: "۱ تا ۳ روز کاری",
  body: "قفل پدال U شکل از جنس استیل ضدزنگ که پدال ترمز یا کلاچ را کاملاً بی‌حرکت می‌کند؛ نصب با یک دست و در چند ثانیه، مناسب بیشتر خودروهای سواری و شاسی‌بلند.",
  specs: [
   { label: "جنس", value: "استیل ضدزنگ" },
   { label: "مناسب پدال", value: "۱۰ تا ۱۶ سانتی‌متر" },
   { label: "کلید", value: "۳ عدد" },
   { label: "گارانتی", value: "۱۲ ماه" },
  ],
 },
  {
    slug: "acc-wheel-cover",
    title: "روکش دور فرمان چرمی مشکی",
    price: 899000,
    comparePrice: 1050000,
    stock: 120,
    image: img("images/showcase/card-wheel-cover.jpg"),
    rating: 4.8,
    ratingCount: 265,
    salesCount: 2100,
    featured: true,
    delivery: "۱ تا ۳ روز کاری",
    body: "روکش دور فرمان از چرم درجه یک با دوخت ظریف نارنجی و لایه سیلیکونی ضدلغزش؛ گرفتن فرمان را نرم‌تر و مطمئن‌تر می‌کند و از فرسودگی فرمان اصلی جلوگیری می‌کند.",
    specs: [
      { label: "جنس", value: "چرم درجه یک" },
      { label: "دوخت", value: "دوخت ظریف" },
      { label: "قطر مناسب", value: "۳۷ تا ۳۹ سانتی‌متر" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-front-5d-mat",
    title: "کفپوش چرم پنج بعدی جلو",
    price: 399000,
    comparePrice: 490000,
    stock: 95,
    image: img("images/showcase/card-front-mat.jpg"),
    rating: 4.9,
    ratingCount: 194,
    salesCount: 1780,
    featured: true,
    delivery: "۲ تا ۴ روز کاری",
    body: "کفپوش چرم پنج‌بعدی تکی جلو با دوخت مقاوم لوزی، پد زیرپایی ضدسایش و لبه‌های بلند محافظ موکت خودرو.",
    specs: [
      { label: "دوخت", value: "دوخت مقاوم لوزی" },
      { label: "ساختار", value: "چهارلایه با لبه‌های بلند" },
      { label: "مقاومت", value: "ضد آب و ضد خش" },
      { label: "گارانتی", value: "۱۲ ماه" },
    ],
  },
  {
    slug: "acc-rear-antislip-mat",
    title: "کفپوش مشکی ضدلغزش عقب",
    price: 499000,
    comparePrice: 590000,
    stock: 110,
    image: img("images/showcase/card-rear-mat.jpg"),
    rating: 4.8,
    ratingCount: 162,
    salesCount: 1490,
    featured: true,
    delivery: "۲ تا ۴ روز کاری",
    body: "کفپوش چرمی مشکی ضدلغزش عقب و صندوق با پوشش کامل سطح کف، دوخت لوزی مقاوم و شست‌وشوی سریع.",
    specs: [
      { label: "پوشش", value: "پوشش کامل یکپارچه" },
      { label: "لایه زیرین", value: "ضد لغزش" },
      { label: "ضد آب", value: "بله" },
      { label: "گارانتی", value: "۱۲ ماه" },
    ],
  },
 {
  slug: "acc-wheel-cover-brown",
  title: "روکش دور فرمان چرم قهوه‌ای",
  price: 950000,
  comparePrice: null,
  stock: 120,
  image: img("images/accessories/wheel-cover-brown.svg"),
  rating: 4.7,
  ratingCount: 98,
  salesCount: 760,
  featured: false,
  delivery: "۱ تا ۳ روز کاری",
  body: "روکش فرمان چرم میکروفایبر قهوه‌ای با دوخت ظریف؛ هماهنگ با کفپوش‌های قهوه‌ای و کرم 50500.",
  specs: [
   { label: "جنس", value: "چرم میکروفایبر" },
   { label: "قطر مناسب", value: "۳۸ سانتی‌متر" },
   { label: "رنگ", value: "قهوه‌ای" },
   { label: "گارانتی", value: "۶ ماه" },
  ],
 },
 {
  slug: "acc-gap-organizer",
  title: "نظم‌دهنده چرمی کنار صندلی",
  price: 980000,
  comparePrice: 1150000,
  stock: 120,
  image: img("images/accessories/gap-organizer.svg"),
  rating: 4.7,
  ratingCount: 132,
  salesCount: 980,
  featured: false,
  delivery: "۱ تا ۳ روز کاری",
  body: "پرکننده فاصله صندلی و کنسول با روکش چرم و جای لیوان؛ از افتادن موبایل، کلید و کارت جلوگیری می‌کند.",
  specs: [
   { label: "جنس", value: "چرم PU + ABS" },
   { label: "ابعاد", value: "۲۷ × ۱۴ × ۶ سانتی‌متر" },
   { label: "نصب", value: "بدون ابزار" },
   { label: "گارانتی", value: "۶ ماه" },
  ],
 },
 {
  slug: "acc-neck-pillow",
  title: "ست کوسن گردنی و کمری چرمی",
  price: 1450000,
  comparePrice: 1700000,
  stock: 120,
  image: img("images/accessories/neck-pillow.svg"),
  rating: 4.8,
  ratingCount: 121,
  salesCount: 690,
  featured: false,
  delivery: "۱ تا ۳ روز کاری",
  body: "ست کوسن گردنی و کمری با فوم مموری و روکش چرم؛ خستگی سفرهای طولانی را کم می‌کند.",
  specs: [
   { label: "تعداد", value: "۲ عدد" },
   { label: "داخل", value: "فوم مموری" },
   { label: "روکش", value: "چرم قابل شستشو" },
   { label: "گارانتی", value: "۶ ماه" },
  ],
 },
  {
    slug: "acc-seat-belt",
    title: "روکش چرمی کمربند ایمنی (جفت)",
    price: 299000,
    comparePrice: 390000,
    stock: 120,
    image: img("images/showcase/card-seatbelt-pads.jpg"),
    rating: 4.8,
    ratingCount: 142,
    salesCount: 1520,
    featured: true,
    delivery: "۱ تا ۳ روز کاری",
    body: "روکش شانه کمربند ایمنی از چرم نرم با دوخت لوکس لوزی و لبه نارنجی؛ راحتی بیشتر در رانندگی و مانع ساییدگی گردن و شانه می‌شود.",
    specs: [
      { label: "تعداد", value: "جفت (۲ عدد)" },
      { label: "دوخت", value: "دوخت لوکس لوزی" },
      { label: "بستن", value: "چسب پارچه‌ای مقاوم" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
 {
  slug: "acc-trunk-organizer",
  title: "نظم‌دهنده تاشو صندوق عقب",
  price: 2600000,
  comparePrice: 2950000,
  stock: 120,
  image: img("images/accessories/trunk-organizer.svg"),
  rating: 4.8,
  ratingCount: 96,
  salesCount: 640,
  featured: true,
  delivery: "۱ تا ۳ روز کاری",
  body: "نظم‌دهنده تاشو چرمی صندوق عقب با درب مغناطیسی و دسته‌های حمل؛ خرید و وسایل را مرتب نگه می‌دارد.",
  specs: [
   { label: "ظرفیت", value: "۴۰ لیتر" },
   { label: "جنس", value: "چرم اکو + پارچه ضدآب" },
   { label: "درب", value: "مغناطیسی" },
   { label: "گارانتی", value: "۶ ماه" },
  ],
 },
 {
  slug: "acc-trunk-organizer-suede",
  title: "جعبه صندوق عقب جیر لوکس",
  price: 2950000,
  comparePrice: null,
  stock: 120,
  image: img("images/accessories/trunk-organizer-2.svg"),
  rating: 4.7,
  ratingCount: 54,
  salesCount: 310,
  featured: false,
  delivery: "۱ تا ۳ روز کاری",
  body: "جعبه صندوق عقب با روکش جیر طوسی و پارتیشن‌های قابل جابجایی؛ ظرفیت بالا و تاشو.",
  specs: [
   { label: "جنس", value: "جیر مصنوعی" },
   { label: "پارتیشن", value: "قابل جداسازی" },
   { label: "تاشو", value: "بله" },
   { label: "گارانتی", value: "۶ ماه" },
  ],
 },
 {
  slug: "acc-seat-back",
  title: "نظم‌دهنده چرمی پشت صندلی",
  price: 1250000,
  comparePrice: 1450000,
  stock: 120,
  image: img("images/accessories/seat-organizer.svg"),
  rating: 4.6,
  ratingCount: 77,
  salesCount: 520,
  featured: false,
  delivery: "۱ تا ۳ روز کاری",
  body: "نظم‌دهنده پشت صندلی با جیب‌های متعدد و جای تبلت؛ پشت صندلی را از ضربه پای کودکان حفظ می‌کند.",
  specs: [
   { label: "جنس", value: "چرم PU" },
   { label: "جیب", value: "۶ جیب" },
   { label: "نصب", value: "بند به پشت‌سری" },
   { label: "گارانتی", value: "۶ ماه" },
  ],
 },
 {
  slug: "acc-armrest-organizer",
  title: "کیف چرمی دسته صندلی (آرنج‌گیر)",
  price: 1150000,
  comparePrice: null,
  stock: 120,
  image: img("images/accessories/armrest-organizer.svg"),
  rating: 4.7,
  ratingCount: 63,
  salesCount: 410,
  featured: false,
  delivery: "۱ تا ۳ روز کاری",
  body: "کیف ۵ کاره روی آرنج‌گیر با جای لیوان و دستمال؛ کنسول وسط را مرتب و شیک می‌کند.",
  specs: [
   { label: "جنس", value: "چرم مصنوعی" },
   { label: "کاربرد", value: "۵ کاره" },
   { label: "رنگ", value: "کرم" },
   { label: "گارانتی", value: "۶ ماه" },
  ],
 },
 {
  slug: "acc-key-case",
  title: "کیف چرمی سوئیچ خودرو",
  price: 390000,
  comparePrice: null,
  stock: 120,
  image: img("images/accessories/key-case.svg"),
  rating: 4.7,
  ratingCount: 188,
  salesCount: 1900,
  featured: false,
  delivery: "۱ تا ۳ روز کاری",
  body: "کیف سوئیچ از چرم با قفل داخلی؛ از سوئیچ در برابر ضربه و خط محافظت می‌کند.",
  specs: [
   { label: "جنس", value: "چرم PU" },
   { label: "مناسب", value: "بیشتر سوئیچ‌ها" },
   { label: "گارانتی", value: "۳ ماه" },
  ],
 },
];

/* --- mat photo slots (local images) --- */
export const MAT_SLOTS = [
 { key: "black", leather: "black", thread: "white", label: "مشکی · دوخت طوسی", image: img("images/products/mat-black.webp") },
 { key: "cream", leather: "cream", thread: "cream", label: "کرم · دوخت هم‌رنگ", image: img("images/products/mat-cream.webp") },
];

export const MAT_IMAGES = MAT_SLOTS.map((s) => s.image);

export function rotatedMatImages(n: number): string[] {
 const k = ((n % MAT_IMAGES.length) + MAT_IMAGES.length) % MAT_IMAGES.length;
 return [...MAT_IMAGES.slice(k), ...MAT_IMAGES.slice(0, k)];
}

export function matSlotIndex(leather: string): number {
 return leather === "cream" || leather === "tan" ? 1 : 0;
}

/** Pick the closest mat photo for a leather/thread combo. */
export function matImageFor(leather: string, _thread?: string): string {
 return MAT_SLOTS[matSlotIndex(leather)].image;
}

/* --- homepage content --- */
export type IconItem = { icon: LucideIcon; title: string; desc: string };

export const TRUST: IconItem[] = [
 { icon: ShieldCheck, title: "۱۲ ماه گارانتی", desc: "تعویض بدون قید و شرط" },
 { icon: Truck, title: "ارسال رایگان", desc: "برای خریدهای بالای ۵ میلیون" },
 { icon: Ruler, title: "اسکن سه‌بعدی", desc: "فیت دقیق کف هر خودرو" },
 { icon: Headset, title: "مشاوره رایگان", desc: "کمک در انتخاب رنگ و طرح" },
];

export const COMPARE = [
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
 { q: "آیا می‌توانم رنگ چرم و رنگ گلدوزی را خودم انتخاب کنم؟", a: "بله؛ در صفحه هر محصول از بین ۶ رنگ چرم و ۸ رنگ نخ گلدوزی، ترکیب دلخواه خود را انتخاب می‌کنید و نمونه رنگ را همان‌جا می‌بینید. طرح گلدوزی همه کفپوش‌ها لوزی (الماسی) است." },
 { q: "زمان تولید و ارسال سفارش چقدر است؟", a: "کفپوش‌های چرمی گلدوزی به دلیل تولید سفارشی ظرف ۴ تا ۷ روز کاری آماده می‌شوند و با پست پیشتاز یا تیپاکس به سراسر کشور ارسال می‌شوند." },
 { q: "آیا کفپوش دقیقاً اندازه خودروی من است؟", a: "بله. قالب هر خودرو با اسکن سه‌بعدی تهیه شده و کفپوش کاملاً فیت کف خودرو دوخته می‌شود. در صورت عدم تطابق، بدون قید و شرط تعویض می‌شود." },
 { q: "شرایط گارانتی و مرجوعی چگونه است؟", a: "تمامی کفپوش‌ها ۱۲ ماه گارانتی کیفیت دارند. در صورت هرگونه ایراد در تولید یا عدم تطابق با خودرو، محصول بدون هزینه تعویض یا مرجوع می‌شود." },
 { q: "آیا امکان پرداخت در محل وجود دارد؟", a: "بله؛ علاوه بر پرداخت اینترنتی، امکان پرداخت در محل با کارتخوان هنگام تحویل سفارش نیز وجود دارد." },
];

export const POPULAR_BRANDS = [
 "iran-khodro", "peugeot", "saipa", "toyota", "hyundai", "kia", "bmw", "benz",
 "chery", "mvm", "nissan", "mazda", "renault", "jac", "haima", "kmc",
];

export const RATING_BARS = [
 { stars: 5, pct: 88 },
 { stars: 4, pct: 9 },
 { stars: 3, pct: 2 },
 { stars: 2, pct: 1 },
 { stars: 1, pct: 0 },
];

export const REVIEWS = [
 { name: "سحر جعفری", city: "تهران", rating: 5, comment: "سفارشم زودتر از زمان اعلام‌شده رسید. کیفیت دوخت و گلدوزی فوق‌العاده است و دقیقاً اندازه کف ماشین بود. واقعاً به این تولید ایرانی افتخار می‌کنم." },
 { name: "مرتضی کشاورز", city: "شیراز", rating: 5, comment: "همیشه دغدغه کفپوشی داشتم که اندازه باشد. این کفپوش کاملاً فیت است و هیچ مانعی برای پدال‌ها ایجاد نمی‌کند. برای ماشین دومم هم سفارش می‌دهم." },
 { name: "الهام مددی", city: "اصفهان", rating: 5, comment: "بین همه فروشگاه‌هایی که خرید کردم، 50500 سریع‌ترین ارسال را داشت. بسته‌بندی هم خیلی شیک و حرفه‌ای بود." },
 { name: "میلاد موسوی", city: "مشهد", rating: 5, comment: "تیم پشتیبانی با حوصله راهنمایی کردند تا بهترین ترکیب رنگ چرم و گلدوزی را انتخاب کنم. نتیجه از عکس‌ها هم قشنگ‌تر شد." },
 { name: "نیلوفر احمدی", city: "کرج", rating: 5, comment: "چرم کرم با گلدوزی قهوه‌ای را انتخاب کردم؛ نمونه رنگی که در سایت دیدم دقیقاً با محصول تحویلی یکی بود. خیلی شیک شد!" },
 { name: "امیرحسین رضایی", city: "تبریز", rating: 4, comment: "کیفیت چرم و دوخت خیلی خوب است. فقط یک روز دیرتر از زمان اعلام‌شده رسید که با این کیفیت اصلاً مهم نیست." },
 { name: "رضا کریمی", city: "رشت", rating: 5, comment: "در فصل بارندگی رشت، لبه‌های بلند کفپوش آب و گل را کامل نگه می‌دارد و با یک دستمال نم‌دار تمیز می‌شود. کاملاً بی‌بو هم هست." },
 { name: "زهرا حسینی", city: "قم", rating: 5, comment: "گلدوزی لوگوی ماشین خیلی تمیز و دقیق انجام شده. هر کس سوار ماشینم می‌شود درباره کفپوش سؤال می‌کند!" },
 { name: "محمد صادقی", city: "اهواز", rating: 5, comment: "در گرمای اهواز هیچ تغییر شکل یا بویی نداشت. کیفیت ساخت واقعاً درجه یک است و ارزش خرید دارد." },
 { name: "علی محمدی", city: "تهران", rating: 5, comment: "برای هر دو ماشینم سفارش دادم؛ یکی مشکی با گلدوزی قرمز و یکی زرشکی با گلدوزی طلایی. هر دو عالی و دقیقاً اندازه‌اند." },
];

export const BLOG_POSTS = [
 {
  slug: "what-is-quilted-leather-mat",
  title: "کفپوش چرمی گلدوزی چیست؟ ساختار چهارلایه‌ای که واقعاً دوام می‌آورد",
  excerpt: "از دید بازار تا کارگاه: چرا کفپوش چهارلایه با گلدوزی لوزی، از کفپوش پلاستیکی معمولی برتری دارد.",
  tag: "راهنما",
  image: BLOG_IMAGES["fit-before-color"],
  date: "۱۴۰۴/۰۹/۰۲",
  readTime: "۴ دقیقه",
  body: [
   "کفپوش چرمی گلدوزی 50500 چهار لایه دارد: رویه چرمی، فوم ۹ میلی‌متری، پارچه جودون و لایه ضدلغزش زیرین. این ساختار هم راحتی پا را حفظ می‌کند هم از موکت اصلی خودرو محافظت می‌کند، درحالی که کفپوش یک‌لایه بازار فقط توهمی از حفاظت می‌دهد.",
   "گلدوزی لوزی فقط زیبایی نیست؛ بخش‌بخش فوم را قفل می‌کند تا با پس‌ره‌همی نخورد و در بلندمدت تغییر شکل ندهد. نخ انتخابی شما روی همین لایه کار می‌کند.",
   "هر محصول با اسکن سه‌بعدی دقیق کف خودرو دوخته می‌شود، بنابراین زیر پدال‌ها جمع نمی‌شود و لبه‌ها بدون فاصله کنار دیواره می‌ایستند.",
  ],
 },
 {
  slug: "how-to-clean-leather-mat",
  title: "تمیزکردن کفپوش چرمی در چند دقیقه؛ نحوه مراقبت از دوخت و رنگ",
  excerpt: "گردوخاک، خاک‌نمکِ زمستان و رطوبت را بدون شوینده قوی پاک کنید و رنگ چرم را برای سال‌ها نگه دارید.",
  tag: "نگهداری",
  image: BLOG_IMAGES["quick-mat-cleaning"],
  date: "۱۴۰۴/۰۸/۲۶",
  readTime: "۳ دقیقه",
  body: [
   "کفپوش را از خودرو خارج کنید و گردوخاک خشک را بتکانید. برای درزهای گلدوزی یک برس نرم بهتر از فشار آب است؛ آب نباید به فوم برسد.",
   "لکه‌های روزمره را با دستمال مایکروفیبر کمی نم‌دار پاک کنید. از شوینده قوی، سفیدکننده و برس زبر دوری کنید تا دوخت رنگ نبندازد.",
   "قبل از قرار دادن دوباره، کفپوش کاملاً خشک شود؛ رطوبت باقیمانده بوی بد و آسیب لایه فوم می‌آورد.",
  ],
 },
 {
  slug: "leather-and-thread-pairing",
  title: "چرم و نخ گلدوزی را چطور ست کنیم؟ ترکیب‌هایی که با کابین خودرو جور می‌شوند",
  excerpt: "از مشکی روی قرمز تا کرم با نخ همرنگ؛ سه قانون ساده برای ست کردن رنگ چرم با داشبورد و صندلی.",
  tag: "طراحی",
  image: BLOG_IMAGES["match-cabin-color"],
  date: "۱۴۰۴/۰۸/۱۹",
  readTime: "۵ دقیقه",
  body: [
   "رنگ غالب کابین (داشبورد، صندلی، روکش فرمان) را مبنا کنید. کابین تیره با چرم مشکی و نخ همرنگ یکدست و کمحاشیه دیده می‌شود؛ نخ نارنجی یا قرمز همان جزئیات اورجینال را تکرار می‌کند.",
   "اگر کابین روشن است، چرم کرم یا عسلی هماهنگی بیشتری ایجاد می‌کند، اما لکه را زودتر نشان می‌دهد؛ نمونه رنگ را قبل از تصمیم در نور روز ببینید.",
   "برای خودروهای پررفت‌روند، چرم‌های میانه (طوسی، عسلی) با دوخت ریزبافت محافظه‌کارانه‌اند و نظم کابین را حفظ می‌کنند.",
  ],
 },
];

export const DEMO_ORDERS = [
 { code: "40001234", phone: "09121234567", name: "حسین مرادی", city: "تهران", status: "delivered", payment: "paid", total: 8520000, createdAt: "۱۴۰۴/۰۷/۲۰", items: ["کفپوش چرمی گلدوزی پنج بعدی دنا پلاس"] },
 { code: "40009153", phone: "09351112233", name: "سارا عباسی", city: "اصفهان", status: "delivered", payment: "paid", total: 7650000, createdAt: "۱۴۰۴/۰۷/۲۴", items: ["کفپوش چرمی گلدوزی پنج بعدی شاهین"] },
 { code: "40017072", phone: "09137778899", name: "کامران شریفی", city: "شیراز", status: "shipped", payment: "paid", total: 9800000, createdAt: "۱۴۰۴/۰۸/۰۲", items: ["کفپوش چرمی گلدوزی پنج بعدی توسان"] },
 { code: "40024991", phone: "09194445566", name: "مینا رستمی", city: "کرج", status: "shipped", payment: "cod", total: 8400000, createdAt: "۱۴۰۴/۰۸/۰۵", items: ["کفپوش چرمی گلدوزی پنج بعدی تارا"] },
 { code: "40032910", phone: "09151239876", name: "بهزاد نیک‌نام", city: "مشهد", status: "producing", payment: "paid", total: 7500000, createdAt: "۱۴۰۴/۰۸/۰۸", items: ["کفپوش چرمی گلدوزی پنج بعدی کمری"] },
 { code: "40040829", phone: "09112223344", name: "لیلا قاسمی", city: "رشت", status: "producing", payment: "paid", total: 8520000, createdAt: "۱۴۰۴/۰۸/۱۰", items: ["کفپوش چرمی گلدوزی پنج بعدی راو ۴"] },
 { code: "40048748", phone: "09143334455", name: "پیمان اکبری", city: "تبریز", status: "confirmed", payment: "paid", total: 9800000, createdAt: "۱۴۰۴/۰۸/۱۲", items: ["کفپوش چرمی گلدوزی پنج بعدی X3"] },
 { code: "40056667", phone: "09125556677", name: "نازنین طاهری", city: "تهران", status: "pending", payment: "cod", total: 1450000, createdAt: "۱۴۰۴/۰۸/۱۴", items: ["قفل فرمان ضدسرقت دوقلاب"] },
];

export const SITE = {
 name: "50500.shop",
 phone: "۰۲۱-۹۱۰۵۰۵۰۰",
 phoneHref: "tel:+982191050500",
 email: "info@50500.shop",
 address: "تهران، بزرگراه جلال آل‌احمد، دفتر فروش 50500",
 hours: "شنبه تا پنجشنبه، ۹ صبح تا ۸ شب",
};
