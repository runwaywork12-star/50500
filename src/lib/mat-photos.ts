/**
 * Temporary shared product image supplied by the store owner.
 * All vehicle-specific mat listings initially use the same photo. Admins can
 * replace an individual vehicle product image from Products → edit product.
 * The four colour endpoints remain available for later colour-specific photos.
 */
export type MatSlot = { key: string; label: string; leather: string; thread: string; fallback: string };

export const MAT_SLOTS: MatSlot[] = [
  { key: "black-red", label: "مشکی · گلدوزی قرمز", leather: "black", thread: "red", fallback: "/images/mat-default-50500.png" },
  { key: "black-white", label: "مشکی · گلدوزی سفید", leather: "black", thread: "white", fallback: "/images/mat-default-50500.png" },
  { key: "tan", label: "عسلی · گلدوزی نارنجی", leather: "tan", thread: "orange", fallback: "/images/mat-default-50500.png" },
  { key: "brown", label: "قهوه‌ای · گلدوزی نارنجی", leather: "brown", thread: "orange", fallback: "/images/mat-default-50500.png" },
];

export const matUrl = (key: string) => `/api/site-image/mat-${key}`;
export const MAT_URLS = MAT_SLOTS.map((s) => matUrl(s.key));

/** Transparent tight-cropped cutout of a mat set — floats on hero backgrounds, no white box. */
export const showcaseUrl = (key: string) => `/images/showcase/mat-${key}.webp`;

/** Image list for the n-th mat product, rotated so neighbouring cards differ. */
export function rotatedMatImages(n: number): string[] {
  const k = ((n % MAT_URLS.length) + MAT_URLS.length) % MAT_URLS.length;
  return [...MAT_URLS.slice(k), ...MAT_URLS.slice(0, k)];
}

/** Photo used as the cover of each car group. */
export const GROUP_MAT: Record<string, string> = {
  domestic: matUrl("black-red"),
  chinese: matUrl("brown"),
  asian: matUrl("tan"),
  european: matUrl("black-white"),
};
