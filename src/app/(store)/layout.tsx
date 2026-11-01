import type { ReactNode } from "react";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { MobileNav } from "@/components/store/MobileNav";
import { ScrollUi } from "@/components/store/ScrollUi";
import { VisitorTracker } from "@/components/store/VisitorTracker";
import { carGroupsFrom, getBrandsWithModels, getCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [categories, brands, settings] = await Promise.all([getCategories(), getBrandsWithModels(), getSettings()]);
  const fontFamily = settings["appearance.font_family"] === "tahoma" ? "Tahoma, Arial, sans-serif" : settings["appearance.font_family"] === "system" ? "system-ui, Segoe UI, sans-serif" : "Shabnam, Vazirmatn, sans-serif";
  const fontSize = settings["appearance.font_scale"] === "small" ? "0.94rem" : settings["appearance.font_scale"] === "large" ? "1.06rem" : "1rem";
  const groups = carGroupsFrom(brands).map((g) => ({ id: g.id, name: g.name, modelCount: g.modelCount, brandNames: g.brandNames }));
  return (
    <div style={{ fontFamily, fontSize }}>
      <Header
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, shortName: c.shortName, image: c.image, count: c.count }))}
        brands={brands.map((b) => ({ slug: b.slug, name: b.name, nameEn: b.nameEn }))}
        groups={groups}
        settings={settings}
      />
      <main className="min-h-[60vh]">{children}</main>
      <Footer
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        more={categories.filter((c) => c.count > 0 && c.slug !== "embroidered-leather").map((c) => ({ slug: c.slug, name: c.name }))}
        comingSoon={categories.filter((c) => c.count === 0).map((c) => ({ slug: c.slug, name: c.name }))}
        settings={settings}
      />
      <MobileNav />
      <ScrollUi />
      <VisitorTracker />
      <div className="grain" aria-hidden="true" />
    </div>
  );
}
