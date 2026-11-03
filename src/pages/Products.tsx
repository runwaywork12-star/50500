import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, PackageSearch, X } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { ShopFilters } from "@/components/store/ShopFilters";
import { Breadcrumbs } from "@/components/ui";
import {
  BRANDS,
  CATEGORIES,
  SORT_OPTIONS,
  brandBySlug,
  carGroupById,
  searchProducts,
  type ShopQuery,
} from "@/lib/catalog";
import { CAR_GROUPS } from "@/data/content";
import { cn, fa } from "@/lib/format";

const one = (v: string | null) => v ?? "";

export default function Products() {
  const [sp, setSp] = useSearchParams();

  const query: ShopQuery = {
    q: one(sp.get("q")).slice(0, 80),
    category: one(sp.get("category")),
    group: carGroupById(one(sp.get("group"))) ? one(sp.get("group")) : "",
    brand: one(sp.get("brand")),
    model: one(sp.get("model")),
    sort: SORT_OPTIONS.some((s) => s.id === one(sp.get("sort"))) ? one(sp.get("sort")) : "popular",
    page: Math.max(1, Number(one(sp.get("page"))) || 1),
    min: Number(one(sp.get("min"))) || undefined,
    max: Number(one(sp.get("max"))) || undefined,
    discounted: one(sp.get("discounted")) === "1",
  };

  const result = useMemo(() => searchProducts(query), [JSON.stringify(query)]);

  const set = (patch: Partial<ShopQuery>) => {
    const next = new URLSearchParams(sp);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "" || value === false) {
        next.delete(key);
      } else if (key === "discounted") {
        if (value) next.set(key, "1");
        else next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    next.delete("page");
    setSp(next, { preventScrollReset: true });
  };

  const patchPage = (page: number) => {
    const next = new URLSearchParams(sp);
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    setSp(next, { preventScrollReset: true });
  };

  const cat = CATEGORIES.find((c) => c.slug === query.category);
  const group = carGroupById(query.group);
  const brand = brandBySlug(query.brand);
  const model = brand?.models.find((m) => m.slug === query.model);
  const base = cat?.shortName ?? "کفپوش چرمی گلدوزی";
  const title = model
    ? `${base} ${brand!.name} ${model.name}`
    : brand
      ? `${base} ${brand.name}`
      : group
        ? `${base} ${group.name}`
        : query.discounted
          ? "پیشنهادهای ویژه"
          : cat?.name ?? "فروشگاه کفپوش چرمی گلدوزی";

  const chips: { label: string; patch: Partial<ShopQuery> }[] = [];
  if (query.q) chips.push({ label: `جستجو: ${query.q}`, patch: { q: "" } });
  if (cat) chips.push({ label: cat.shortName, patch: { category: "" } });
  if (group) chips.push({ label: group.name, patch: { group: "", brand: "", model: "" } });
  if (brand) chips.push({ label: brand.name, patch: { brand: "", model: "" } });
  if (model) chips.push({ label: model.name, patch: { model: "" } });
  if (query.discounted) chips.push({ label: "تخفیف‌دار", patch: { discounted: false } });
  if (query.min || query.max) chips.push({ label: "محدوده قیمت", patch: { min: undefined, max: undefined } });

  const pageNumbers = Array.from({ length: result.pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === result.pages || Math.abs(n - result.page) <= 1,
  );
  const categories = CATEGORIES.map((c) => ({
    ...c,
    count: searchProducts({ ...query, category: c.slug, group: "", brand: "", model: "", q: "", discounted: false }, 1).total,
  }));

  return (
    <>
      {/* Store category hero, from the original 50500 storefront layout. */}
      <section className="relative overflow-hidden border-b bd">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -top-32 right-1/4 h-72 w-72 rounded-full bg-brand-500/20 blur-[110px]" />
        <div className="container-x relative py-10 sm:py-12">
          <Breadcrumbs
            items={[
              { href: "/", label: "خانه" },
              { href: "/products", label: "فروشگاه" },
              ...(group ? [{ label: group.name }] : cat ? [{ label: cat.shortName }] : []),
            ]}
          />
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm tdim">
            {query.q || query.category || query.brand || query.group || query.discounted
              ? `${fa(result.total)} محصول پیدا شد`
              : "کفپوش مناسب خودروی خود را انتخاب کنید؛ تصاویر، رنگ‌ها و مشخصات هر محصول را ببینید."}
          </p>
          {chips.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c.label} onClick={() => set(c.patch)} className="chip chip-active">
                  {c.label} <X className="size-3.5" />
                </button>
              ))}
              <button onClick={() => setSp(new URLSearchParams(), { preventScrollReset: true })} className="text-xs font-bold text-rose-400 hover:underline">
                حذف فیلترها
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="container-x grid gap-6 py-8 lg:grid-cols-[290px_1fr] lg:gap-8">
        <ShopFilters
          categories={categories.map((c) => ({ slug: c.slug, name: c.name, count: c.count }))}
          brands={BRANDS.map((b) => ({ slug: b.slug, name: b.name, models: b.models.map((m) => ({ slug: m.slug, name: m.name })) }))}
          groups={CAR_GROUPS.map((g) => ({
            id: g.id,
            name: g.name,
            brands: g.brands,
            modelCount: BRANDS.filter((b) => g.brands.includes(b.slug)).reduce((sum, b) => sum + b.models.length, 0),
          }))}
          current={query}
          onPatch={set}
          onReset={() => setSp(new URLSearchParams(), { preventScrollReset: true })}
        />

        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border bd bg-ink-850 p-2.5 ps-3 sm:ps-4">
            <span className="shrink-0 text-[13px] font-black sm:text-sm">
              {fa(result.total)} <span className="font-medium tdim">محصول</span>
            </span>
            <span className="shrink-0 text-xs tdim">مرتب‌سازی:</span>
            {SORT_OPTIONS.map((sort) => (
              <button key={sort.id} onClick={() => set({ sort: sort.id })} className={cn("chip !min-h-0 shrink-0 !px-3 !py-1.5 !text-[11px]", query.sort === sort.id && "chip-active")}>
                {sort.label}
              </button>
            ))}
          </div>

          {result.items.length === 0 ? (
            <div className="surface grid place-items-center rounded-3xl px-6 py-20 text-center">
              <PackageSearch className="size-14 tfaint" />
              <h2 className="mt-4 text-xl font-black">محصولی با این مشخصات پیدا نشد</h2>
              <p className="mt-2 text-sm tdim">فیلترها را تغییر دهید یا برای سفارش اختصاصی خودروی خود با ما تماس بگیرید.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setSp(new URLSearchParams(), { preventScrollReset: true })} className="btn btn-primary px-5 py-3 text-sm">
                  مشاهده همه کفپوش‌ها
                </button>
                <Link to="/contact" className="btn btn-ghost px-5 py-3 text-sm">
                  سفارش اختصاصی
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {result.pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="صفحه‌بندی">
              {result.page > 1 && (
                <button onClick={() => patchPage(result.page - 1)} className="grid size-11 place-items-center rounded-xl border bd soft-h" aria-label="صفحه قبل">
                  <ChevronRight className="size-5" />
                </button>
              )}
              {pageNumbers.map((n, i) => (
                <span key={n} className="flex items-center gap-2">
                  {i > 0 && n - pageNumbers[i - 1] > 1 && <span className="tdim">…</span>}
                  <button onClick={() => patchPage(n)} className={cn("grid size-11 place-items-center rounded-xl border text-sm font-bold transition", n === result.page ? "border-brand-500 bg-brand-500 text-white" : "bd soft-h")}>
                    {fa(n)}
                  </button>
                </span>
              ))}
              {result.page < result.pages && (
                <button onClick={() => patchPage(result.page + 1)} className="grid size-11 place-items-center rounded-xl border bd soft-h" aria-label="صفحه بعد">
                  <ChevronLeft className="size-5" />
                </button>
              )}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}