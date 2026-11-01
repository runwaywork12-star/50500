import type { Metadata } from "next";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ChevronLeft, ChevronRight, PackageSearch, X } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { ShopFilters } from "@/components/store/ShopFilters";
import { Breadcrumbs } from "@/components/ui";
import { cn, fa } from "@/lib/format";
import { SORT_OPTIONS, carGroupById } from "@/lib/options";
import { carGroupsFrom, getBrandsWithModels, getCategories, searchProducts } from "@/lib/queries";
import { shopHref, type ShopQuery } from "@/lib/shop-url";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "فروشگاه کفپوش چرمی گلدوزی" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const current: ShopQuery = {
    q: one(sp.q).slice(0, 80),
    category: one(sp.category),
    group: carGroupById(one(sp.group)) ? one(sp.group) : "",
    brand: one(sp.brand),
    model: one(sp.model),
    sort: SORT_OPTIONS.some((s) => s.id === one(sp.sort)) ? one(sp.sort) : "popular",
    page: Math.max(1, Number(one(sp.page)) || 1),
    min: Number(one(sp.min)) || undefined,
    max: Number(one(sp.max)) || undefined,
    discounted: one(sp.discounted) === "1",
  };

  const [categories, brands, result, settings] = await Promise.all([getCategories(), getBrandsWithModels(), searchProducts(current), getSettings()]);
  const groups = carGroupsFrom(brands);
  const cat = categories.find((c) => c.slug === current.category);
  const group = groups.find((g) => g.id === current.group);
  const brand = brands.find((b) => b.slug === current.brand);
  const model = brand?.models.find((m) => m.slug === current.model);
  const base = cat?.shortName ?? "کفپوش چرمی گلدوزی";
  const title = model ? `${base} ${model.fullName}` : brand ? `${base} ${brand.name}` : group ? `${base} ${group.name}` : current.discounted ? "پیشنهادهای ویژه" : cat?.name ?? settings["pages.products.heading"];

  const chips: { label: string; href: string }[] = [];
  if (current.q) chips.push({ label: `جستجو: ${current.q}`, href: shopHref(current, { q: "" }) });
  if (cat) chips.push({ label: cat.shortName, href: shopHref(current, { category: "" }) });
  if (group) chips.push({ label: group.name, href: shopHref(current, { group: "", brand: "", model: "" }) });
  if (brand) chips.push({ label: brand.name, href: shopHref(current, { brand: "", model: "" }) });
  if (model) chips.push({ label: model.name, href: shopHref(current, { model: "" }) });
  if (current.discounted) chips.push({ label: "تخفیف‌دار", href: shopHref(current, { discounted: false }) });
  if (current.min || current.max) chips.push({ label: "محدوده قیمت", href: shopHref(current, { min: undefined, max: undefined }) });

  const pageNumbers = Array.from({ length: result.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === result.pages || Math.abs(n - result.page) <= 1);

  return (
    <>
      <section className="relative overflow-hidden border-b bd">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -top-32 right-1/4 h-72 w-72 rounded-full bg-brand-500/20 blur-[110px]" />
        <div className="container-x relative py-10">
          <Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/products", label: "فروشگاه" }, ...(group ? [{ label: group.name }] : cat ? [{ label: cat.shortName }] : [])]} />
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm tdim">{current.q || current.category || current.brand || current.group || current.discounted ? `${fa(result.total)} محصول پیدا شد` : settings["pages.products.description"]}</p>
          {chips.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <Link key={c.label} href={c.href} className="chip chip-active">
                  {c.label} <X className="size-3.5" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container-x grid gap-6 py-8 lg:grid-cols-[290px_1fr] lg:gap-8">
        <ShopFilters
          categories={categories.map((c) => ({ slug: c.slug, name: c.name, count: c.count }))}
          brands={brands.map((b) => ({ slug: b.slug, name: b.name, models: b.models.map((m) => ({ slug: m.slug, name: m.name })) }))}
          groups={groups.map((g) => ({ id: g.id, name: g.name, brands: g.brands, modelCount: g.modelCount }))}
          current={current}
        />

        <div className="min-w-0">
          <>
              <div className="no-scrollbar mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl border bd bg-ink-850 p-2.5 ps-4">
                <span className="shrink-0 border-e bd pe-4 text-sm font-black">{fa(result.total)} <span className="font-medium tdim">محصول</span></span>
                <span className="shrink-0 ps-1 text-xs tdim">مرتب‌سازی:</span>
                {SORT_OPTIONS.map((s) => (
                  <Link key={s.id} href={shopHref(current, { sort: s.id })} scroll={false} className={cn("chip shrink-0", current.sort === s.id && "chip-active")}>
                    {s.name}
                  </Link>
                ))}
              </div>

              {result.items.length === 0 ? (
                <div className="surface grid place-items-center rounded-3xl px-6 py-20 text-center">
                  <PackageSearch className="size-14 tfaint" />
                  <h2 className="mt-4 text-xl font-black">محصولی با این مشخصات پیدا نشد</h2>
                  <p className="mt-2 text-sm tdim">فیلترها را تغییر دهید یا برای سفارش اختصاصی خودروی خود با ما تماس بگیرید.</p>
                  <div className="mt-6 flex gap-3">
                    <Link href="/products" className="btn btn-primary px-5 py-3 text-sm">
                      مشاهده همه کفپوش‌ها
                    </Link>
                    <Link href="/contact" className="btn btn-ghost px-5 py-3 text-sm">
                      سفارش اختصاصی
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                  {result.items.map((p, i) => (
                    <ProductCard key={p.id} product={p} priority={i < 3} />
                  ))}
                </div>
              )}

              {result.pages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="صفحه‌بندی">
                  {result.page > 1 && (
                    <Link href={shopHref(current, { page: result.page - 1 })} className="grid size-11 place-items-center rounded-xl border bd soft-h" aria-label="صفحه قبل">
                      <ChevronRight className="size-5" />
                    </Link>
                  )}
                  {pageNumbers.map((n, i) => (
                    <span key={n} className="flex items-center gap-2">
                      {i > 0 && n - pageNumbers[i - 1] > 1 && <span className="tdim">…</span>}
                      <Link
                        href={shopHref(current, { page: n })}
                        className={cn(
                          "grid size-11 place-items-center rounded-xl border text-sm font-bold transition",
                          n === result.page ? "border-brand-500 bg-brand-500 text-[#fff]" : "bd soft-h",
                        )}
                      >
                        {fa(n)}
                      </Link>
                    </span>
                  ))}
                  {result.page < result.pages && (
                    <Link href={shopHref(current, { page: result.page + 1 })} className="grid size-11 place-items-center rounded-xl border bd soft-h" aria-label="صفحه بعد">
                      <ChevronLeft className="size-5" />
                    </Link>
                  )}
                </nav>
              )}
        </>
        </div>
      </div>
    </>
  );
}
