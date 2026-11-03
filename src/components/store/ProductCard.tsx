import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, Flame, Star } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { compactFa, discountPercent, fa } from "@/lib/format";
import { LEATHER_COLORS } from "@/data/content";

/** Small glossy "leather bead" dots for the available leather colours. */
function LeatherDots() {
  return (
    <div className="absolute bottom-2 start-2 flex items-center rounded-full scrim py-1 pe-1.5 ps-1 text-white backdrop-blur sm:bottom-3 sm:start-3 sm:py-1.5 sm:pe-2.5 sm:ps-2">
      {LEATHER_COLORS.slice(0, 5).map((s, i) => (
        <span
          key={s.id}
          title={s.name}
          className={`size-3.5 rounded-full shadow-md shadow-black/50 ring-2 ring-ink-950 sm:size-4 ${i ? "-ms-1.5" : ""}`}
          style={{
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.45), transparent 42%), radial-gradient(circle at 50% 50%, ${s.hex} 55%, rgba(0,0,0,0.55) 100%)`,
            backgroundColor: s.hex,
          }}
        />
      ))}
      <span className="ms-1 text-[9px] font-bold tdim sm:ms-1.5 sm:text-[10px]">+{fa(LEATHER_COLORS.length - 5)}</span>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product.price, product.comparePrice);
  const leather = product.optionsType === "leather";
  const hot = product.salesCount >= 1500;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="spot group relative flex h-full flex-col overflow-hidden rounded-3xl border bd bg-linear-to-b from-ink-800 to-ink-850 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/30 hover:shadow-[0_28px_60px_-28px_rgba(255,107,26,0.5)]"
    >
      <div className={`relative aspect-square overflow-hidden ${leather ? "bg-photo" : "bg-ink-700"}`}>
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className={`h-full w-full transition-transform duration-700 ${leather ? "object-contain p-2.5 group-hover:scale-[1.06]" : "object-cover group-hover:scale-110"}`}
        />
        {!leather && <div className="absolute inset-0 scrim-grad-soft" />}
        <span className="absolute start-2 top-2 rounded-full scrim px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur sm:start-3 sm:top-3 sm:px-2.5 sm:text-[11px]">
          {product.brandName ?? "لوازم جانبی"}
        </span>
        <div className="absolute end-2 top-2 flex flex-col items-end gap-1 sm:end-3 sm:top-3 sm:gap-1.5">
          {off > 0 && (
            <span className="rounded-full bg-linear-to-l from-brand-500 to-rose-500 px-2 py-1 text-[10px] font-black text-[#fff] shadow-lg sm:px-2.5 sm:text-[11px]">{fa(off)}٪ تخفیف</span>
          )}
          {hot && (
            <span className="flex items-center gap-1 rounded-full scrim px-2 py-1 text-[10px] font-bold text-amber-300 backdrop-blur sm:px-2.5 sm:text-[11px]">
              <Flame className="size-3.5" /> پرفروش
            </span>
          )}
        </div>
        {leather && <LeatherDots />}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[3rem] text-sm font-bold leading-6 tdim transition-colors group-hover:text-white">{product.title}</h3>
        <div className="mt-2 flex items-center gap-3 text-xs tdim">
          <span className="flex items-center gap-1 font-bold text-amber-300">
            <Star className="size-3.5 fill-current" /> {fa(product.rating)}
          </span>
          <span className="h-3 w-px soft" />
          <span>{compactFa(product.salesCount)} فروش</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            {product.comparePrice && off > 0 ? (
              <p className="text-xs tdim line-through decoration-rose-400/60">{fa(product.comparePrice)}</p>
            ) : (
              <p className="text-xs text-transparent">-</p>
            )}
            <p className="text-base font-black text-white sm:text-lg">
              {fa(product.price)} <span className="text-xs font-medium tdim">تومان</span>
            </p>
          </div>
          <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl soft px-2.5 text-xs font-bold tdim sm:h-10 sm:px-3 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-[#fff] group-hover:shadow-lg group-hover:shadow-brand-500/30">
            <span className="hidden sm:inline">{leather ? "سفارش" : "مشاهده"}</span>
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
