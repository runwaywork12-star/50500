import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { EyeOff, Home } from "lucide-react";
import { useControlState, type PageControl } from "@/lib/control-center";
import { useMediaSource } from "@/components/ManagedImage";

function matches(page: PageControl, pathname: string) {
  if (page.route.endsWith("/*")) {
    const base = page.route.slice(0, -2);
    return pathname.startsWith(`${base}/`);
  }
  return page.route === pathname;
}

function findPage(pages: PageControl[], pathname: string) {
  const exact = pages.find((page) => !page.route.endsWith("/*") && matches(page, pathname));
  if (exact) return exact;
  return pages
    .filter((page) => page.route.endsWith("/*") && matches(page, pathname))
    .sort((a, b) => b.route.length - a.route.length)[0];
}

function setMeta(name: string, content: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(element);
  }
  element.content = content;
}

/** Applies the admin's real page visibility and SEO settings to the storefront. */
export function PageRuntime({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const state = useControlState();
  const page = findPage(state.pages, pathname);
  const ogImage = useMediaSource(page?.ogImage);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      document.title = "مدیریت فروشگاه | 50500.shop";
      return;
    }
    if (!page) {
      document.title = "صفحه پیدا نشد | 50500";
      return;
    }
    document.title = page.seoTitle;
    setMeta("description", page.seoDescription);
    setMeta("keywords", page.keywords);
    setMeta("robots", page.robots);
    setMeta("og:title", page.seoTitle, true);
    setMeta("og:description", page.seoDescription, true);
    setMeta("og:type", "website", true);
    if (ogImage) setMeta("og:image", ogImage.startsWith("/") ? new URL(ogImage, window.location.origin).href : ogImage, true);
    else document.head.querySelector('meta[property="og:image"]')?.remove();
  }, [pathname, page?.id, page?.seoTitle, page?.seoDescription, page?.keywords, page?.robots, ogImage]);

  if (page && !page.enabled) {
    return (
      <div className="container-x grid min-h-[55vh] place-items-center py-16 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-500/10 text-brand-400"><EyeOff className="size-8" /></span>
          <h1 className="mt-5 text-2xl font-black">این بخش موقتاً در دسترس نیست</h1>
          <p className="mt-3 text-sm leading-8 tdim">مدیر فروشگاه نمایش این صفحه را غیرفعال کرده است. می‌توانید به صفحه اصلی برگردید یا از سایر بخش‌ها دیدن کنید.</p>
          <Link to="/" className="btn btn-primary mt-6 px-5 py-3 text-sm"><Home className="size-4" /> بازگشت به صفحه اصلی</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
