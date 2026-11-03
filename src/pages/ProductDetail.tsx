import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
 ArrowLeft,
 BadgeCheck,
 ChevronLeft,
 Minus,
 PackageSearch,
 Plus,
 ShieldCheck,
 ShoppingBag,
 Truck,
 Zap,
} from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { Breadcrumbs, PageHero, Stars } from "@/components/ui";
import { getProduct, getProducts } from "@/lib/catalog";
import { MAT_SLOTS, REVIEWS } from "@/data/content";
import { LeatherCanvas } from "@/components/store/LeatherCanvas";
import { LeatherPicker, MAT_PATTERN, ThreadPicker, LeatherGrain } from "@/components/store/Swatches";
import { useCart } from "@/lib/cart";
import { cn, discountPercent, fa, faDate } from "@/lib/format";
import { leatherById, threadById } from "@/lib/options";

const SAMPLE_PIECE = { margin: 34, radius: 38, binding: 22 };

function ReviewForm({ slug }: { slug: string }) {
 const [name, setName] = useState("");
 const [city, setCity] = useState("");
 const [rating, setRating] = useState(5);
 const [comment, setComment] = useState("");
 const [done, setDone] = useState(false);

 const submit = () => {
  if (name.trim().length < 2 || comment.trim().length < 5) return;
  const key = `50500_reviews_${slug}`;
  const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as { name: string; city: string; rating: number; comment: string; date: string }[];
  prev.unshift({ name: name.trim(), city: city.trim(), rating, comment: comment.trim(), date: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
  setDone(true);
  setName(""); setCity(""); setComment(""); setRating(5);
  setTimeout(() => setDone(false), 2500);
  window.dispatchEvent(new Event("50500:reviews"));
 };

 return (
  <div className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
   <h3 className="text-sm font-black">نظر خود را ثبت کنید</h3>
   {done && <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">نظر شما ثبت شد و پس از بررسی منتشر می‌شود. ممنون!</p>}
   <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <input className="input" placeholder="نام شما" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
    <input className="input" placeholder="شهر (اختیاری)" value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} />
   </div>
   <div className="mt-3 flex items-center gap-2">
    <span className="text-xs font-bold tdim">امتیاز:</span>
    <div className="flex gap-1">
     {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} onClick={() => setRating(s)} aria-label={`${fa(s)} étoile`} className={cn("text-xl transition", s <= rating ? "text-amber-400" : "tfaint")}>★</button>
     ))}
    </div>
   </div>
   <textarea
    className="input mt-3 min-h-24 resize-y"
    placeholder="تجربه خود از این محصول را بنویسید..."
    value={comment}
    onChange={(e) => setComment(e.target.value)}
    maxLength={600}
   />
   <button onClick={submit} disabled={name.trim().length < 2 || comment.trim().length < 5} className="btn btn-primary mt-3 px-5 py-2.5 text-sm">
    ثبت نظر
   </button>
  </div>
 );
}

export default function ProductDetail() {
 const { slug } = useParams();
 const product = getProduct(slug);
 const { addItem } = useCart();
 const navigate = useNavigate();

 const [leather, setLeather] = useState("black");
 const [thread, setThread] = useState("red");
 const [qty, setQty] = useState(1);
 const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");
 const [view, setView] = useState<"sample" | number>("sample");
 const [, force] = useState(0);

 const localReviews = useMemo(() => {
  if (!slug) return [];
  try {
   return JSON.parse(localStorage.getItem(`50500_reviews_${slug}`) ?? "[]") as { name: string; city: string; rating: number; comment: string; date: string }[];
  } catch {
   return [];
  }
 }, [slug, force]);

 if (!product) {
  return (
   <>
    <PageHero eyebrow="خطای ۴۰۴" title="محصول یافت نشد" desc="ممکن است آدرس محصول تغییر کرده باشد." />
    <div className="container-x grid place-items-center gap-3 py-20 text-center">
     <PackageSearch className="size-10 tfaint" />
     <Link to="/products" className="btn btn-primary px-6 py-3 text-sm">رفتن به فروشگاه <ArrowLeft className="size-4" /></Link>
    </div>
   </>
  );
 }

 const isLeather = product.optionsType === "leather";
 const gallery = isLeather ? MAT_SLOTS.map((s) => s.image) : product.images;
 const L = leatherById(leather);
 const T = threadById(thread);
 const mainImageIndex = typeof view === "number" ? Math.min(view, gallery.length - 1) : 0;
 const off = discountPercent(product.price, product.comparePrice);
 const related = getProducts()
  .filter((p) => p.slug !== product.slug && (p.brandSlug ? p.brandSlug === product.brandSlug : p.category === product.category))
  .slice(0, 4);

 const addToCart = (goCheckout = false) => {
  addItem({ slug: product.slug, qty, leather: isLeather ? leather : undefined, thread: isLeather ? thread : undefined });
  if (goCheckout) navigate("/checkout");
 };

 const reviews = [...localReviews, ...REVIEWS.slice(0, 3).map((r) => ({ ...r, date: "" }))];

 return (
  <>
   <PageHero eyebrow={product.brandName ?? "لوازم جانبی"} title={product.title}>
    <Breadcrumbs
     items={[
      { href: "/products", label: "فروشگاه" },
      { href: `/products?category=${product.category}`, label: product.category === "embroidered-leather" ? "کفپوش چرمی گلدوزی" : "لوازم جانبی" },
      ...(product.brandName && product.brandSlug ? [{ href: `/products?brand=${product.brandSlug}`, label: product.brandName }] : []),
      { label: product.title },
     ]}
    />
   </PageHero>

   <div className="container-x py-8 lg:py-12">
    <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold tdim transition-colors hover:text-brand-300">
     <ChevronLeft className="size-4 rotate-180" /> بازگشت
    </button>

    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
     {/* gallery */}
     <div>
      <div className="relative aspect-square overflow-hidden rounded-[2rem] border bd" style={{ background: "var(--muted-surface)" }}>
                {isLeather && view === "sample" ? (
                  <>
                    <LeatherCanvas
                      leather={L.hex}
                      thread={T.hex}
                      pattern={MAT_PATTERN}
                      units={480}
                      cell={64}
                      piece={SAMPLE_PIECE}
                      maxPixels={440_000}
                      className="absolute inset-0 size-full drop-shadow-[0_22px_26px_rgba(0,0,0,0.55)]"
                      label={`نمونه کفپوش با چرم ${L.name} و گلدوزی ${T.name}`}
                    />
                    <LeatherGrain />
                    <span className="glass absolute start-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tdim">
                      <span className="size-2 rounded-full bg-brand-400" /> پیش‌نمایش ترکیب انتخابی
                    </span>
                    <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
                      <span className="glass flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full !bg-ink-950/70 px-4 py-2 text-xs text-white">
                        <span>چرم {L.name}</span>
                        <span className="size-1 rounded-full bg-brand-400" />
                        <span>گلدوزی {T.name}</span>
                      </span>
                    </div>
                  </>
                ) : (
                  <img
                    src={gallery[mainImageIndex] ?? product.image}
                    alt={product.title}
                    className={`h-full w-full ${isLeather ? "bg-photo object-contain p-4" : "object-cover"}`}
                  />
                )}
       {off > 0 && (
        <span className="absolute end-4 top-4 rounded-full bg-gradient-to-l from-brand-500 to-rose-500 px-3 py-1.5 text-xs font-black text-white shadow-lg">
         {fa(off)}٪ تخفیف
        </span>
       )}
       {!isLeather && (
        <span className="absolute start-4 top-4 rounded-full scrim px-3 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur">
         {product.category === "accessories" ? "لوازم جانبی" : product.brandName}
        </span>
       )}
      </div>
            {gallery.length > 0 && (
       <div className="mt-3 grid grid-cols-4 gap-3">
                {isLeather && (
                  <button
                    type="button"
                    onClick={() => setView("sample")}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-2xl border transition",
                      view === "sample" ? "border-brand-500 ring-1 ring-brand-500/35" : "bd opacity-80 hover:opacity-100",
                    )}
                    aria-label="پیش‌نمایش ترکیب انتخابی"
                  >
                    <LeatherCanvas leather={L.hex} thread={T.hex} pattern={MAT_PATTERN} units={110} cell={40} maxPixels={30_000} className="size-full" />
                    <span className="absolute inset-x-0 bottom-0 scrim py-1 text-center text-[10px] font-bold text-white">ترکیب من</span>
                  </button>
                )}
        {gallery.map((g, i) => (
         <button
          key={g}
          onClick={() => {
                      setView(i);
           if (isLeather) {
            const slot = MAT_SLOTS[i];
            if (slot.key.startsWith("tan")) setLeather("tan");
            else if (slot.key.startsWith("brown")) setLeather("brown");
            else setLeather("black");
           }
          }}
          className={cn(
           "aspect-square overflow-hidden rounded-2xl border transition",
                      (typeof view === "number" && view === i) ? "border-brand-500 ring-1 ring-brand-500/40" : "bd opacity-70 hover:opacity-100",
          )}
          style={{ background: "var(--muted-surface)" }}
         >
          <img src={g} alt="" className="h-full w-full object-cover" />
         </button>
        ))}
       </div>
      )}
      {isLeather && (
       <p className="mt-3 rounded-2xl border border-dashed bd px-4 py-3 text-[11px] leading-6 tfaint">
           {view === "sample" ? `چرم ${L.name} · گلدوزی ${T.name}` : MAT_SLOTS[view]?.label ?? ""} — برای دیدن بافت دوخت، نمونه رنگ را انتخاب کنید.
       </p>
      )}
     </div>

     {/* buy box */}
     <div>
      <h1 className="text-2xl font-black leading-10 sm:text-3xl sm:leading-[2.75rem]">{product.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
       <Stars value={product.rating} />
       <span className="font-bold text-amber-300">{fa(product.rating)}</span>
       <span className="tfaint">({fa(product.ratingCount)} نظر)</span>
       <span className="h-3 w-px" style={{ background: "var(--line)" }} />
       <span className="tdim">{fa(product.salesCount)}+ فروش</span>
      </div>

      <div className="mt-5 rounded-3xl border bd p-5" style={{ background: "var(--surface-1)" }}>
       <div className="flex items-end gap-3">
        {product.comparePrice && off > 0 && (
         <span className="pb-1 text-sm tdim line-through decoration-rose-400/60">{fa(product.comparePrice)} تومان</span>
        )}
        <span className="text-3xl font-black">{fa(product.price)}</span>
        <span className="pb-1 text-sm tdim">تومان</span>
       </div>

       {isLeather && (
        <div className="mt-5 grid gap-5">
              <div className="relative h-20 overflow-hidden rounded-2xl ring-1 ring-[var(--line)] lg:hidden">
                <LeatherCanvas leather={L.hex} thread={T.hex} pattern={MAT_PATTERN} units={260} cell={46} maxPixels={60_000} className="absolute inset-0 size-full" />
                <span className="absolute bottom-2 start-2 rounded-full scrim px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  چرم {L.name} · گلدوزی {T.name}
                </span>
              </div>
              <LeatherPicker
                value={leather}
                threadHex={T.hex}
                onChange={(id) => { setLeather(id); setView("sample"); }}
              />
              <ThreadPicker
                value={thread}
                onChange={(id) => { setThread(id); setView("sample"); }}
              />
        </div>
       )}

       <div className="mt-6 flex items-center gap-3">
        <div className="flex items-center rounded-xl border bd" style={{ background: "var(--field)" }}>
         <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center transition soft-h" aria-label="کاهش تعداد">
          <Minus className="size-4" />
         </button>
         <span className="w-10 text-center text-sm font-black">{fa(qty)}</span>
         <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="grid size-11 place-items-center transition soft-h" aria-label="افزایش تعداد">
          <Plus className="size-4" />
         </button>
        </div>
        <span className="text-xs tfaint">موجودی: {fa(product.stock)} عدد</span>
       </div>

       <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <button onClick={() => addToCart(false)} className="btn btn-ghost py-3.5 text-sm">
         <ShoppingBag className="size-4.5" /> افزودن به سبد
        </button>
        <button onClick={() => addToCart(true)} className="btn btn-primary shine py-3.5 text-sm">
         <Zap className="size-4.5" /> خرید فوری
        </button>
       </div>
      </div>

      <ul className="mt-5 grid gap-2.5 text-xs tdim sm:grid-cols-3">
       <li className="flex items-center gap-2 rounded-2xl border bd p-3" style={{ background: "var(--surface-1)" }}>
        <ShieldCheck className="size-4.5 shrink-0 text-brand-400" /> گارانتی ۱۲ ماهه
       </li>
       <li className="flex items-center gap-2 rounded-2xl border bd p-3" style={{ background: "var(--surface-1)" }}>
        <Truck className="size-4.5 shrink-0 text-brand-400" /> ارسال: {product.delivery}
       </li>
       <li className="flex items-center gap-2 rounded-2xl border bd p-3" style={{ background: "var(--surface-1)" }}>
        <BadgeCheck className="size-4.5 shrink-0 text-brand-400" /> هولوگرام اصالت
       </li>
      </ul>
     </div>
    </div>

    {/* tabs */}
    <div className="mt-12">
     <div className="flex flex-wrap gap-2 border-b bd pb-3">
      {(
       [
        ["desc", "توضیحات"],
        ["specs", "مشخصات فنی"],
        ["reviews", `نظرات (${fa(reviews.length)})`],
       ] as const
      ).map(([id, label]) => (
       <button
        key={id}
        onClick={() => setTab(id)}
        className={cn(
         "rounded-full px-5 py-2.5 text-sm font-bold transition-all",
         tab === id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "chip",
        )}
       >
        {label}
       </button>
      ))}
     </div>

     <div className="mt-8">
      {tab === "desc" && (
       <div className="max-w-3xl whitespace-pre-line text-sm leading-8 tdim">{product.body}</div>
      )}
      {tab === "specs" && (
       <div className="max-w-3xl overflow-hidden rounded-3xl border bd" style={{ background: "var(--surface-1)" }}>
        {product.specs.length === 0 ? (
         <p className="p-6 text-sm tdim">مشخصات فنی برای این محصول ثبت نشده است.</p>
        ) : (
         product.specs.map((s, i) => (
          <div key={s.label} className={cn("grid grid-cols-[140px_1fr] gap-3 px-5 py-3.5 text-sm", i > 0 && "border-t bd")}>
           <span className="font-bold tfaint">{s.label}</span>
           <span className="font-bold">{s.value}</span>
          </div>
         ))
        )}
       </div>
      )}
      {tab === "reviews" && (
       <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 content-start">
         {reviews.map((r, i) => (
          <figure key={i} className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
           <div className="flex items-center justify-between">
            <span>
             <b className="block text-sm">{r.name}</b>
             <span className="text-[11px] tfaint">{r.city}{r.date ? ` · ${faDate(r.date)}` : ""}</span>
            </span>
            <Stars value={r.rating} className="size-3.5" />
           </div>
           <blockquote className="mt-3 text-[13px] leading-7 tdim">{r.comment}</blockquote>
          </figure>
         ))}
        </div>
        <ReviewForm slug={product.slug} />
       </div>
      )}
     </div>
    </div>

    {/* related */}
    {related.length > 0 && (
     <div className="mt-16">
      <h2 className="mb-6 text-xl font-black sm:text-2xl">محصولات مرتبط</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
       {related.map((p) => (
        <ProductCard key={p.slug} product={p} />
       ))}
      </div>
     </div>
    )}
   </div>
  </>
 );
}
