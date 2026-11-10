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

const KEY = "50500_product_overrides_v1";
const CUSTOM_KEY = "50500_custom_products_v1";
let cache: Record<string, ProductOverride> | null = null;
let customCache: CustomProduct[] | null = null;

export type CustomProduct = {
  slug: string; title: string; category: "embroidered-leather" | "accessories"; price: number; comparePrice: number | null;
  stock: number; image: string | null; body: string; brandName: string | null; active: boolean;
};

export function getCustomProducts(): CustomProduct[] {
  if (customCache) return customCache;
  try { customCache = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as CustomProduct[]; } catch { customCache = []; }
  return customCache;
}

export function setCustomProducts(list: CustomProduct[]) {
  customCache = list;
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); } catch { /* ignore */ }
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
}

export function clearProductOverrides() {
  cache = {};
  setCustomProducts([]);
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
