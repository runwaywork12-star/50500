import { useEffect, useState } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { Phone, ShieldCheck, Wrench } from "lucide-react";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth.tsx";
import { SiteContentProvider, loadSiteContent, useSiteContent } from "@/lib/site-content";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import { OrderPage, PayPage } from "@/pages/Order";
import Track from "@/pages/Track";
import { About, Blog, BlogPost, Contact, NotFound } from "@/pages/Static";
import { Account, ForgotPassword, Login, Register } from "@/pages/Auth";
import Admin from "@/pages/Admin";

type Theme = "dark" | "light";

const PUBLIC_PATHS = ["/login", "/register", "/forgot"];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { content } = useSiteContent();
  const [preview, setPreview] = useState(false);
  const onPublicPath = pathname.startsWith("/admin") || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!content.maintenance || preview || onPublicPath) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[#07080b] p-5">
      <div className="stitch-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-brand-500/25 bg-[#0d1015] p-8 text-center shadow-2xl">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30">
          <Wrench className="size-7" />
        </span>
        <p className="mt-5 text-[11px] font-black tracking-[.3em] text-brand-400">50500</p>
        <h1 className="mt-3 text-2xl font-black leading-9 text-white">
          سایت در حال <span className="text-gradient">به‌روزرسانی</span> است
        </h1>
        <p className="mt-3 text-sm leading-8 text-white/60">
          تیم 50500 مشغول آماده‌سازی بخش جدیدی از فروشگاه است. چند لحظه دیگر دوباره سر بزنید یا با ما تماس بگیرید.
        </p>
        <div className="mt-6 grid gap-2.5">
          <a href={content.contact.phoneHref} className="btn btn-primary py-3 text-sm">
            <Phone className="size-4" /> تماس با پشتیبانی: {content.contact.phone}
          </a>
          <Link to="/admin" className="btn btn-ghost py-3 text-sm">
            <ShieldCheck className="size-4" /> ورود مدیر
          </Link>
          <button onClick={() => setPreview(true)} className="text-[11px] font-bold text-white/40 underline-offset-4 hover:text-white/70 hover:underline">
            مشاهده پیش‌نمایش سایت
          </button>
        </div>
      </div>
    </div>
  );
}

function Storefront() {
  const { content } = useSiteContent();
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("50500_theme") : null;
    if (saved === "light" || saved === "dark") return saved;
    return loadSiteContent().defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-dark", theme === "dark");
    root.classList.toggle("theme-light", theme === "light");
    root.style.colorScheme = theme;
    try {
      localStorage.setItem("50500_theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Default skin follows the admin selection until the visitor toggles it manually.
  useEffect(() => {
    const saved = localStorage.getItem("50500_theme");
    if (!saved) setTheme(content.defaultTheme);
  }, [content.defaultTheme]);

  return (
    <div className="flex min-h-screen flex-col">
      {!isAdmin && <Header theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />}
      <main className="flex-1 animate-page-in">
        <MaintenanceGate>
          <Routes>
            <Route path="/" element={<Home theme={theme} />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:code" element={<OrderPage />} />
            <Route path="/pay/:code" element={<PayPage />} />
            <Route path="/track" element={<Track />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MaintenanceGate>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <SiteContentProvider>
      <CartProvider>
        <AuthProvider>
          <HashRouter>
            <ScrollToTop />
            <Storefront />
          </HashRouter>
        </AuthProvider>
      </CartProvider>
    </SiteContentProvider>
  );
}
