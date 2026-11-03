import { MAT_SLOTS } from "./mat-photos";

/**
 * Works out which of the four mat colours a photo shows (set on white background),
 * so all photos can be uploaded at once without choosing a slot for each.
 */
export async function classifyMat(buffer: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(buffer)
      .resize(360, 360, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let fg = 0;
    let r = 0;
    let b = 0;
    let red = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const R = data[i * 3];
      const G = data[i * 3 + 1];
      const B = data[i * 3 + 2];
      if (Math.min(R, G, B) > 228) continue; // white background
      fg++;
      r += R;
      b += B;
      // thin red thread gets blended with the dark leather when downscaled, so the test is lenient
      if (R > 70 && R - G > 35 && R - B > 28) red++;
    }
    if (fg < 500) return null;
    const rb = (r - b) / fg;
    if (rb > 70) return "tan";
    if (rb > 20) return "brown";
    return red / fg > 0.002 ? "black-red" : "black-white";
  } catch {
    return null;
  }
}

export const SLOT_KEYS = MAT_SLOTS.map((s) => s.key);
