"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Car, Search } from "lucide-react";
import { themePath } from "@/lib/theme-path";

type FinderBrand = { slug: string; name: string; models: { slug: string; name: string }[] };

export function CarFinder({
  brands,
  className = "",
  title = "کفپوش مخصوص خودروی شما",
  description = "برند و مدل خودرو را انتخاب کنید",
  buttonLabel = "نمایش کفپوش‌ها",
  brandPlaceholder = "برند خودرو",
  modelPlaceholder = "همه مدل‌ها",
  modelFirstPrompt = "ابتدا برند را انتخاب کنید",
}: {
  brands: FinderBrand[];
  className?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  brandPlaceholder?: string;
  modelPlaceholder?: string;
  modelFirstPrompt?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const models = useMemo(() => brands.find((b) => b.slug === brand)?.models ?? [], [brands, brand]);

  const go = () => {
    const p = new URLSearchParams();
    if (brand) p.set("brand", brand);
    if (model) p.set("model", model);
    const qs = p.toString();
    router.push(themePath(pathname, `/products${qs ? `?${qs}` : ""}`));
  };

  return (
    <div className={`glass surface relative min-w-0 rounded-3xl p-4 shadow-xl sm:p-5 ${className}`}>
      <div className="grid min-w-0 items-center gap-4 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3 lg:pe-2">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
            <Car className="size-5" />
          </span>
          <div>
            <p className="text-xs font-black leading-5 sm:text-sm">{title}</p>
            <p className="text-[11px] leading-5 tdim sm:text-xs">{description}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select
            className="input"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setModel("");
            }}
            aria-label="برند خودرو"
          >
            <option value="">{brandPlaceholder}</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)} disabled={!brand} aria-label="مدل خودرو">
            <option value="">{brand ? modelPlaceholder : modelFirstPrompt}</option>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
          <button onClick={go} className="btn btn-primary px-7 py-3.5">
            <Search className="size-5" /> {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
