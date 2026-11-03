import { requireAdminPermission } from "@/lib/auth";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { ProductCreateForm, ProductRow } from "@/components/admin/AdminClient";
import { getAdminProducts, getCategoryOptions } from "@/lib/admin-queries";
import { cn, fa } from "@/lib/format";
import { getBrandsWithModels } from "@/lib/queries";
import { PRODUCT_IMAGES } from "@/lib/options";
import { ProductBulkTools } from "@/components/admin/ProductBulkTools";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";


export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPermission("catalog:read");

  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const [{ rows, total, pages }, categories, brands] = await Promise.all([getAdminProducts(q || undefined, page), getCategoryOptions(), getBrandsWithModels()]);
  const href = (p: number) => `/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">محصولات</h1>
          <p className="mt-1 text-sm text-white/50">{fa(total)} محصول · ویرایش سریع قیمت، تخفیف و موجودی</p>
        </div>
        <form method="GET" className="relative w-full sm:w-80">
          <input name="q" defaultValue={q} className="input pe-11 text-sm" placeholder="جستجوی عنوان یا شناسه..." />
          <button type="submit" className="absolute inset-y-0 end-0 grid w-11 place-items-center text-white/50" aria-label="جستجو">
            <Search className="size-4" />
          </button>
        </form>
      </div>

      <ProductBulkTools categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      <details className="surface group rounded-3xl">
        <summary className="flex cursor-pointer items-center gap-3 p-5 font-black">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-500 text-white">
            <Plus className="size-5 transition group-open:rotate-45" />
          </span>
          افزودن محصول جدید
        </summary>
        <div className="border-t border-white/5 p-5">
          <ProductCreateForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            brands={brands.map((b) => ({ slug: b.slug, name: b.name, models: b.models.map((m) => ({ id: m.id, name: m.name })) }))}
            images={PRODUCT_IMAGES}
          />
        </div>
      </details>

      <div className="surface overflow-hidden rounded-3xl">
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="text-xs text-white/45">
              <tr className="border-b border-white/10">
                <th className="pb-3 text-start font-medium">محصول</th>
                <th className="px-2 pb-3 text-start font-medium">قیمت (تومان)</th>
                <th className="px-2 pb-3 text-start font-medium">بهای تمام‌شده</th>
                <th className="px-2 pb-3 text-start font-medium">قیمت قبل</th>
                <th className="px-2 pb-3 text-start font-medium">موجودی</th>
                <th className="px-2 pb-3 text-start font-medium">فروش</th>
                <th className="px-2 pb-3 text-start font-medium">ویژه</th>
                <th className="px-2 pb-3 text-start font-medium">فعال</th>
                <th className="pb-3 text-start font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <ProductRow
                  key={`${p.id}-${p.price}-${p.costPrice}-${p.comparePrice}-${p.stock}-${p.isFeatured}-${p.isActive}`}
                  p={{
                    id: p.id,
                    slug: p.slug,
                    title: p.title,
                    description: p.description,
                    specs: p.specs,
                    price: p.price,
                    costPrice: p.costPrice,
                    comparePrice: p.comparePrice,
                    stock: p.stock,
                    salesCount: p.salesCount,
                    isFeatured: p.isFeatured,
                    isActive: p.isActive,
                    image: p.images[0] ?? "/api/site-image/mat",
                    images: p.images,
                    categoryName: p.categoryName,
                  }}
                />
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-10 text-center text-sm text-white/50">محصولی یافت نشد.</p>}
        </div>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={href(page - 1)} className="grid size-10 place-items-center rounded-xl border border-white/10 hover:bg-white/5" aria-label="قبلی">
              <ChevronRight className="size-4" />
            </Link>
          )}
          <span className={cn("rounded-xl border border-white/10 px-4 py-2 text-sm")}>
            صفحه {fa(page)} از {fa(pages)}
          </span>
          {page < pages && (
            <Link href={href(page + 1)} className="grid size-10 place-items-center rounded-xl border border-white/10 hover:bg-white/5" aria-label="بعدی">
              <ChevronLeft className="size-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
