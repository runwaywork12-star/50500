import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, Flame, Star } from "lucide-react";
import type { ProductCardData } from "@/lib/queries";
import { compactFa, discountPercent, fa } from "@/lib/format";
import { LEATHER_COLORS } from "@/lib/options";

/** Small glossy "leather bead" dots for the available leather colours. */
function LeatherDots() {
  return (
    <div className="absolute bottom-3 start-3 flex items-center rounded-full scrim py-1.5 pe-2.5 ps-2 text-white backdrop-blur">
      {LEATHER_COLORS.slice(0, 5).map((s, i) => (
        <span
          key={s.id}
          title={s.name}
          className={`size-4 rounded-full shadow-md shadow-black/50 ring-2 ring-ink-950 ${i ? "-ms-1.5" : ""}`}
          style={{
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.45), transparent 42%), radial-gradient(circle at 50% 50%, ${s.hex} 55%, rgba(0,0,0,0.55) 100%)`,
            backgroundColor: s.hex,
          }}
        />
      ))}
      <span className="ms-1.5 text-[10px] font-bold tdim">+{fa(LEATHER_COLORS.length - 5)}</span>
    </div>
  );
}

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const off = discountPercent(product.price, product.comparePrice);
  const leather = product.optionsType === "leather";
  const hot = product.salesCount >= 1500;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="spot group relative flex h-full flex-col overflow-hidden rounded-3xl border bd bg-linear-to-b from-ink-800 to-ink-850 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/30 hover:shadow-[0_28px_60px_-28px_rgba(255,107,26,0.5)]"
    >
      <div className={`relative aspect-square overflow-hidden ${leather ? "bg-photo" : "bg-ink-700"}`}>
        <Image
          src={product.image}
          alt={product.title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 38vw, 22vw"
          className={`transition-transform duration-700 ${leather ? "object-contain p-2.5 group-hover:scale-[1.06]" : "object-cover group-hover:scale-110"}`}
        />
        {!leather && <div className="absolute inset-0 scrim-grad-soft" />}
        <span className="absolute start-3 top-3 rounded-full scrim px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">
          {product.brandName ?? product.categoryName}
        </span>
        <div className="absolute end-3 top-3 flex flex-col items-end gap-1.5">
          {off > 0 && (
            <span className="rounded-full bg-linear-to-l from-brand-500 to-rose-500 px-2.5 py-1 text-[11px] font-black text-[#fff] shadow-lg">{fa(off)}٪ تخفیف</span>
          )}
          {hot && (
            <span className="flex items-center gap-1 rounded-full scrim px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur">
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
            <p className="text-lg font-black text-white">
              {fa(product.price)} <span className="text-xs font-medium tdim">تومان</span>
            </p>
          </div>
          <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl soft px-3 text-xs font-bold tdim transition-all duration-300 group-hover:bg-brand-500 group-hover:text-[#fff] group-hover:shadow-lg group-hover:shadow-brand-500/30">
            {leather ? "سفارش" : "مشاهده"}
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
