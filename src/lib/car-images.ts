/* ------------------------------------------------------------------ *
 * Car photos for the brand / model banners.
 *
 * Priority (first one that exists wins):
 *   1. uploaded photo for the exact model   → slots["car:<brand>:<model>"]
 *   2. uploaded photo for the brand         → slots["car:<brand>"]
 *   3. default photo of the car group       → real bundled photo of the
 *      group the brand belongs to (داخلی / چینی / کره‌ای و ژاپنی / اروپایی)
 *   4. undefined → the drawn SVG placeholder
 *
 * Admin uploads therefore always replace the default, and "delete" in the
 * panel simply falls back to the group photo again.
 * ------------------------------------------------------------------ */

import { CAR_GROUPS } from "@/data/content";

export type ImageSlots = Record<string, { src: string; alt: string }>;

export function carImageSlot(brandSlug: string, modelSlug?: string): string {
  return modelSlug ? `car:${brandSlug}:${modelSlug}` : `car:${brandSlug}`;
}

/** Real bundled photo of the car group that contains this brand. */
export function defaultCarImage(brandSlug?: string): string | undefined {
  if (!brandSlug) return undefined;
  return CAR_GROUPS.find((g) => g.brands.includes(brandSlug))?.image;
}

/** Effective banner photo with the fallback chain described above. */
export function carImageFor(slots: ImageSlots, brandSlug?: string, modelSlug?: string): string | undefined {
  if (!brandSlug) return undefined;
  const model = modelSlug ? slots[carImageSlot(brandSlug, modelSlug)]?.src : undefined;
  const brand = slots[carImageSlot(brandSlug)]?.src;
  return model || brand || defaultCarImage(brandSlug);
}
