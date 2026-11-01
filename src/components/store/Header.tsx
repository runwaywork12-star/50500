"use client";

import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BadgePercent, ChevronDown, ChevronLeft, LoaderCircle, Menu, Moon, Phone, Search, ShoppingBag, Sparkles, Sun, Truck, UserRound, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useCart } from "@/lib/cart";
import { cn, fa } from "@/lib/format";
import { themePath } from "@/lib/theme-path";

export type NavCategory = { slug: string; name: string; shortName: string; image: string; count: number };
export type NavBrand = { slug: string; name: string; nameEn: string };
export type NavGroup = { id: string; name: string; modelCount: number; brandNames: string[] };

type HeaderSettings = Record<string, string>;

export function Header({ categories, brands, groups, settings = {} }: { categories: NavCategory[]; brands: NavBrand[]; groups: NavGroup[]; settings?: HeaderSettings }) {
  const { count } = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const links = [
    { href: "/", label: settings["header.nav_home"] || "خانه" },
    { href: "/products", label: settings["header.nav_shop"] || "فروشگاه", mega: true },
    { href: "/products?discounted=1&sort=discount", label: settings["header.nav_discount"] || "پیشنهاد ویژه", badge: "٪" },
    { href: "/track", label: settings["header.nav_track"] || "پیگیری سفارش" },
    { href: "/blog", label: settings["header.nav_blog"] || "مجله" },
    { href: "/about", label: settings["header.nav_about"] || "درباره ما" },
    { href: "/contact", label: settings["header.nav_contact"] || "تماس با ما" },
  ];
  const phoneHref = settings["contact.phone_href"] || "tel:+982191050500";
  const phone = settings["contact.phone"] || "۰۲۱-۹۱۰۵۰۵۰۰";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
  }, [menuOpen, searchOpen]);

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (href.includes("?")) return false;
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };

  return (
    <>
      <div className="relative z-40 border-b bd bg-linear-to-l from-brand-600/25 via-ink-900 to-ink-900 text-xs">
        <div className="container-x site-header-container flex h-9 items-center justify-between gap-4">
          <p className="flex items-center gap-2 tdim">
            {settings["header.shipping_enabled"] !== "false" && <><Truck className="size-3.5 text-brand-400" /> {settings["header.shipping_text"] || "ارسال به سراسر کشور"}</>}
          </p>
          <p className="hidden max-w-[34rem] items-center gap-2 truncate tdim xl:flex" title={settings["general.announcement_text"] || ""}>
            {settings["general.announcement_enabled"] === "true" && settings["general.announcement_text"]?.trim() ? <><Sparkles className="size-3.5 shrink-0 text-brand-400" /> {settings["general.announcement_text"]}</> : null}
          </p>
          <p className="hidden items-center gap-2 tdim md:flex">
            {settings["header.promo_enabled"] !== "false" && <><BadgePercent className="size-3.5 text-brand-400" /> کد
            <b dir="ltr" className="rounded bg-brand-500/20 px-1.5 text-brand-200"><span className="font-english">{settings["header.promo_code"] || "50500"}</span></b>
            = {settings["header.promo_text"] || "تخفیف ویژه خرید"}</>}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <a href={phoneHref} className="hidden items-center gap-1.5 py-2 tdim transition-colors hover:text-white sm:flex">
              <Phone className="size-3.5" /> {phone}
            </a>
            <Link
              href="/"
              skin={pathname === "/v2" || pathname?.startsWith("/v2/") ? "dark" : "light"}
              className="theme-switch-toggle"
              aria-label={pathname === "/v2" || pathname?.startsWith("/v2/") ? "فعال‌کردن تم تاریک" : "فعال‌کردن تم روشن"}
              title={pathname === "/v2" || pathname?.startsWith("/v2/") ? "رفتن به حالت شب" : "رفتن به حالت روز"}
            >
              <Sun className="theme-switch-icon theme-switch-sun" aria-hidden="true" />
              <Moon className="theme-switch-icon theme-switch-moon" aria-hidden="true" />
              <span className="sr-only">تغییر تم روشن و تاریک</span>
            </Link>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b bd bg-ink-950/75 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            : "border-b border-transparent bg-ink-950/30 backdrop-blur-sm",
        )}
      >
        <div className="container-x site-header-container flex h-[72px] items-center gap-3 xl:gap-4">
          <button onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-xl tdim transition soft-h lg:hidden" aria-label="باز کردن منو">
            <Menu className="size-6" />
          </button>
          <Logo />

          <nav className="mx-auto hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1">
            {links.map((l) =>
              l.mega ? (
                <div key={l.href} className="group relative">
                  <Link
                    href={l.href}
                    className={cn(
                      "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors xl:px-2.5 xl:text-sm 2xl:px-3",
                      isActive(l.href) ? "text-white" : "tdim hover:text-white",
                    )}
                  >
                    {l.label}
                    <ChevronDown className="size-4 transition-transform duration-300 group-hover:rotate-180" />
                  </Link>
                  <div className="invisible absolute start-0 top-full z-50 translate-y-2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <MegaMenu categories={categories} brands={brands} groups={groups} settings={settings} />
                  </div>
                </div>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors xl:px-2.5 xl:text-sm 2xl:px-3",
                    isActive(l.href) ? "text-white" : "tdim hover:text-white",
                    (l.href === "/blog" || l.href === "/about" || l.href === "/contact") && "hidden 2xl:flex",
                  )}
                >
                  {l.label}
                  {l.badge && (
                    <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[9px] font-black leading-none text-[#fff]">{l.badge}</span>
                  )}
                  {isActive(l.href) && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-linear-to-l from-brand-300 to-brand-600" />}
                </Link>
              ),
            )}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-2 lg:ms-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border bd soft px-3 text-sm tdim transition bd-h hover:text-white lg:w-11 lg:justify-center lg:px-0 xl:w-52 xl:justify-start xl:px-3 2xl:w-60"
              aria-label="جستجو"
            >
              <Search className="size-5 shrink-0" />
              <span className="hidden xl:inline">جستجوی خودرو…</span>
              <kbd dir="ltr" className="ms-auto hidden whitespace-nowrap rounded-md border bd px-1.5 py-0.5 text-[10px] tdim xl:inline">
                Ctrl K
              </kbd>
            </button>
            <Link
              href="/account"
              className="grid size-11 place-items-center rounded-xl border bd soft tdim transition hover:text-white"
              aria-label="حساب کاربری"
              title="حساب کاربری"
            >
              <UserRound className="size-5" />
            </Link>
            <Link
              href="/cart"
              className="relative grid size-11 place-items-center rounded-xl bg-linear-to-br from-brand-400 to-brand-600 text-[#fff] shadow-lg shadow-brand-500/30 transition hover:scale-105"
              aria-label="سبد خرید"
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-photo px-1 text-[11px] font-black text-ink-950 ring-2 ring-ink-950">
                  {fa(count)}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && <MobileMenu categories={categories} groups={groups} links={links} phone={phone} phoneHref={phoneHref} onClose={() => setMenuOpen(false)} isActive={isActive} />}
      {searchOpen && <SearchModal pathname={pathname} onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function MegaMenu({ categories, brands, groups, settings }: { categories: NavCategory[]; brands: NavBrand[]; groups: NavGroup[]; settings: HeaderSettings }) {
  const main = categories.find((c) => c.count > 0 && c.slug === "embroidered-leather");
  const more = categories.filter((c) => c.count > 0 && c.slug !== "embroidered-leather");
  const soon = categories.filter((c) => c.count === 0);
  return (
    <div className="glass w-[min(820px,92vw)] rounded-3xl scrim-95 p-5 shadow-2xl shadow-black/60">
      <div className="grid grid-cols-[1.1fr_1fr] gap-6">
        <div>
          {main && (
            <Link href={`/products?category=${main.slug}`} className="group/item mb-3 flex items-center gap-3 rounded-2xl soft p-2.5 transition soft-h">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-[var(--line)]">
                <Image src={main.image} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-white">{main.name}</span>
                <span className="block text-xs tdim">{fa(main.count)} مدل خودرو · رنگ دلخواه شما</span>
              </span>
              <ChevronLeft className="size-4 tdim transition group-hover/item:-translate-x-1 group-hover/item:text-brand-400" />
            </Link>
          )}
          <p className="mb-2 px-1 text-xs font-bold tdim">بر اساس نوع خودرو</p>
          <div className="grid gap-1">
            {groups.map((g) => (
              <Link key={g.id} href={`/products?group=${g.id}`} className="group/item flex items-center justify-between rounded-xl px-3 py-2.5 transition soft-h">
                <span>
                  <span className="block text-sm font-bold tdim">{g.name}</span>
                  <span className="block text-[11px] tdim">{g.brandNames.slice(0, 4).join("، ")}</span>
                </span>
                <span className="text-xs tdim">{fa(g.modelCount)} مدل</span>
              </Link>
            ))}
            {soon.map((c) => (
              <span key={c.slug} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm tdim">
                {c.name}
                <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-300">به‌زودی</span>
              </span>
            ))}
            {more.map((c) => (
              <Link key={c.slug} href={`/products?category=${c.slug}`} className="group/item flex items-center gap-3 rounded-xl px-3 py-2.5 transition soft-h">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-[var(--line)]">
                  <Image src={c.image} alt="" fill sizes="40px" className="object-cover" />
                </span>
                <span className="flex-1 text-sm font-bold tdim">{c.name}</span>
                <ChevronLeft className="size-4 tdim transition group-hover/item:-translate-x-1 group-hover/item:text-brand-400" />
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold tdim">برندهای خودرو</p>
          <div className="grid grid-cols-3 gap-1.5">
            {brands.slice(0, 15).map((b) => (
              <Link
                key={b.slug}
                href={`/products?brand=${b.slug}`}
                className="rounded-xl border bd soft px-2 py-2.5 text-center text-xs font-semibold tdim transition hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-[#fff]"
              >
                {b.name}
              </Link>
            ))}
          </div>
          <Link
            href="/products?discounted=1&sort=discount"
            className="shine mt-4 flex items-center gap-3 rounded-2xl bg-linear-to-l from-brand-500/30 to-brand-500/5 p-4 ring-1 ring-brand-500/30 transition hover:ring-brand-500/60"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-brand-500 text-[#fff]">
              <Sparkles className="size-5" />
            </span>
            <span>
              <b className="block text-sm">{settings["home.promo.title"] || "پیشنهاد ویژه ۵۰۵۰۰"} با کد {settings["header.promo_code"] || "50500"}</b>
              <span className="text-xs tdim">{settings["home.promo.description"] || "مشاهده کفپوش‌های تخفیف‌دار"}</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MobileMenu({
  categories,
  groups,
  links,
  phone,
  phoneHref,
  onClose,
  isActive,
}: {
  categories: NavCategory[];
  groups: NavGroup[];
  links: { href: string; label: string; mega?: boolean; badge?: string }[];
  phone: string;
  phoneHref: string;
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm animate-fade-up flex-col overflow-y-auto border-e bd bg-ink-900 p-5">
        <div className="flex items-center justify-between">
          <Logo />
          <button onClick={onClose} className="grid size-10 place-items-center rounded-xl soft" aria-label="بستن منو">
            <X className="size-5" />
          </button>
        </div>
        <nav className="mt-6 grid gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={onClose}
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition",
                isActive(l.href) ? "bg-brand-500/15 text-brand-200" : "tdim soft-h",
              )}
            >
              <span className="flex items-center gap-2">
                {l.label}
                {l.badge && <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[9px] font-black text-[#fff]">{l.badge}</span>}
              </span>
              <ChevronLeft className="size-4 opacity-40" />
            </Link>
          ))}
        </nav>
        <p className="mb-2 mt-6 px-1 text-xs font-bold tdim">کفپوش بر اساس نوع خودرو</p>
        <div className="grid grid-cols-2 gap-2">
          {groups.map((g) => (
            <Link key={g.id} href={`/products?group=${g.id}`} onClick={onClose} className="rounded-2xl border bd soft p-3">
              <span className="block text-xs font-black">{g.name}</span>
              <span className="mt-1 block text-[10px] tdim">{fa(g.modelCount)} مدل خودرو</span>
            </Link>
          ))}
        </div>
        <p className="mb-2 mt-2 px-1 text-xs font-bold tdim">سایر محصولات</p>
        {categories
          .filter((c) => c.count > 0 && c.slug !== "embroidered-leather")
          .map((c) => (
            <Link key={c.slug} href={`/products?category=${c.slug}`} onClick={onClose} className="relative h-24 overflow-hidden rounded-2xl ring-1 ring-[var(--line)]">
              <Image src={c.image} alt="" fill sizes="320px" className="object-cover opacity-70" />
              <span className="absolute inset-0 scrim-grad-l" />
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm font-bold">{c.name}</span>
              <ChevronLeft className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-brand-400" />
            </Link>
          ))}
        <a href={phoneHref} className="btn btn-ghost mt-6 py-3 text-sm">
          <Phone className="size-4" /> مشاوره رایگان: {phone}
        </a>
      </aside>
    </div>
  );
}

type SearchItem = { id: number; slug: string; title: string; price: number; image: string; categoryName: string };

const SUGGESTIONS = ["پژو ۲۰۶", "دنا پلاس", "تارا", "شاهین", "توسان", "سراتو", "کمری"];

function SearchModal({ onClose, pathname }: { onClose: () => void; pathname: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { items?: SearchItem[]; total?: number };
        setResults(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch {
        // aborted
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(themePath(pathname, `/products?q=${encodeURIComponent(q.trim())}`));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[9vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl animate-fade-up overflow-hidden rounded-3xl border bd bg-ink-900 shadow-2xl shadow-black">
        <form onSubmit={submit} className="flex items-center gap-3 border-b bd px-5">
          <Search className="size-5 shrink-0 text-brand-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="نام خودرو... مثلاً «پژو ۲۰۶»"
            className="h-16 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:tdim"
          />
          {loading && <LoaderCircle className="size-5 animate-spin tdim" />}
          <button type="button" onClick={onClose} className="rounded-lg border bd px-2 py-1 text-xs tdim hover:text-white">
            بستن
          </button>
        </form>
        <div className="max-h-[62vh] overflow-y-auto p-3">
          {q.trim().length < 2 ? (
            <div className="p-3">
              <p className="mb-3 text-xs font-bold tdim">جستجوهای پرطرفدار</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="chip">
                    <Search className="size-3.5" /> {s}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-10 text-center text-sm tdim">نتیجه‌ای برای «{q}» پیدا نشد 🙁</div>
          ) : (
            <div className="grid gap-1">
              {results.map((r) => (
                <Link key={r.id} href={`/products/${r.slug}`} className="flex items-center gap-3 rounded-2xl p-2 transition soft-h">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ink-700">
                    <Image src={r.image} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.title}</span>
                    <span className="text-xs tdim">{r.categoryName}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-brand-300">
                    {fa(r.price)} <span className="text-[10px] tdim">تومان</span>
                  </span>
                </Link>
              ))}
              {total > results.length && (
                <Link href={`/products?q=${encodeURIComponent(q.trim())}`} className="btn btn-ghost mt-2 py-3 text-sm">
                  مشاهده همه {fa(total)} نتیجه <ChevronLeft className="size-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
