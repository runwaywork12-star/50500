import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { siteSettings, siteSettingHistory } from "@/db/schema";
import type { HeroSlide } from "@/components/store/HeroSlider";
import { DEFAULT_SETTINGS } from "./setting-defs";
import { fa } from "./format";

let cache: Map<string, string> | null = null;

export function bustSettingsCache() {
  cache = null;
}

async function loadAll(): Promise<Record<string, string>> {
  if (cache) return Object.fromEntries(cache);
  await ensureDb();
  const rows = await db.select().from(siteSettings);
  cache = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(cache);
}

export async function getSetting(key: string): Promise<string> {
  const all = await loadAll();
  return all[key] ?? DEFAULT_SETTINGS[key] ?? "";
}

export async function getSettings(): Promise<Record<string, string>> {
  const all = await loadAll();
  // Never expose internal encrypted credentials or non-public settings through the generic settings API.
  const publicSettings = Object.fromEntries(Object.entries(all).filter(([key]) => key in DEFAULT_SETTINGS));
  // Payment merchant identifiers are consumed server-side; never send their stored values to the browser.
  publicSettings["payments.zarinpal_merchant"] = "";
  publicSettings["payments.zibal_merchant"] = "";
  return { ...DEFAULT_SETTINGS, ...publicSettings };
}

function parseHeroSlides(raw: string): Record<string, string>[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("invalid");
  return parsed.map((s) => {
    if (!s || typeof s !== "object") throw new Error("invalid");
    const r = s as Record<string, unknown>;
    for (const k of ["id", "label", "image", "title", "highlight", "desc", "caption", "ctaLabel", "ctaHref"]) {
      if (typeof r[k] !== "string" || !(r[k] as string).trim()) throw new Error("invalid");
    }
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) clean[k] = String(v ?? "").slice(0, 2000);
    if (clean.fit !== "cover" && clean.fit !== "contain") clean.fit = "contain";
    return clean;
  });
}

export async function setSettings(patch: Record<string, unknown>): Promise<void> {
  await ensureDb();
  for (const [key, raw] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    const value = String(raw ?? "").slice(0, 20000);
    // Blank secret inputs mean “keep the existing server-side credential”.
    if ((key === "payments.zarinpal_merchant" || key === "payments.zibal_merchant") && !value.trim()) continue;
    if (key === "hero.slides") {
      try {
        parseHeroSlides(value);
      } catch {
        throw new Error("ساختار اسلایدها معتبر نیست");
      }
    }
    if (key.endsWith("_enabled") || key === "payments.zarinpal_sandbox") {
      if (value !== "true" && value !== "false") continue;
    }
    const [previous] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    if ((previous?.value ?? DEFAULT_SETTINGS[key] ?? "") !== value) {
      const sensitive = key.endsWith("_merchant") || key.includes("secret") || key.includes("token");
      await db.insert(siteSettingHistory).values({
        settingKey: key,
        previousValue: sensitive ? "[مخفی]" : previous?.value ?? DEFAULT_SETTINGS[key] ?? "",
        nextValue: sensitive ? "[مخفی/به‌روزرسانی‌شده]" : value,
      });
    }
    await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  }
  bustSettingsCache();
}

export async function getHeroSlides(modelCount: number): Promise<HeroSlide[]> {
  const raw = await getSetting("hero.slides");
  let slides: Record<string, string>[];
  try {
    slides = parseHeroSlides(raw);
  } catch {
    slides = parseHeroSlides(DEFAULT_SETTINGS["hero.slides"]);
  }
  const count = fa(modelCount);
  return slides.map((s) => ({
    id: s.id,
    label: s.label,
    image: s.image,
    fit: s.fit === "cover" ? ("cover" as const) : ("contain" as const),
    eyebrow: s.eyebrow || "",
    title: s.title,
    highlight: s.highlight,
    titleEnd: s.titleEnd || "",
    desc: (s.desc || "").replaceAll("{modelCount}", count),
    caption: s.caption,
    sub: s.sub || "",
    cta: { href: s.ctaHref || "/products", label: s.ctaLabel || "مشاهده" },
    ...(s.cta2Label ? { cta2: { href: s.cta2Href || "/contact", label: s.cta2Label } } : {}),
  }));
}

export type SiteContact = {
  phone: string;
  phoneHref: string;
  mobile: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  telegram: string;
  whatsapp: string;
};

export async function getContact(): Promise<SiteContact> {
  const all = await getSettings();
  return {
    phone: all["contact.phone"],
    phoneHref: all["contact.phone_href"] || "tel:+982191050500",
    mobile: all["contact.mobile"],
    email: all["contact.email"],
    address: all["contact.address"],
    hours: all["contact.hours"],
    instagram: all["contact.instagram"],
    telegram: all["contact.telegram"],
    whatsapp: all["contact.whatsapp"],
  };
}

export async function getAnnouncement(): Promise<{ enabled: boolean; text: string }> {
  const all = await getSettings();
  return { enabled: all["general.announcement_enabled"] === "true", text: all["general.announcement_text"] };
}
