import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CarFront, ChevronLeft, Home, LayoutGrid, Phone, Search, ShoppingBag, Sparkles, UserRound, X } from "lucide-react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { BRANDS } from "@/lib/catalog";
import { CAR_GROUPS, POPULAR_BRANDS } from "@/data/content";
import { useSiteContent } from "@/lib/site-content";
import { cn, fa } from "@/lib/format";
import { ManagedImage } from "@/components/ManagedImage";

/**
 * Thumb-friendly bottom navigation for phones. Hidden on the admin panel
 * and from the `lg` breakpoint up, where the header navigation takes over.
 */
export function MobileTabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { count } = useCart();
  const { user } = useAuth();
  const { content } = useSiteContent();
  const [sheet, setSheet] = useState(false);

  useEffect(() => { setSheet(false); }, [pathname]);
  useEffect(() => {
    if (!sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [sheet]);

  const active = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));
  const scrollToFinder = () => {
    if (pathname !== "/") { navigate("/"); setTimeout(() => document.getElementById("car-finder")?.scrollIntoView({ behavior: "smooth", block: "start" }), 350); return; }
    document.getElementById("car-finder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const popular = POPULAR_BRANDS.map((slug) => BRANDS.find((b) => b.slug === slug)).filter((b): b is NonNullable<typeof b> => Boolean(b)).slice(0, 8);

  const tabClass = (on: boolean) => cn("mobile-tab flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[10px] font-bold transition", on ? "mobile-tab-active text-brand-300" : "tdim");

  return (
    <>
      <nav className="mobile-tabbar fixed inset-x-0 bottom-0 z-40 lg:hidden" aria-label="ناوبری سریع">
        <div className="mobile-tabbar-inner mx-auto flex max-w-xl items-stretch gap-1 px-2 pt-1.5">
          <Link href="/" className={tabClass(active("/"))} aria-current={active("/") ? "page" : undefined}>
            <span className="mobile-tab-icon"><Home className="size-5" /></span> خانه
          </Link>
          <button type="button" onClick={() => setSheet(true)} className={tabClass(sheet || active("/products"))} aria-haspopup="dialog" aria-expanded={sheet}>
            <span className="mobile-tab-icon"><LayoutGrid className="size-5" /></span> دسته‌ها
          </button>
          <button type="button" onClick={scrollToFinder} className="mobile-tab-primary -mt-5 flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] font-bold text-brand-300" aria-label="انتخاب خودرو و پیدا کردن کفپوش">
            <span className="mobile-tab-primary-icon grid size-14 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-[0_12px_30px_-10px_rgba(255,107,26,0.9)] ring-4 ring-[var(--bg)]">
              <CarFront className="size-6" />
            </span>
            خودروی من
          </button>
          <Link href="/cart" className={cn(tabClass(active("/cart") || active("/checkout")), "relative")} aria-current={active("/cart") ? "page" : undefined}>
            <span className="mobile-tab-icon relative">
              <ShoppingBag className="size-5" />
              {count > 0 && <span className="absolute -end-2 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-white animate-pop">{fa(count)}</span>}
            </span>
            سبد خرید
          </Link>
          <Link href={user ? "/account" : "/login"} className={tabClass(active("/account") || active("/login") || active("/register"))}>
            <span className="mobile-tab-icon">
              {user ? <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-[10px] font-black text-white">{user.name.trim().slice(0, 1)}</span> : <UserRound className="size-5" />}
            </span>
            {user ? "حساب من" : "ورود"}
          </Link>
        </div>
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="دسته‌بندی محصولات">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheet(false)} />
          <div className="mobile-sheet absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[2rem] border-t bd p-5 pb-8 shadow-2xl animate-fade-up" style={{ background: "var(--panel)" }}>
            <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full soft" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between">
              <div><p className="text-base font-black">چی می‌خوای بخری؟</p><p className="mt-0.5 text-[11px] tdim">یک دسته را انتخاب کن یا مستقیم خودرو‌ت را پیدا کن</p></div>
              <button onClick={() => setSheet(false)} className="grid size-10 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-5" /></button>
            </div>

            <button type="button" onClick={() => { setSheet(false); scrollToFinder(); }} className="flex w-full items-center gap-3 rounded-2xl border border-brand-500/35 bg-brand-500/10 p-3.5 text-start transition hover:border-brand-500/60">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white"><CarFront className="size-5" /></span>
              <span className="min-w-0 flex-1"><b className="block text-sm">کفپوش مخصوص خودروی من</b><span className="mt-0.5 block text-[11px] tdim">برند و مدل را انتخاب کن؛ فقط کفپوش‌های فیت خودروت را ببین</span></span>
              <ChevronLeft className="size-4 shrink-0 text-brand-300" />
            </button>

            <p className="mb-2 mt-5 text-[11px] font-black tracking-widest tfaint">بر اساس نوع خودرو</p>
            <div className="grid grid-cols-2 gap-2">
              {CAR_GROUPS.map((group) => {
                const models = BRANDS.filter((b) => group.brands.includes(b.slug)).reduce((sum, b) => sum + b.models.length, 0);
                return (
                  <Link key={group.id} href={`/products?group=${group.id}`} className="flex items-center gap-2.5 rounded-2xl border bd p-2.5 transition soft-h">
                    <span className="size-11 shrink-0 overflow-hidden rounded-xl" style={{ background: "var(--muted-surface)" }}><ManagedImage slot={`home.group.${group.id}`} src={group.image} alt="" className="size-full object-cover" /></span>
                    <span className="min-w-0"><b className="block truncate text-xs">{group.shortName}</b><span className="block text-[10px] tdim">{fa(models)} مدل</span></span>
                  </Link>
                );
              })}
            </div>

            <p className="mb-2 mt-5 text-[11px] font-black tracking-widest tfaint">برندهای پرطرفدار</p>
            <div className="flex flex-wrap gap-2">
              {popular.map((brand) => <Link key={brand.slug} href={`/products?brand=${brand.slug}`} className="chip !text-xs">{brand.name}</Link>)}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/products?category=accessories" className="flex items-center gap-2 rounded-2xl border bd px-3 py-3 text-xs font-bold transition soft-h"><Sparkles className="size-4 text-brand-400" /> لوازم جانبی</Link>
              <Link href="/products?discounted=1&sort=discount" className="flex items-center gap-2 rounded-2xl border bd px-3 py-3 text-xs font-bold transition soft-h"><span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[9px] font-black text-white">٪</span> پیشنهاد ویژه</Link>
              <Link href="/products" className="flex items-center gap-2 rounded-2xl border bd px-3 py-3 text-xs font-bold transition soft-h"><Search className="size-4 text-brand-400" /> همه محصولات</Link>
              <a href={content.contact.phoneHref} className="flex items-center gap-2 rounded-2xl border bd px-3 py-3 text-xs font-bold transition soft-h"><Phone className="size-4 text-brand-400" /> مشاوره تلفنی</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
