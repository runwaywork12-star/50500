import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
 ArrowLeft,
 BadgeCheck,
 ChevronLeft,
 Minus,
 Move,
 PackageSearch,
 Plus,
 ShieldCheck,
 ShoppingBag,
 Truck,
} from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { Breadcrumbs, PageHero, Stars } from "@/components/ui";
import { carArtSvg } from "@/components/store/CarArt";
import { getProduct, getProducts, type Product } from "@/lib/catalog";
import { REVIEWS } from "@/data/content";

import { MatDesigner } from "@/components/store/MatDesigner";
import { StitchPreview } from "@/components/store/StitchPreview";
import { useCart } from "@/lib/cart";
import { cn, discountPercent, fa, faDate, money } from "@/lib/format";
import { leatherById, threadById } from "@/lib/options";
import { getSubItems } from "@/lib/product-overrides";
import { useSiteContent } from "@/lib/site-content";
import { carImageFor } from "@/lib/car-images";
import { ManagedImage } from "@/components/ManagedImage";


function ProductDetailHero({ product }: { product: Product }) {
  const brand = product.brandName ?? "کفپوش اختصاصی";
  const model = product.modelName ?? "";
  const { content } = useSiteContent();
  const carPhoto = carImageFor(content.imageSlots, product.brandSlug ?? undefined, product.modelSlug ?? undefined);
  const hash = (product.brandSlug ?? "").length * 7 + (product.modelSlug ?? "").length * 3;
  const startYear = 1392 + (hash % 8);
  const years = `${fa(startYear)} تا ${fa(1404)}`;
  return (
    <section className="pdv-section">
      <div className="container-x pdv-wrap">
        <Breadcrumbs
          items={[
            { href: "/", label: "خانه" },
            { href: "/products", label: "فروشگاه" },
            ...(product.brandName && product.brandSlug ? [{ href: `/products?brand=${product.brandSlug}`, label: product.brandName }] : []),
            { label: product.title },
          ]}
        />
        <div className="pdv-panel" dir="ltr">
          <div className="pdv-media">
            {carPhoto ? (
              <ManagedImage src={carPhoto} alt={`${brand} ${model}`} className="pdv-art-img" />
            ) : (
              <div className="pdv-art" role="img" aria-label={`${brand} ${model}`} dangerouslySetInnerHTML={{ __html: carArtSvg(model || brand || "") }} />
            )}
            <span className="pdv-model-badge">{brand}{model ? ` ${model}` : ""}</span>
          </div>
          <div className="pdv-copy" dir="rtl">
            <span className="pdv-eyebrow">کفپوش اختصاصی 50500</span>
            <h1 className="pdv-title">{product.title}</h1>
            <p className="pdv-desc">کفپوش چرمی گلدوزی پنجبعدی، قالبگیری شده دقیقاً برای کف این خودرو.</p>
            <div className="pdv-chips">
              <span className="pdv-chip">مدل: {brand}{model ? ` ${model}` : ""}</span>
              <span className="pdv-chip">سال ساخت: {years}</span>
              <span className="pdv-chip">قالب اختصاصی</span>
            </div>
            <Link to="/products" className="pdv-link">
              تغییر خودرو
              <ArrowLeft className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

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
 const [thread, setThread] = useState("white");
 const [qty, setQty] = useState(1);
 const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");
 const [view, setView] = useState<"preview" | number>("preview");
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
 /* No ready-made combinations: the live preview is the product, plus the
    manufacturer photos of this exact mat (if any). */
 const photos = product.images.filter((src) => src !== product.image || !isLeather);
 const gallery = isLeather ? photos : product.images;
 const L = leatherById(leather);
 const T = threadById(thread);
 const off = discountPercent(product.price, product.comparePrice);
 const related = getProducts()
  .filter((p) => p.slug !== product.slug && (p.brandSlug ? p.brandSlug === product.brandSlug : p.category === product.category))
  .slice(0, 4);

 const addToCart = () => {
  addItem({ slug: product.slug, qty, leather: isLeather ? leather : undefined, thread: isLeather ? thread : undefined });
 };

 const reviews = [...localReviews, ...REVIEWS.slice(0, 3).map((r) => ({ ...r, date: "" }))];

 return (
  <>
   <ProductDetailHero product={product} />

   <div className="container-x py-8 lg:py-12">
    <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold tdim transition-colors hover:text-brand-300">
     <ChevronLeft className="size-4 rotate-180" /> بازگشت
    </button>

     <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* gallery */}
      <div className="pd-gallery">
       <div
        className={cn(
          "pd-preview relative aspect-[16/10] sm:aspect-square",
          !(isLeather && view === "preview") && "overflow-hidden rounded-[1.4rem] border bd sm:rounded-[2rem]",
        )}
        style={isLeather && view === "preview" ? undefined : { background: "var(--muted-surface)" }}
       >
 {isLeather && view === "preview" ? (
                    <>
                      <StitchPreview
                        leather={L.hex}
                        thread={T.hex}
                        className="absolute inset-0"
                        label={`پیش‌نمایش کفپوش با چرم ${L.name} و گلدوزی ${T.name}`}
                      />
                      <span className="glass absolute start-3 top-3 flex max-w-[70%] items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tdim sm:start-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-[11px]">
                       <span className="size-2 shrink-0 rounded-full bg-brand-400" /> پیش‌نمایش زنده
                     </span>
                     <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-14 sm:bottom-4">
                       <span className="glass flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full !bg-ink-950/70 px-3.5 py-1.5 text-[11px] text-white sm:gap-x-3 sm:text-xs">
                         <span className="truncate">چرم {L.name} · گلدوزی {T.name}</span>
                         <span className="hidden size-1 shrink-0 rounded-full bg-brand-400 sm:block" />
                         <span className="hidden items-center gap-1 text-white/70 sm:inline-flex">
                           <Move className="size-3" /> با انگشت جابه‌جا کن
                         </span>
                       </span>
                     </div>
                   </>
                 ) : (
                   <img
                     src={gallery[typeof view === "number" ? Math.min(view, gallery.length - 1) : 0] ?? product.image}
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
 {isLeather && (
       <div className="mat-designer-compact mt-3 lg:hidden">
        <MatDesigner
          leather={leather}
          thread={thread}
          onLeather={(id) => { setLeather(id); setView("preview"); }}
          onThread={(id) => { setThread(id); setView("preview"); }}
        />
       </div>
 )}
 {(isLeather || gallery.length > 0) && (
       <div className="pd-thumbs mt-3 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
         {isLeather && (
           <button
             type="button"
             onClick={() => setView("preview")}
             className={cn(
               "relative size-16 shrink-0 overflow-hidden rounded-2xl border transition sm:size-20",
               view === "preview" ? "border-brand-500 ring-1 ring-brand-500/35" : "bd opacity-80 hover:opacity-100",
             )}
             aria-label="پیش‌نمایش زنده ترکیب انتخابی"
             aria-pressed={view === "preview"}
           >
             <span className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${L.hex}, ${T.hex})` }} />
             <span className="absolute inset-x-0 bottom-0 py-1 text-center text-[9.5px] font-bold text-white" style={{ background: "rgba(5,6,8,.55)" }}>
               پیش‌نمایش
             </span>
           </button>
         )}
         {gallery.map((g, i) => (
           <button
             key={g}
             onClick={() => setView(i)}
             className={cn(
               "size-16 shrink-0 overflow-hidden rounded-2xl border transition sm:size-20",
               (typeof view === "number" && view === i) ? "border-brand-500 ring-1 ring-brand-500/40" : "bd opacity-70 hover:opacity-100",
             )}
             style={{ background: "var(--muted-surface)" }}
             aria-label={`تصویر ${fa(i + 1)} محصول`}
           >
             <img src={g} alt="" className="h-full w-full object-cover" />
           </button>
         ))}
       </div>
      )}
      {isLeather && (
       <p className="mt-3 flex items-start gap-2 rounded-2xl border border-dashed bd px-4 py-3 text-[11px] leading-6 tfaint">
         <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-400" />
         <span>
           ترکیب دلخواهت را از رنگ چرم و نخ انتخاب کن و بافت را <b className="font-bold text-brand-300">با انگشت جابه‌جا کن</b> —
           چرم <b>{L.name}</b> با گلدوزی <b>{T.name}</b>
         </span>
       </p>
      )}
     </div>

          {/* buy box */}
     <div>
      <h2 className="text-2xl font-black leading-10 sm:text-3xl sm:leading-[2.75rem]">{product.title}</h2>
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
        <div className="mt-4 hidden lg:block">
          <MatDesigner
            leather={leather}
            thread={thread}
            onLeather={(id) => { setLeather(id); setView("preview"); }}
            onThread={(id) => { setThread(id); setView("preview"); }}
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

       <div id="buy-cta" className="mt-5">
        <button onClick={() => addToCart()} disabled={product.stock === 0} className="btn btn-primary shine w-full py-3.5 text-sm disabled:opacity-50">
         <ShoppingBag className="size-4.5" /> {product.stock === 0 ? "ناموجود" : "افزودن به سبد خرید"}
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

    <div className="mobile-buybar fixed inset-x-0 z-30 px-3 lg:hidden" aria-label="افزودن سریع به سبد">
      <div
        className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border bd p-2.5 shadow-2xl backdrop-blur-xl"
        style={{ background: "color-mix(in srgb, var(--panel) 92%, transparent)" }}
      >
        <div className="min-w-0 flex-1 ps-1">
          {product.comparePrice && off > 0 && <p className="text-[10px] tdim line-through">{fa(product.comparePrice)}</p>}
          <p className="truncate text-sm font-black">
            {fa(product.price)} <span className="text-[10px] font-medium tdim">تومان</span>
          </p>
          {isLeather && (
            <p className="truncate text-[10px] tdim">
              چرم {L.name} · گلدوزی {T.name}
            </p>
          )}
        </div>
        <button
          onClick={() => addToCart()}
          disabled={product.stock === 0}
          className="btn btn-primary shine shrink-0 px-4 py-2.5 text-xs disabled:opacity-50"
        >
          <ShoppingBag className="size-4" /> {product.stock === 0 ? "ناموجود" : "افزودن به سبد"}
        </button>
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

    {/* sub-items (زیر مجموعه) defined from the admin panel */}
    {(() => {
      const subs = getSubItems(product.slug);
      if (subs.length === 0) return null;
      return (
        <div className="mt-12 rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
          <h2 className="text-xl font-black">زیر مجموعه‌های این محصول</h2>
          <p className="mt-1 text-xs tdim">لوازم جانبی تکمیلی که می‌توانید همراه کفپوش سفارش دهید.</p>
          <div className="mt-4 grid gap-3">
            {subs.map((sub) => (
              <div key={sub.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bd p-3" style={{ background: "var(--field)" }}>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{sub.title}</b>
                  {sub.desc && <span className="mt-0.5 block text-[11px] tdim">{sub.desc}</span>}
                  <span className="mt-1 block text-[11px] tdim">{money(sub.price)} تومان{sub.stock > 0 ? ` · موجودی ${fa(sub.stock)}` : " · فعلاً ناموجود"}</span>
                </div>
                <button
                  onClick={() => addItem({ slug: `sub:${product.slug}:${sub.id}`, qty: 1 })}
                  disabled={sub.stock <= 0}
                  className="btn btn-primary px-4 py-2 text-xs disabled:opacity-40"
                >
                  <ShoppingBag className="size-3.5" /> افزودن به سبد
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    })()}

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
    {/* breathing room above the fixed mobile buy bar */}
    <div className="h-24 lg:hidden" aria-hidden="true" />
   </div>
  </>
 );
}
