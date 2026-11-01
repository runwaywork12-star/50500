import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Build presentation-only cutouts. The source catalogue images remain untouched.
const outDir = path.join(process.cwd(), "public/images/showcase");
await fs.mkdir(outDir, { recursive: true });

async function saveTightCutout(data, width, height, output) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0) throw new Error(`Empty cutout: ${output}`);
  const pad = 6;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);
  await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100, effort: 5 })
    .toFile(path.join(outDir, output));
  console.log(`${output}: tight bounds ${right - left + 1} × ${bottom - top + 1}`);
}

// The mat sets have a white studio background. Flood-fill ONLY background pixels
// connected to the canvas perimeter; enclosed white stitches/highlights are retained.
for (const key of ["black-red", "black-white", "tan", "brown"]) {
  const source = path.join(process.cwd(), `public/images/m/set-${key}.jpg`);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const count = width * height;
  const background = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  const candidate = (i) => {
    const offset = i * 4;
    const lo = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const hi = Math.max(data[offset], data[offset + 1], data[offset + 2]);
    return lo > 152 && hi - lo < 30;
  };
  const visit = (i) => {
    if (background[i] || !candidate(i)) return;
    background[i] = 1;
    queue[tail++] = i;
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < count - width) visit(i + width);
  }
  for (let i = 0; i < count; i++) {
    if (background[i]) {
      data[i * 4 + 3] = 0;
      // Clear transparent RGB to avoid a white matte when resized.
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 0;
    }
  }
  await saveTightCutout(data, width, height, `mat-${key}.webp`);
}

// Accessory art is vector: discard only the studio backdrop/border and shadow,
// then rasterize at high resolution and trim its empty canvas. Product paths stay intact.
const files = [
  "steering-lock", "pedal-lock", "wheel-cover", "wheel-cover-brown", "gap-organizer",
  "neck-pillow", "seatbelt-pads", "trunk-organizer", "trunk-organizer-2",
  "seat-organizer", "armrest-organizer", "key-case",
];
for (const file of files) {
  let svg = await fs.readFile(path.join(process.cwd(), `public/images/accessories/${file}.svg`), "utf8");
  svg = svg
    .replace(/<rect\b[^>]*fill="url\(#(?:bg|b)\)"[^>]*\/>/g, "")
    .replace(/<rect\b[^>]*x="72"[^>]*\/>/g, "")
    .replace(/<ellipse\b[^>]*filter="url\(#(?:sh|s)\)"[^>]*\/>/g, "");
  const { data, info } = await sharp(Buffer.from(svg), { density: 144 })
    .resize(1200, 1200).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  await saveTightCutout(data, info.width, info.height, `${file}.webp`);
}
