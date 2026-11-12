import { pushProductPatch } from "./api";

export type ProductOverride = {
  title?: string;
  body?: string;
  price?: number;
  comparePrice?: number | null;
  stock?: number;
  image?: string;
  active?: boolean;
  cost?: number;
};

export type CustomProduct = {
  slug: string;
  title: string;
  category: "embroidered-leather" | "accessories";
  price: number;
  comparePrice: number | null;
  stock: number;
  image: string | null;
  body: string;
  brandName: string | null;
  brandSlug?: string | null;
  modelSlug?: string | null;
  modelName?: string | null;
  cost?: number;
  active: boolean;
  custom: true;
  createdAt: string;
};

export type SubItem = {
  id: string;
  title: string;
  desc?: string;
  price: number;
  stock: number;
};

const KEY = "50500_product_overrides_v1";
const CUSTOM_KEY = "50500_custom_products_v1";
const SUB_KEY = "50500_sub_items_v1";
let cache: Record<string, ProductOverride> | null = null;
let customCache: CustomProduct[] | null = null;
let subCache: Record<string, SubItem[]> | null = null;

export function getCustomProducts(): CustomProduct[] {
  if (customCache) return customCache;
  try { customCache = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as CustomProduct[]; } catch { customCache = []; }
  return customCache;
}

export function setCustomProducts(list: CustomProduct[]) {
  customCache = list;
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); } catch { /* storage full */ }
}

export function getSubItems(slug: string): SubItem[] {
  if (!subCache) {
    try { subCache = JSON.parse(localStorage.getItem(SUB_KEY) ?? "{}") as Record<string, SubItem[]>; } catch { subCache = {}; }
  }
  return subCache[slug] ?? [];
}

export function setSubItems(slug: string, items: SubItem[]) {
  if (!subCache) {
    try { subCache = JSON.parse(localStorage.getItem(SUB_KEY) ?? "{}") as Record<string, SubItem[]>; } catch { subCache = {}; }
  }
  subCache[slug] = items;
  try { localStorage.setItem(SUB_KEY, JSON.stringify(subCache)); } catch { /* storage full */ }
}

export function getProductOverrides(): Record<string, ProductOverride> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, ProductOverride>;
  } catch {
    cache = {};
  }
  return cache;
}

export function setProductOverride(slug: string, patch: ProductOverride) {
  const current = getProductOverrides();
  const clean = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as ProductOverride;
  const next = { ...current, [slug]: { ...(current[slug] ?? {}), ...clean } };
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full/unavailable */ }
  pushProductPatch(slug, clean as Record<string, unknown>);
}

/** Drops the in-memory copy so the next read picks up freshly hydrated server data. */
export function resetProductOverridesCache() {
  cache = null;
  customCache = null;
  subCache = null;
}

export function clearProductOverrides() {
  cache = {};
  setCustomProducts([]);
  if (subCache) try { localStorage.setItem(SUB_KEY, "{}"); } catch { /* ignore */ }
  subCache = {};
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/[\s\u0600-\u06FF]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "product"}-c${Date.now().toString(36).slice(-4)}`;
}

export function makeId(prefix: string): string {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}
