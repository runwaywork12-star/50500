import { ACCESSORY_PHOTOS } from "./accessory-photos";
import { MAT_URLS } from "./mat-photos";

export type Swatch = { id: string; name: string; hex: string };
export type OptionsType = "leather" | "none";

/** Natural leather tones (nano PU leather). */
export const LEATHER_COLORS: Swatch[] = [
  { id: "black", name: "مشکی", hex: "#1f1f21" },
  { id: "brown", name: "قهوه‌ای", hex: "#4a2f22" },
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

export const OPTION_LABELS = { leather: "رنگ چرم", thread: "رنگ گلدوزی" } as const;

export function leatherById(id: string): Swatch {
  return LEATHER_COLORS.find((c) => c.id === id) ?? LEATHER_COLORS[0];
}
export function threadById(id: string): Swatch {
  return THREAD_COLORS.find((c) => c.id === id) ?? THREAD_COLORS[0];
}

export type CarGroup = {
  id: string;
  name: string;
  shortName: string;
  brands: string[];
  leather: string;
  thread: string;
};

/** Car groups used on the home page and as a shop filter. */
export const CAR_GROUPS: CarGroup[] = [
  { id: "domestic", name: "خودروهای داخلی", shortName: "داخلی", brands: ["iran-khodro", "peugeot", "saipa", "renault", "rega-copa"], leather: "black", thread: "red" },
  { id: "chinese", name: "خودروهای چینی", shortName: "چینی", brands: ["kmc", "mvm", "chery", "jac", "mg", "geely", "haima", "brilliance", "lifan", "greatwall", "changan", "dongfeng", "faw", "capra", "byd", "swm", "baic", "bisu"], leather: "brown", thread: "cream" },
  { id: "asian", name: "خودروهای کره‌ای و ژاپنی", shortName: "کره‌ای و ژاپنی", brands: ["toyota", "hyundai", "kia", "mazda", "nissan", "suzuki", "ssangyong", "lexus", "honda", "daewoo", "infiniti", "subaru", "mitsubishi", "landmark"], leather: "cream", thread: "brown" },
  { id: "european", name: "خودروهای اروپایی و آمریکایی", shortName: "اروپایی و آمریکایی", brands: ["benz", "volkswagen", "bmw", "citroen", "porsche", "audi", "volvo", "maserati", "dodge"], leather: "burgundy", thread: "gold" },
];

export function carGroupById(id: string | undefined): CarGroup | undefined {
  return CAR_GROUPS.find((g) => g.id === id);
}

/** Images selectable when creating products in the admin panel. */
export const PRODUCT_IMAGES = [
  ...MAT_URLS,
  ...Object.values(ACCESSORY_PHOTOS),
];

export const FREE_SHIPPING_THRESHOLD = 5000000;

export const SHIPPING_METHODS = [
  { id: "post", name: "پست پیشتاز", desc: "۲ تا ۴ روز کاری پس از تولید", cost: 120000, freeOver: FREE_SHIPPING_THRESHOLD as number | null },
  { id: "tipax", name: "تیپاکس (پس‌کرایه)", desc: "ارسال سریع؛ هزینه هنگام تحویل پرداخت می‌شود", cost: 0, freeOver: null as number | null },
  { id: "pickup", name: "تحویل حضوری", desc: "دفتر فروش ۵۰۵۰۰ — تهران، بزرگراه جلال آل‌احمد", cost: 0, freeOver: null as number | null },
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
  { id: "confirmed", name: "تایید شده", tone: "sky" },
  { id: "producing", name: "در حال تولید", tone: "violet" },
  { id: "shipped", name: "ارسال شده", tone: "blue" },
  { id: "delivered", name: "تحویل شده", tone: "emerald" },
  { id: "cancelled", name: "لغو شده", tone: "red" },
];

export const PAYMENT_STATUSES: Record<string, { name: string; tone: string }> = {
  pending: { name: "در انتظار پرداخت", tone: "amber" },
  paid: { name: "پرداخت شده", tone: "emerald" },
  failed: { name: "پرداخت ناموفق", tone: "red" },
  cod: { name: "پرداخت در محل", tone: "sky" },
};

export const TONES: Record<string, string> = {
  amber: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  sky: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  violet: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
  blue: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  red: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
};

export function orderStatus(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id) ?? ORDER_STATUSES[0];
}

export const PROVINCES = [
  "تهران", "البرز", "اصفهان", "فارس", "خراسان رضوی", "آذربایجان شرقی", "آذربایجان غربی", "اردبیل",
  "ایلام", "بوشهر", "چهارمحال و بختیاری", "خراسان جنوبی", "خراسان شمالی", "خوزستان", "زنجان", "سمنان",
  "سیستان و بلوچستان", "قزوین", "قم", "کردستان", "کرمان", "کرمانشاه", "کهگیلویه و بویراحمد", "گلستان",
  "گیلان", "لرستان", "مازندران", "مرکزی", "هرمزگان", "همدان", "یزد",
];

export const SORT_OPTIONS = [
  { id: "popular", name: "پرفروش‌ترین" },
  { id: "newest", name: "جدیدترین" },
  { id: "cheap", name: "ارزان‌ترین" },
  { id: "expensive", name: "گران‌ترین" },
  { id: "rating", name: "محبوب‌ترین" },
  { id: "discount", name: "بیشترین تخفیف" },
];

export const PRICE_RANGES = [
  { id: "0-8000000", name: "تا ۸ میلیون" },
  { id: "8000000-9000000", name: "۸ تا ۹ میلیون" },
  { id: "9000000-100000000", name: "بالای ۹ میلیون" },
];

export const CONTACT = {
  phone: "۰۲۱-۹۱۰۵۰۵۰۰",
  phoneHref: "tel:+982191050500",
  mobile: "۰۹۱۲-۵۰۵۰۵۰۰",
  email: "info@store50500.ir",
  address: "تهران، بزرگراه جلال آل‌احمد، نبش خیابان کارگر، مجتمع تجاری ۵۰۵۰۰، طبقه دوم",
  hours: "شنبه تا پنجشنبه ۹ تا ۲۰",
};
