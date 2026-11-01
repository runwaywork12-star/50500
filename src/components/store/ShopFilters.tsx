"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, SlidersHorizontal, Tag, X } from "lucide-react";
import { cn, fa } from "@/lib/format";
import { PRICE_RANGES } from "@/lib/options";
import { shopHref, type ShopQuery } from "@/lib/shop-url";
import { themePath } from "@/lib/theme-path";

type FilterCategory = { slug: string; name: string; count: number };
type FilterBrand = { slug: string; name: string; models: { slug: string; name: string }[] };
type FilterGroup = { id: string; name: string; brands: string[]; modelCount: number };

export function ShopFilters({
  categories,
  brands,
  groups,
  current,
}: {
  categories: FilterCategory[];
  brands: FilterBrand[];
  groups: FilterGroup[];
  current: ShopQuery;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(current.q);
  const group = groups.find((g) => g.id === current.group);
  const brandOptions = group ? brands.filter((b) => group.brands.includes(b.slug)) : brands;
  const models = brands.find((b) => b.slug === current.brand)?.models ?? [];
  const activeRange = current.min || current.max ? `${current.min ?? 0}-${current.max ?? 100000000}` : "";
  const activeCount = [current.q, current.category, current.group, current.brand, current.model, activeRange, current.discounted ? "1" : ""].filter(Boolean).length;
  const liveCategories = categories.filter((c) => c.count > 0);

  const go = (patch: Parameters<typeof shopHref>[1]) => {
    router.push(themePath(pathname, shopHref(current, patch)), { scroll: false });
    setOpen(false);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    go({ q: q.trim() });
  };

  const panel = (
    <div className="grid gap-6">
      <form onSubmit={onSearch} className="relative">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام خودرو..." className="input pe-11" />
        <button type="submit" className="absolute inset-y-0 end-0 grid w-11 place-items-center tdim hover:text-brand-400" aria-label="جستجو">
          <Search className="size-5" />
        </button>
      </form>

      {liveCategories.length > 1 && (
        <div>
          <p className="mb-3 text-sm font-black">دسته‌بندی</p>
          <div className="grid gap-1">
            <button
              onClick={() => go({ category: "" })}
              className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition", !current.category ? "bg-brand-500/15 font-bold text-brand-200" : "tdim soft-h")}
            >
              همه محصولات
            </button>
            {liveCategories.map((c) => (
              <button
                key={c.slug}
                onClick={() => go({ category: c.slug })}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                  current.category === c.slug ? "bg-brand-500/15 font-bold text-brand-200" : "tdim soft-h",
                )}
              >
                {c.name}
                <span className="text-xs tdim">{fa(c.count)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-black">نوع خودرو</p>
        <div className="grid gap-1">
          <button
            onClick={() => go({ group: "", brand: "", model: "" })}
            className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition", !current.group ? "bg-brand-500/15 font-bold text-brand-200" : "tdim soft-h")}
          >
            همه خودروها
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => go({ group: g.id, brand: "", model: "" })}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                current.group === g.id ? "bg-brand-500/15 font-bold text-brand-200" : "tdim soft-h",
              )}
            >
              {g.name}
              <span className="text-xs tdim">{fa(g.modelCount)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-black">برند و مدل</p>
        <select className="input" value={current.brand} onChange={(e) => go({ brand: e.target.value, model: "" })} aria-label="برند">
          <option value="">{group ? `همه برندهای ${group.name}` : "همه برندها"}</option>
          {brandOptions.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        <select className="input" value={current.model} onChange={(e) => go({ model: e.target.value })} disabled={!current.brand} aria-label="مدل">
          <option value="">{current.brand ? "همه مدل‌ها" : "ابتدا برند را انتخاب کنید"}</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-3 text-sm font-black">محدوده قیمت</p>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((r) => {
            const [min, max] = r.id.split("-").map(Number);
            const active = activeRange === r.id;
            return (
              <button key={r.id} onClick={() => (active ? go({ min: undefined, max: undefined }) : go({ min, max }))} className={cn("chip", active && "chip-active")}>
                {r.name}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={() => go({ discounted: !current.discounted })} className="flex items-center justify-between rounded-2xl border bd soft px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <Tag className="size-4 text-brand-400" /> فقط کالاهای تخفیف‌دار
        </span>
        <span className={cn("relative h-6 w-11 rounded-full transition", current.discounted ? "bg-brand-500" : "soft")}>
          <span className={cn("absolute top-1 size-4 rounded-full bg-photo transition-all", current.discounted ? "start-6" : "start-1")} />
        </span>
      </button>

      {activeCount > 0 && (
        <button onClick={() => router.push(themePath(pathname, "/products"))} className="btn btn-ghost py-3 text-sm">
          <X className="size-4" /> حذف همه فیلترها
        </button>
      )}
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-ghost w-full py-3 text-sm lg:hidden">
        <SlidersHorizontal className="size-4" /> فیلترها
        {activeCount > 0 && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] text-[#fff]">{fa(activeCount)}</span>}
      </button>
      <aside className="hidden lg:block">
        <div className="surface sticky top-24 rounded-3xl p-5">{panel}</div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-fade-up overflow-y-auto rounded-t-[2rem] border-t bd bg-ink-900 p-5 pb-10">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-black">فیلتر محصولات</p>
              <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl soft" aria-label="بستن">
                <X className="size-5" />
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
