import { POPULAR_BRANDS } from "./home-content";
import {
  carGroupsFrom,
  getBestSellers,
  getBrandsWithModels,
  getCategories,
  getDiscounted,
  getFeatured,
  getTestimonials,
  searchProducts,
} from "./queries";

/** One round-trip of everything both home pages need. */
export async function getHomeData() {
  const [brands, categories, featured, bestSellers, discounted, testimonials, accessoryResult] = await Promise.all([
    getBrandsWithModels(),
    getCategories(),
    getFeatured(8),
    getBestSellers(8),
    getDiscounted(8),
    getTestimonials(3),
    searchProducts({ category: "accessories", sort: "popular" }, 4),
  ]);
  const modelCount = brands.reduce((s, b) => s + b.models.length, 0);
  const popularBrands = POPULAR_BRANDS.map((slug) => brands.find((b) => b.slug === slug)).filter((b): b is (typeof brands)[number] => Boolean(b));
  return {
    brands,
    categories,
    featured,
    bestSellers,
    discounted,
    testimonials,
    accessories: accessoryResult.items,
    modelCount,
    groups: carGroupsFrom(brands),
    popularBrands,
    leatherCat: categories.find((c) => c.slug === "embroidered-leather"),
    accessoriesCat: categories.find((c) => c.slug === "accessories"),
    finderBrands: brands.map((b) => ({ slug: b.slug, name: b.name, models: b.models.map((m) => ({ slug: m.slug, name: m.name })) })),
  };
}

/** Light storefront: mat-first data (overall best sellers + a row of mats per car type). */
export async function getV2HomeData() {
  const base = await getHomeData();
  const [mats, ...rows] = await Promise.all([
    searchProducts({ category: "embroidered-leather", sort: "popular" }, 8),
    ...base.groups.map((g) => searchProducts({ category: "embroidered-leather", group: g.id, sort: "popular" }, 4)),
  ]);
  return {
    ...base,
    mats: mats.items,
    groupRows: base.groups.map((g, i) => ({ group: g, items: rows[i]?.items ?? [] })),
  };
}
