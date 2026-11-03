import { SEED_BRANDS, type SeedBrand } from "@/data/brands";
import {
 ACCESSORIES,
 CAR_GROUPS,
 carGroupById,
 rotatedMatImages,
} from "@/data/content";
import { normalizeFa } from "./format";

export type ProductSpec = { label: string; value: string };

export type Product = {
 id: number;
 slug: string;
 title: string;
 price: number;
 comparePrice: number | null;
 stock: number;
 image: string;
 images: string[];
 rating: number;
 ratingCount: number;
 salesCount: number;
 featured: boolean;
 delivery: string;
 body: string;
 specs: ProductSpec[];
 category: "embroidered-leather" | "accessories";
 optionsType: "leather" | "none";
 brandSlug?: string;
 brandName?: string;
 modelSlug?: string;
 modelName?: string;
 group?: string;
};

export type Brand = {
 slug: string;
 name: string;
 nameEn: string;
 tier: 1 | 2 | 3;
 prefix: boolean;
 models: { slug: string; name: string; stock: number }[];
};

const TIER_PRICES = [7500000, 8400000, 9800000];

const FEATURED = new Set([
 "5d-leather-peugeot-206",
 "5d-leather-iran-khodro-tara",
 "5d-leather-iran-khodro-dena-plus",
 "5d-leather-saipa-shahin",
 "5d-leather-bmw-x3",
 "5d-leather-toyota-camry",
 "5d-leather-hyundai-tucson",
 "5d-leather-chery-tiggo8",
 "5d-leather-kmc-j7",
 "5d-leather-kia-sportage",
 "5d-leather-peugeot-pars",
 "5d-leather-benz-c200",
]);

const MAT_SPECS: ProductSpec[] = [
 { label: "جنس رویه", value: "رویه چرمی" },
 { label: "دوخت", value: "دوخت ریزبافت لوزی (الماسی)" },
 { label: "ساختار", value: "۴ لایه: رویه چرمی، فوم ۹ میلی‌متری، پارچه جودون و لایه زیرین" },
 { label: "ارتفاع لبه", value: "۱۲ سانتی‌متر" },
 { label: "تعداد تکه", value: "۳ تکه (راننده، شاگرد، عقب یکپارچه)" },
 { label: "گلدوزی لوگو", value: "لوگوی خودرو روی کفپوش راننده (رایگان)" },
 { label: "ضد آب و ضد لغزش", value: "بله" },
 { label: "گارانتی", value: "۱۲ ماه ضمانت کیفیت" },
];

function matBody(car: string): string {
 return `کفپوش چرمی گلدوزی ${car} با اسکن سه‌بعدی دقیق از کف خودرو طراحی و به‌صورت کاملاً سفارشی در کارگاه 50500 دوخته و گلدوزی می‌شود. لبه‌های بلند این کفپوش تمام سطح کف و دیواره‌های کناری را می‌پوشاند و از نفوذ آب، گل و آلودگی به موکت اصلی خودرو جلوگیری می‌کند.\nرنگ چرم و رنگ نخ گلدوزی را مطابق سلیقه خود انتخاب کنید؛ لوگوی خودرو نیز به صورت رایگان روی کفپوش راننده گلدوزی می‌شود.\nبه دلیل تولید سفارشی، این محصول ظرف ۴ تا ۷ روز کاری آماده و ارسال می‌شود.`;
}

/** Deterministic pseudo-random from a string, so ratings look stable between renders. */
function hash(s: string): number {
 let h = 2166136261;
 for (let i = 0; i < s.length; i++) {
  h ^= s.charCodeAt(i);
  h = Math.imul(h, 16777619);
 }
 return Math.abs(h);
}

export const BRANDS: Brand[] = SEED_BRANDS.map((b: SeedBrand) => ({
 slug: b.slug,
 name: b.name,
 nameEn: b.nameEn,
 tier: b.tier,
 prefix: b.prefix,
 models: b.models.map(([slug, name, stock]) => ({ slug, name, stock })),
}));

export function brandBySlug(slug: string | undefined): Brand | undefined {
 return BRANDS.find((b) => b.slug === slug);
}

export function carFullName(brand: Brand, modelName: string): string {
 return brand.prefix ? `${brand.name} ${modelName}` : modelName;
}

let cache: Product[] | null = null;

export function getProducts(): Product[] {
 if (cache) return cache;
 const products: Product[] = [];
 let id = 1;
 for (const brand of BRANDS) {
  const group = CAR_GROUPS.find((g) => g.brands.includes(brand.slug))?.id;
  for (const model of brand.models) {
   const slug = `5d-leather-${brand.slug}-${model.slug}`;
   const car = carFullName(brand, model.name);
   const price = TIER_PRICES[brand.tier - 1];
   const h = hash(slug);
   const hasDiscount = model.stock >= 8;
   products.push({
    id: id++,
    slug,
    title: `کفپوش چرمی گلدوزی پنج بعدی ${car}`,
    price,
    comparePrice: hasDiscount ? Math.round(price * 1.12 / 50000) * 50000 : null,
    stock: model.stock,
    image: rotatedMatImages(id)[0],
    images: rotatedMatImages(id),
    rating: Math.round((4.4 + (h % 7) / 10) * 10) / 10,
    ratingCount: 40 + (h % 260),
    salesCount: 300 + (h % 2200),
    featured: FEATURED.has(slug),
    delivery: "۴ تا ۷ روز کاری",
    body: matBody(car),
    specs: MAT_SPECS,
    category: "embroidered-leather",
    optionsType: "leather",
    brandSlug: brand.slug,
    brandName: brand.name,
    modelSlug: model.slug,
    modelName: model.name,
    group,
   });
  }
 }
 for (const a of ACCESSORIES) {
  products.push({
   id: id++,
   slug: a.slug,
   title: a.title,
   price: a.price,
   comparePrice: a.comparePrice,
   stock: a.stock,
   image: a.image,
   images: [a.image],
   rating: a.rating,
   ratingCount: a.ratingCount,
   salesCount: a.salesCount,
   featured: a.featured,
   delivery: a.delivery,
   body: a.body,
   specs: a.specs,
   category: "accessories",
   optionsType: "none",
  });
 }
 cache = products;
 return products;
}

export function getProduct(slug: string | undefined): Product | undefined {
 return getProducts().find((p) => p.slug === slug);
}

export const CATEGORIES = [
 { slug: "embroidered-leather", name: "کفپوش چرمی گلدوزی", shortName: "کفپوش چرمی گلدوزی", count: 0 },
 { slug: "accessories", name: "همه لوازم جانبی خودرو", shortName: "لوازم جانبی", count: 0 },
];

export const SORT_OPTIONS = [
 { id: "popular", label: "پرفروش‌ترین" },
 { id: "newest", label: "جدیدترین" },
 { id: "price-asc", label: "ارزان‌ترین" },
 { id: "price-desc", label: "گران‌ترین" },
 { id: "discount", label: "بیشترین تخفیف" },
];

export type ShopQuery = {
 q: string;
 category: string;
 group: string;
 brand: string;
 model: string;
 sort: string;
 page: number;
 min?: number;
 max?: number;
 discounted: boolean;
};

export function searchProducts(query: ShopQuery, perPage = 12) {
 const q = normalizeFa(query.q ?? "").toLowerCase();
 let items = getProducts().filter((p) => {
  if (query.category && p.category !== query.category) return false;
  if (query.group && p.group !== query.group) return false;
  if (query.brand && p.brandSlug !== query.brand) return false;
  if (query.model) {
   const b = brandBySlug(query.brand);
   if (!b || p.modelSlug !== query.model) return false;
  }
  if (query.discounted && !(p.comparePrice && p.comparePrice > p.price)) return false;
  if (query.min !== undefined && p.price < query.min) return false;
  if (query.max !== undefined && p.price > query.max) return false;
  if (q) {
   const hay = normalizeFa(`${p.title} ${p.brandName ?? ""} ${p.modelName ?? ""}`).toLowerCase();
   if (!hay.includes(q)) return false;
  }
  return true;
 });

 const byDiscount = (p: Product) => (p.comparePrice && p.comparePrice > p.price ? 1 - p.price / p.comparePrice : 0);
 switch (query.sort) {
  case "price-asc":
   items = [...items].sort((a, b) => a.price - b.price);
   break;
  case "price-desc":
   items = [...items].sort((a, b) => b.price - a.price);
   break;
  case "discount":
   items = [...items].sort((a, b) => byDiscount(b) - byDiscount(a));
   break;
  case "newest":
   items = [...items].sort((a, b) => b.id - a.id);
   break;
  default:
   items = [...items].sort((a, b) => b.salesCount - a.salesCount);
 }

 const total = items.length;
 const pages = Math.max(1, Math.ceil(total / perPage));
 const page = Math.min(Math.max(1, query.page || 1), pages);
 return { items: items.slice((page - 1) * perPage, page * perPage), total, pages, page };
}

export function modelCount(): number {
 return BRANDS.reduce((s, b) => s + b.models.length, 0);
}

export { carGroupById };
