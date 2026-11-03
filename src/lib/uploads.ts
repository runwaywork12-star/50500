import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appMeta, uploads } from "@/db/schema";
import { MAT_SLOTS } from "./mat-photos";

type SiteImageDef = { label: string; fallback: string };

export const SITE_IMAGE_KEYS: Record<string, SiteImageDef> = {
  hero: { label: "تصویر اصلی هیرو دسکتاپ ۵۰۵۰۰", fallback: "images/hero-workshop-50500.png" },
  "hero-mobile": { label: "تصویر هیرو موبایل ۵۰۵۰۰", fallback: "images/hero-workshop-50500.png" },
  mat: { label: "عکس اصلی کفپوش", fallback: MAT_SLOTS[0].fallback },
  ...Object.fromEntries(MAT_SLOTS.map((s) => [`mat-${s.key}`, { label: s.label, fallback: s.fallback }])),
};

export const MAT_IMAGE = "/api/site-image/mat";

export async function getSiteImageUploadId(key: string): Promise<number | null> {
  const row = await db.select().from(appMeta).where(eq(appMeta.key, `site_image:${key}`)).limit(1);
  const id = Number(row[0]?.value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function setSiteImage(key: string, uploadId: number) {
  await db
    .insert(appMeta)
    .values({ key: `site_image:${key}`, value: String(uploadId) })
    .onConflictDoUpdate({ target: appMeta.key, set: { value: String(uploadId) } });
}

export async function readUpload(id: number) {
  const row = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);
  return row[0] ?? null;
}
