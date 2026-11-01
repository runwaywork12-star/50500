"use client";

import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Car, Flame, Info, Minus, Palette, Plus, ShieldCheck, ShoppingBag, Timer, Undo2, Zap } from "lucide-react";
import { LeatherCanvas } from "./LeatherCanvas";
import { LeatherPicker, MAT_PATTERN, ThreadPicker } from "./Swatches";
import { Stars } from "@/components/ui";
import { MobileBuyBar } from "@/components/home/MobileBuyBar";
import { useCart, type CartOption } from "@/lib/cart";
import { cn, compactFa, discountPercent, fa } from "@/lib/format";
import { OPTION_LABELS, leatherById, threadById } from "@/lib/options";
import { themePath } from "@/lib/theme-path";

export type ExperienceProduct = {
  id: number;
  slug: string;
  title: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  rating: number;
  ratingCount: number;
  salesCount: number;
  stock: number;
  deliveryDays: string;
  summary: string;
};

const SAMPLE_PIECE = { margin: 34, radius: 38, binding: 22 };

export function ProductExperience({
  product,
  category,
  carName,
}: {
  product: ExperienceProduct;
  category: { slug: string; shortName: string; optionsType: string };
  carName: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const lightTheme = pathname === "/v2" || Boolean(pathname?.startsWith("/v2/"));
  const { add } = useCart();
  const isLeather = category.optionsType === "leather";
  const [view, setView] = useState<"sample" | number>(0);
  const [leather, setLeather] = useState("black");
  const [thread, setThread] = useState("red");
  const [qty, setQty] = useState(1);
  const off = discountPercent(product.price, product.comparePrice);
  const inStock = product.stock > 0;
  const L = leatherById(leather);
  const T = threadById(thread);

  const options: CartOption[] = isLeather
    ? [
        { key: "leather", label: OPTION_LABELS.leather, value: L.name, hex: L.hex },
        { key: "thread", label: OPTION_LABELS.thread, value: T.name, hex: T.hex },
      ]
    : [];

  const choose =
    <V,>(fn: (v: V) => void) =>
    (v: V) => {
      fn(v);
      setView("sample");
    };

  const addToCart = (buyNow = false) => {
    add(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: product.images[0] ?? "",
        price: product.price,
        comparePrice: product.comparePrice,
        options,
      },
      qty,
      buyNow,
    );
    if (buyNow) router.push(themePath(pathname, "/checkout"));
  };

  return (
    <>
    <section className="container-x mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="product-detail-stage relative aspect-square overflow-hidden rounded-[2rem] border bd bg-[radial-gradient(ellipse_at_50%_35%,#232833,#07080b_75%)]">
          {view === "sample" && isLeather ? (
            <>
              <LeatherCanvas
                leather={L.hex}
                thread={T.hex}
                pattern={MAT_PATTERN}
                units={480}
                cell={64}
                piece={SAMPLE_PIECE}
                maxPixels={440_000}
                className="absolute inset-0 size-full animate-fade-up drop-shadow-[0_22px_26px_rgba(0,0,0,0.6)]"
                label="نمونه رنگ انتخابی"
              />
              <span className="glass absolute start-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tdim">
                <Palette className="size-3.5 text-brand-300" /> نمونه رنگ انتخابی شما
              </span>
              <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
                <span className="glass flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full !bg-ink-950/70 px-4 py-2 text-xs tdim">
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full ring-1 ring-[var(--line)]" style={{ background: L.hex }} /> چرم {L.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full ring-1 ring-[var(--line)]" style={{ background: T.hex }} /> گلدوزی {T.name}
                  </span>
                </span>
              </div>
            </>
          ) : (
            <Image
              src={product.images[typeof view === "number" ? view : 0] ?? product.images[0] ?? "/api/site-image/mat"}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={`animate-fade-up ${isLeather ? "object-contain bg-photo p-4" : "object-cover"}`}
            />
          )}
          {off > 0 && (
            <span className="absolute end-4 top-4 rounded-full bg-linear-to-l from-brand-500 to-rose-500 px-3 py-1.5 text-xs font-black text-[#fff] shadow-lg">
              {fa(off)}٪ تخفیف
            </span>
          )}
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto p-0.5">
          {isLeather && (
            <button
              type="button"
              onClick={() => setView("sample")}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden rounded-2xl border transition",
                view === "sample" ? "border-brand-500" : "bd opacity-80 hover:opacity-100",
              )}
              aria-label="نمونه رنگ انتخابی"
            >
              <LeatherCanvas leather={L.hex} thread={T.hex} pattern={MAT_PATTERN} units={110} cell={40} maxPixels={30_000} className="size-full" />
              <span className="absolute inset-x-0 bottom-0 scrim py-0.5 text-center text-[10px] font-bold text-white">نمونه رنگ</span>
            </button>
          )}
          {product.images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setView(i)}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden rounded-2xl border transition",
                view === i ? "border-brand-500" : "bd opacity-70 hover:opacity-100",
              )}
              aria-label={`تصویر ${fa(i + 1)}`}
            >
              <Image src={src} alt="" fill sizes="80px" className={isLeather ? "bg-photo object-contain p-1" : "object-cover"} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/products?category=${category.slug}`} className="chip chip-active">
            {category.shortName}
          </Link>
          {carName && (
            <span className="chip">
              <Car className="size-3.5" /> مخصوص {carName}
            </span>
          )}
          <span className={cn("chip", inStock ? "text-emerald-300" : "text-rose-300")}>
            <span className={cn("size-2 rounded-full", inStock ? "bg-emerald-400" : "bg-rose-400")} />
            {inStock ? "آماده سفارش" : "ناموجود"}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-black leading-[1.7] sm:text-3xl">{product.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm tdim">
          <span className="flex items-center gap-2">
            <Stars value={product.rating} />
            <b className="text-white">{fa(product.rating)}</b>({fa(product.ratingCount)} امتیاز)
          </span>
          <span className="flex items-center gap-1.5">
            <Flame className="size-4 text-brand-400" /> {compactFa(product.salesCount)} فروش موفق
          </span>
        </div>
        <p className="mt-5 text-sm leading-8 tdim">{product.summary}</p>

        <div className="surface mt-6 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {off > 0 && product.comparePrice && (
                <div className="flex items-center gap-2">
                  <span className="text-sm tdim line-through">{fa(product.comparePrice)}</span>
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-300">{fa(off)}٪ تخفیف</span>
                </div>
              )}
              <p className="mt-1 text-3xl font-black">
                {fa(product.price)} <span className="text-sm font-medium tdim">تومان</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full soft px-3 py-1.5 text-xs tdim">
              <Timer className="size-4 text-brand-400" /> تولید و ارسال: {product.deliveryDays}
            </div>
          </div>

          {isLeather && (
            <div className="mt-6 grid gap-6 border-t bd pt-6">
              <div className="relative h-20 overflow-hidden rounded-2xl ring-1 ring-[var(--line)] lg:hidden">
                <LeatherCanvas leather={L.hex} thread={T.hex} pattern={MAT_PATTERN} units={260} cell={46} maxPixels={60_000} className="absolute inset-0 size-full" label="نمونه رنگ انتخابی" />
                <span className="absolute bottom-2 start-2 rounded-full scrim px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  چرم {L.name} · گلدوزی {T.name}
                </span>
              </div>
              <LeatherPicker value={leather} onChange={choose(setLeather)} threadHex={T.hex} />
              <ThreadPicker value={thread} onChange={choose(setThread)} />
              <p className="flex items-start gap-2 rounded-2xl soft p-3 text-xs leading-6 tdim">
                <Info className="mt-0.5 size-4 shrink-0 text-brand-300" />
                طرح گلدوزی همه کفپوش‌ها لوزی (الماسی) است؛ فقط رنگ چرم و رنگ نخ را انتخاب کنید. رنگ‌ها بسته به نمایشگر ممکن است کمی متفاوت دیده شوند.
              </p>
            </div>
          )}

          <div id="buy-cta" className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-2xl border bd soft">
              <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} className="grid size-12 place-items-center tdim hover:text-white" aria-label="افزایش">
                <Plus className="size-4" />
              </button>
              <span className="w-8 text-center text-lg font-black">{fa(qty)}</span>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-12 place-items-center tdim hover:text-white" aria-label="کاهش">
                <Minus className="size-4" />
              </button>
            </div>
            <button type="button" onClick={() => addToCart()} disabled={!inStock} className="btn btn-primary shine min-w-48 flex-1 py-4 text-base">
              <ShoppingBag className="size-5" /> افزودن به سبد خرید
            </button>
            <button type="button" onClick={() => addToCart(true)} disabled={!inStock} className="btn btn-ghost px-5 py-4">
              <Zap className="size-4 text-brand-300" /> خرید فوری
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: ShieldCheck, t: "۱۲ ماه گارانتی" },
            { icon: Undo2, t: "۷ روز ضمانت بازگشت" },
            { icon: BadgeCheck, t: "ضمانت اصالت کالا" },
          ].map((g) => (
            <div key={g.t} className="flex flex-col items-center gap-2 rounded-2xl border bd soft p-3 text-center text-[11px] tdim sm:text-xs">
              <g.icon className="size-6 text-brand-400" />
              {g.t}
            </div>
          ))}
        </div>
      </div>
    </section>
    <MobileBuyBar price={product.price} comparePrice={product.comparePrice} inStock={inStock} onAdd={() => addToCart()} variant={lightTheme ? "light" : "dark"} />
    </>
  );
}
