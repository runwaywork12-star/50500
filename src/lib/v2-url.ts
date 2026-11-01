export type V2Query = {
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

export type V2Patch = Partial<Record<keyof V2Query, string | number | boolean | undefined>>;

export function v2Href(cur: V2Query, patch: V2Patch = {}): string {
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
  return `/v2/products${s ? `?${s}` : ""}`;
}
