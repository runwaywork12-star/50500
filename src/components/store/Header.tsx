import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BadgePercent,
  ChevronDown,
  ChevronLeft,
  Menu,
  Moon,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { useCart } from "@/lib/cart";
import { BRANDS } from "@/lib/catalog";
import { CAR_GROUPS, POPULAR_BRANDS } from "@/data/content";
import { useSiteContent } from "@/lib/site-content";
import { useAuth } from "@/lib/auth.tsx";
import { cn, fa } from "@/lib/format";
import { img } from "@/lib/images";
import styles from "./HeaderMega.module.css";

export function Header({ theme, onToggleTheme }: { theme: "dark" | "light"; onToggleTheme: () => void }) {
  const { count } = useCart();
  const { content } = useSiteContent();
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const megaRef = useRef<HTMLDivElement>(null);
  const restoringFocus = useRef(false);

  const links: { href: string; label: string; mega?: boolean; badge?: string }[] = [
    { href: "/", label: "خانه" },
    { href: "/track", label: "پیگیری سفارش" },
    { href: "/blog", label: "مجله" },
    { href: "/about", label: "درباره ما" },
    { href: "/contact", label: "تماس با ما" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setMegaOpen(false);
  }, [pathname, location.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.key.toLowerCase() === "k") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
        setMegaOpen(false);
        if (megaOpen) {
          restoringFocus.current = true;
          document.getElementById("shop-nav-trigger")?.focus();
          queueMicrotask(() => { restoringFocus.current = false; });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [megaOpen]);

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (href.includes("?")) return false;
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMenuOpen(false);
      setMegaOpen(false);
    }
  };

  const popular = POPULAR_BRANDS.map((slug) => BRANDS.find((b) => b.slug === slug)).filter((b): b is NonNullable<typeof b> => Boolean(b));
  const modelCount = BRANDS.reduce((total, brand) => total + brand.models.length, 0);

  return (
    <>
      {/* mobile announcement strip */}
      <div className="relative z-40 overflow-hidden border-b bd bg-linear-to-l from-brand-600/25 via-ink-900 to-ink-900 text-[11px] md:hidden">
        <div className="container-x site-header-container flex h-8 items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1.5 tdim">
            <Truck className="size-3.5 shrink-0 text-brand-400" />
            <span className="truncate">{content.promoBar.shipping}</span>
          </p>
          <p className="flex shrink-0 items-center gap-1.5 tdim">
            <BadgePercent className="size-3.5 text-brand-400" /> کد
            <b dir="ltr" className="rounded bg-brand-500/20 px-1.5 font-english text-brand-200">{content.promoBar.code}</b>
          </p>
        </div>
      </div>

      {/* announcement top bar */}
      <div className="relative z-40 hidden border-b bd bg-linear-to-l from-brand-600/25 via-ink-900 to-ink-900 text-xs md:block">
        <div className="container-x site-header-container flex h-9 items-center justify-between gap-4">
          <p className="flex items-center gap-2 tdim">
            <Truck className="size-3.5 text-brand-400" /> ارسال به سراسر کشور
          </p>
          <p className="hidden max-w-[34rem] items-center gap-2 truncate tdim xl:flex" title={content.announcement}>
            <Sparkles className="size-3.5 shrink-0 text-brand-400" /> {content.announcement}
          </p>
          <p className="hidden items-center gap-2 tdim md:flex">
            <BadgePercent className="size-3.5 text-brand-400" /> کد
            <b dir="ltr" className="rounded bg-brand-500/20 px-1.5 text-brand-200"><span className="font-english">{content.promoBar.code}</span></b>
            = {content.promoBar.percent} تخفیف ویژه خرید
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <a href={content.contact.phoneHref} className="hidden items-center gap-1.5 py-2 tdim transition-colors hover:text-white sm:flex">
              <Phone className="size-3.5" /> {content.contact.phone}
            </a>

            <button
              onClick={onToggleTheme}
              className="theme-switch-toggle cursor-pointer"
              aria-label={theme === "light" ? "فعال‌کردن تم تاریک" : "فعال‌کردن تم روشن"}
              title={theme === "light" ? "رفتن به حالت شب" : "رفتن به حالت روز"}
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* main header */}
      <header
        onMouseLeave={() => setMegaOpen(false)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMegaOpen(false);
        }}
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b bd bg-ink-950/75 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            : "border-b border-transparent bg-ink-950/30 backdrop-blur-sm",
        )}
      >
        <div className="container-x site-header-container flex h-16 items-center gap-2 sm:h-[72px] sm:gap-3 xl:gap-4">
          <button onClick={() => setMenuOpen(true)} className="grid size-9 place-items-center rounded-xl tdim transition soft-h sm:size-10 lg:hidden" aria-label="باز کردن منو" aria-expanded={menuOpen} aria-controls="mobile-navigation-drawer">
            <Menu className="size-6" />
          </button>
          <Logo />

          <nav className="mx-auto hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1">
            {links.map((l) =>
              l.mega ? (
                <div key={l.href} className={styles.triggerArea} onMouseEnter={() => setMegaOpen(true)}>
                  <Link
                    id="shop-nav-trigger"
                    href={l.href}
                    aria-haspopup="true"
                    aria-expanded={megaOpen}
                    aria-controls="shop-mega-menu"
                    onFocus={() => {
                      if (!restoringFocus.current) setMegaOpen(true);
                    }}
                    onClick={() => setMegaOpen(false)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setMegaOpen(true);
                        window.requestAnimationFrame(() => megaRef.current?.querySelector<HTMLAnchorElement>("a")?.focus());
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors xl:text-sm",
                      isActive(l.href) ? "bg-brand-500/15 text-brand-300" : "tdim hover:text-white hover:bg-white/5",
                      megaOpen && styles.triggerActive,
                    )}
                  >
                    {l.label}
                    <ChevronDown className={cn("size-3.5 opacity-60 transition-transform duration-200", megaOpen && "rotate-180")} />
                  </Link>

                  {/* Mega Menu */}
                  {megaOpen && (
                    <div
                      id="shop-mega-menu"
                      ref={megaRef}
                      role="region"
                      aria-label="دسته‌بندی‌های فروشگاه"
                      className={styles.dropdown}
                      onMouseEnter={() => setMegaOpen(true)}
                      onClick={() => setMegaOpen(false)}
                    >
                      <div className={styles.panel}>
                        <div className={styles.columns}>
                          <div className={styles.categoryColumn}>
                            <p className={styles.overline}>انتخاب محصول</p>
                            <Link href="/products?category=embroidered-leather" className={styles.featuredLink}>
                              <img src={img("images/products/mat-black.webp")} alt="کفپوش چرمی گلدوزی" loading="lazy" decoding="async" className={styles.featureImage} />
                              <span className={styles.featureCopy}>
                                <strong>کفپوش چرمی گلدوزی</strong>
                                <small>{fa(modelCount)} مدل خودرو · رنگ‌بندی دلخواه</small>
                              </span>
                              <ChevronLeft className={styles.arrow} />
                            </Link>
                            <p className={styles.overline}>بر اساس نوع خودرو</p>
                            <div className={styles.groupList}>
                              {CAR_GROUPS.map((group) => {
                                const count = BRANDS.filter((b) => group.brands.includes(b.slug)).reduce((total, b) => total + b.models.length, 0);
                                const names = BRANDS.filter((b) => group.brands.includes(b.slug)).slice(0, 3).map((b) => b.name).join("، ");
                                return (
                                  <Link key={group.id} href={`/products?group=${group.id}`} className={styles.groupLink}>
                                    <span>
                                      <strong>{group.name}</strong>
                                      <small>{names}</small>
                                    </span>
                                    <span className={styles.groupCount}>{fa(count)} مدل</span>
                                  </Link>
                                );
                              })}
                            </div>
                            <Link href="/products" className={styles.accessoryLink}>
                              <img src={img("images/showcase/card-front-mat.jpg")} alt="" loading="lazy" decoding="async" className={styles.accessoryImage} />
                              <span>کفپوش اختصاصی خودرو</span>
                              <ChevronLeft className={styles.arrow} />
                            </Link>
                          </div>

                          <div className={styles.brandColumn}>
                            <p className={styles.overline}>برندهای پرطرفدار</p>
                            <div className={styles.brandGrid}>
                              {popular.slice(0, 15).map((brand) => (
                                <Link key={brand.slug} href={`/products?brand=${brand.slug}`} className={styles.brandLink}>
                                  {brand.name}
                                </Link>
                              ))}
                            </div>
                            <Link href="/products?discounted=1&sort=discount" className={styles.offerLink}>
                              <span className={styles.offerIcon}><BadgePercent className="size-5" /></span>
                              <span>
                                <strong>پیشنهادهای ویژه 50500</strong>
                                <small>کفپوش‌ها و لوازم جانبی تخفیف‌دار</small>
                              </span>
                              <ChevronLeft className={styles.arrow} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  onMouseEnter={() => setMegaOpen(false)}
                  onFocus={() => setMegaOpen(false)}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors xl:text-sm",
                    isActive(l.href) ? "bg-brand-500/15 text-brand-300" : "tdim hover:text-white hover:bg-white/5",
                  )}
                >
                  {l.label}
                  {l.badge && (
                    <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[9px] font-black text-white">
                      {l.badge}
                    </span>
                  )}
                </Link>
              ),
            )}
          </nav>

          <div className="ms-auto flex items-center gap-0.5 sm:gap-2 lg:ms-0">
            <button
              type="button"
              onClick={onToggleTheme}
              className="grid size-9 place-items-center rounded-xl tdim transition soft-h md:hidden"
              aria-label={theme === "light" ? "فعال‌کردن تم تاریک" : "فعال‌کردن تم روشن"}
              title={theme === "light" ? "رفتن به حالت شب" : "رفتن به حالت روز"}
            >
              {theme === "light" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
            </button>
            <button
              onMouseEnter={() => setMegaOpen(false)}
              onClick={() => { setMegaOpen(false); setSearchOpen(true); }}
              className="flex size-9 items-center justify-center gap-2 rounded-xl text-xs tdim transition soft-h sm:h-10 sm:w-auto sm:px-3"
              aria-label="جستجو"
            >
              <Search className="size-4" />
              <span className="hidden xl:inline">جستجو...</span>
              <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono xl:inline">⌘K</kbd>
            </button>

            <Link
              href={user ? "/account" : "/login"}
              className="hidden h-10 items-center gap-2 rounded-xl px-2.5 tdim transition soft-h sm:flex"
              aria-label={user ? `حساب کاربری ${user.name}` : "ورود / ثبت‌نام"}
              title={user ? `حساب کاربری: ${user.name}` : "ورود یا ثبت‌نام"}
            >
              {user ? (
                <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-[11px] font-black text-white">
                  {user.name.trim().slice(0, 1)}
                </span>
              ) : (
                <UserRound className="size-5" />
              )}
            </Link>

            <Link
              href="/cart"
              className="relative grid size-9 place-items-center rounded-xl transition soft-h sm:size-10"
              aria-label="سبد خرید"
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-black text-white animate-pop">
                  {fa(count)}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-20" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border bd bg-ink-900 p-5 shadow-2xl animate-fade-up">
            <form onSubmit={handleSearch} className="relative">
              <Search className="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-brand-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="نام خودرو... مثلاً «پژو ۲۰۶» یا «تارا»"
                className="input pe-12 text-base"
              />
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs tfaint">پیشنهاد:</span>
              {["پژو ۲۰۶", "دنا پلاس", "شاهین", "تارا", "توسان", "کمری"].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    navigate(`/products?q=${encodeURIComponent(q)}`);
                    setSearchOpen(false);
                  }}
                  className="chip !text-xs cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* mobile drawer menu */}
      {menuOpen && (
        <div id="mobile-navigation-drawer" className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="منوی سایت">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 end-0 flex w-[86%] max-w-sm flex-col surface animate-page-in overflow-y-auto p-5 pb-28 shadow-2xl lg:pb-5">
            <div className="flex items-center justify-between border-b bd pb-4">
              <Logo />
              <button onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-xl soft" aria-label="بستن منو">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="relative mt-5">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجوی نام خودرو..." className="input pe-9" />
            </form>

            <nav className="mt-5 grid gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn("rounded-xl px-4 py-3 text-sm font-bold transition soft-h", isActive(l.href) && "text-brand-300")}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <p className="mt-6 mb-2 text-[11px] font-black tracking-widest tfaint">خرید بر اساس گروه خودرو</p>
            <div className="grid gap-2">
              {CAR_GROUPS.map((g) => {
                const countModels = BRANDS.filter((b) => g.brands.includes(b.slug)).reduce((sum, b) => sum + b.models.length, 0);
                return (
                  <Link key={g.id} href={`/products?group=${g.id}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-2xl border bd p-2.5 transition soft-h">
                    <span className="size-11 shrink-0 overflow-hidden rounded-xl" style={{ background: "var(--muted-surface)" }}>
                      <img src={g.image} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{g.name}</span>
                      <span className="mt-0.5 block text-[11px] tdim">{fa(countModels)} مدل خودرو</span>
                    </span>
                    <ChevronLeft className="size-4 shrink-0 tdim" />
                  </Link>
                );
              })}
            </div>

            <a href={content.contact.phoneHref} className="btn btn-primary mt-6 py-3.5 text-sm">
              <Phone className="size-4" /> تماس با پشتیبانی: {content.contact.phone}
            </a>

          </div>
        </div>
      )}
    </>
  );
}
