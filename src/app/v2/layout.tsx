import type { ReactNode } from "react";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { MobileNav } from "@/components/store/MobileNav";
import { ScrollUi } from "@/components/store/ScrollUi";
import { carGroupsFrom, getBrandsWithModels, getCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * The light skin of the same storefront: identical components and layout,
 * only the theme tokens are swapped (see `.theme-light` in globals.css).
 */
export default async function LightLayout({ children }: { children: ReactNode }) {
  const [categories, brands] = await Promise.all([getCategories(), getBrandsWithModels()]);
  const groups = carGroupsFrom(brands).map((g) => ({ id: g.id, name: g.name, modelCount: g.modelCount, brandNames: g.brandNames }));
  return (
    <div className="theme-light min-h-screen bg-[var(--bg)] text-[var(--txt)]">
      <Header
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, shortName: c.shortName, image: c.image, count: c.count }))}
        brands={brands.map((b) => ({ slug: b.slug, name: b.name, nameEn: b.nameEn }))}
        groups={groups}
      />
      <main className="min-h-[60vh] animate-page-in">{children}</main>
      <Footer
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        more={categories.filter((c) => c.count > 0 && c.slug !== "embroidered-leather").map((c) => ({ slug: c.slug, name: c.name }))}
        comingSoon={categories.filter((c) => c.count === 0).map((c) => ({ slug: c.slug, name: c.name }))}
      />
      <MobileNav />
      <ScrollUi />
      <div className="grain" aria-hidden="true" />
    </div>
  );
}
