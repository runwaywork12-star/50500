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

type Patch = Partial<Record<keyof ShopQuery, string | number | boolean | undefined>>;

export function shopHref(cur: ShopQuery, patch: Patch = {}): string {
  const merged: Record<string, string> = {
    q: cur.q,
    category: cur.category,
    group: cur.group,
    brand: cur.brand,
    model: cur.model,
    sort: cur.sort && cur.sort !== "popular" ? cur.sort : "",
    min: cur.min ? String(cur.min) : "",
    max: cur.max ? String(cur.max) : "",
    discounted: cur.discounted ? "1" : "",
    page: "",
  };
  for (const [k, v] of Object.entries(patch)) {
    merged[k] = v === undefined || v === false || v === "" || v === 0 ? "" : v === true ? "1" : String(v);
  }
  if (merged.sort === "popular") merged.sort = "";
  if (merged.page === "1") merged.page = "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return `/products${s ? `?${s}` : ""}`;
}
