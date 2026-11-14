import { BLOG_IMAGES } from "./blog-images";
import { getControlState } from "./control-center";
import { deploymentBundle, defaultEnv, renderEnv, type EnvConfig } from "./deploy";
import { HERO_SLIDES } from "./hero-slides";
import { IMAGES } from "./images";
import { getCustomProducts, getProductOverrides } from "./product-overrides";
import { loadSiteContent } from "./site-content";
import { loadAdmin } from "./admin";

/* ------------------------------------------------------------------ *
 * Full-project ZIP generator (runs 100% in the browser).
 * Packs every source file in the repository + generated .env + live
 * admin/site settings into a single standard .zip archive.
 * ------------------------------------------------------------------ */

const RAW_ROOT = import.meta.glob(
  [
    "/index.html",
    "/package.json",
    "/tsconfig.json",
    "/vite.config.ts",
    "/liara.json",
    "/.liaraignore",
    "/.gitignore",
    "/.gitignore.txt",
    "/README.md",
    "/LIARA.fa.md",
    "/DEPLOY.fa.md",
    "/deploy/**",
    "/server/**",
    "/public/icon.svg",
    "/public/images/hero-placeholder.svg",
    "/public/images/industrial-sewing-machine.svg",
    "/public/images/cars/**",
    "/public/images/accessories/**",
    "/src/**",
    "!/src/lib/images.ts",
    "!/src/lib/blog-images.ts",
    "!/src/lib/hero-slides.ts",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

/* ---------------------------- CRC32 + ZIP writer --------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(data: Uint8Array): Promise<{ compressed: Uint8Array; method: 0 | 8 }> {
  if (typeof CompressionStream !== "undefined" && data.length > 128) {
    try {
      const cs = new CompressionStream("deflate-raw");
      const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(cs);
      const buf = await new Response(stream).arrayBuffer();
      const out = new Uint8Array(buf);
      if (out.length > 0 && out.length < data.length) return { compressed: out, method: 8 };
    } catch {
      /* fallback to STORE (method 0) */
    }
  }
  return { compressed: data, method: 0 };
}

function u16(view: DataView, offset: number, val: number) {
  view.setUint16(offset, val & 0xffff, true);
}

function u32(view: DataView, offset: number, val: number) {
  view.setUint32(offset, val >>> 0, true);
}

export type ZipEntryInput = { path: string; content: string | Uint8Array };

/** Builds a standards-compliant ZIP archive (UTF-8 paths, Deflate/Store). */
export async function buildZipArchive(
  entries: ZipEntryInput[],
  onProgress?: (done: number, total: number, currentPath: string) => void,
): Promise<Blob> {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const cleanPath = entry.path.replace(/^\/+/, "");
    onProgress?.(i + 1, entries.length, cleanPath);

    const nameBytes = encoder.encode(cleanPath);
    const rawBytes = typeof entry.content === "string" ? encoder.encode(entry.content) : entry.content;
    const crc = crc32(rawBytes);
    const { compressed, method } = await deflateRaw(rawBytes);

    // Local file header (30 bytes + file name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    u32(lv, 0, 0x04034b50); // signature
    u16(lv, 4, 20); // version needed (2.0)
    u16(lv, 6, 0x0800); // UTF-8 filename flag
    u16(lv, 8, method);
    u16(lv, 10, 0); // mod time
    u16(lv, 12, 0x5421); // mod date
    u32(lv, 14, crc);
    u32(lv, 18, compressed.length);
    u32(lv, 22, rawBytes.length);
    u16(lv, 26, nameBytes.length);
    u16(lv, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, compressed);

    // Central directory file header (46 bytes + file name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    u32(cv, 0, 0x02014b50);
    u16(cv, 4, 20);
    u16(cv, 6, 20);
    u16(cv, 8, 0x0800);
    u16(cv, 10, method);
    u16(cv, 12, 0);
    u16(cv, 14, 0x5421);
    u32(cv, 16, crc);
    u32(cv, 20, compressed.length);
    u32(cv, 24, rawBytes.length);
    u16(cv, 28, nameBytes.length);
    u16(cv, 30, 0);
    u16(cv, 32, 0);
    u16(cv, 34, 0);
    u16(cv, 36, 0);
    u32(cv, 38, 0);
    u32(cv, 42, offset);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  u32(ev, 0, 0x06054b50);
  u16(ev, 4, 0);
  u16(ev, 6, 0);
  u16(ev, 8, entries.length);
  u16(ev, 10, entries.length);
  u32(ev, 12, centralSize);
  u32(ev, 16, offset);
  u16(ev, 20, 0);

  return new Blob([...localParts, ...centralParts, eocd] as BlobPart[], { type: "application/zip" });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* --------------------- Full project + live settings ZIP -------------------- */

function reconstructInlinedModules(): ZipEntryInput[] {
  return [
    {
      path: "src/lib/images.ts",
      content:
        `// AUTO-GENERATED: local images inlined as data URLs.\n/* eslint-disable */\nexport const IMAGES: Record<string, string> = ${JSON.stringify(IMAGES, null, 2)};\n\nexport function img(p: string): string {\n  return IMAGES[p] ?? p;\n}\n`,
    },
    {
      path: "src/lib/blog-images.ts",
      content:
        `// Inlined blog article photos.\n/* eslint-disable */\nexport const BLOG_IMAGES: Record<string, string> = ${JSON.stringify(BLOG_IMAGES, null, 2)};\n`,
    },
    {
      path: "src/lib/hero-slides.ts",
      content:
        `// Hero slider images inlined as data URLs.\n/* eslint-disable */\nexport const HERO_SLIDES: string[] = ${JSON.stringify(HERO_SLIDES, null, 2)};\n`,
    },
  ];
}

export function collectLiveSettingsSnapshot() {
  return {
    exportedAt: new Date().toISOString(),
    project: "50500.shop",
    siteContent: loadSiteContent(),
    controlCenter: getControlState(),
    adminState: loadAdmin(),
    productOverrides: getProductOverrides(),
    customProducts: getCustomProducts(),
  };
}

/** Collects all repository files + reconstructed image modules + .env + live settings snapshot. */
export function buildFullProjectEntries(cfg?: EnvConfig): ZipEntryInput[] {
  const envCfg = cfg ?? defaultEnv();
  const map = new Map<string, string | Uint8Array>();

  const liveContent = loadSiteContent();

  for (const [rawPath, content] of Object.entries(RAW_ROOT)) {
    const clean = rawPath.replace(/^\/+/, "");
    if (clean === "src/lib/site-content.tsx") {
      // Bake any admin-edited pageContent, imageSlots, articles, and matOptions into the exported code defaults.
      const patched = content.replace(
        `  pageContent: {},\n  imageSlots: {},\n  articles: {},\n  matOptions: { disabledLeather: [], disabledThread: [] },`,
        `  pageContent: ${JSON.stringify(liveContent.pageContent)},\n  imageSlots: ${JSON.stringify(liveContent.imageSlots)},\n  articles: ${JSON.stringify(liveContent.articles)},\n  matOptions: ${JSON.stringify(liveContent.matOptions)},`,
      );
      map.set(clean, patched);
    } else {
      map.set(clean, content);
    }
  }

  for (const mod of reconstructInlinedModules()) {
    map.set(mod.path, mod.content);
  }

  // Include generated .env template and live settings backup
  map.set(".env", renderEnv(envCfg));
  map.set("settings/50500-full-settings.json", JSON.stringify(collectLiveSettingsSnapshot(), null, 2));

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({ path, content }));
}

export async function downloadFullProjectZip(
  cfg?: EnvConfig,
  onProgress?: (done: number, total: number, currentPath: string) => void,
): Promise<number> {
  const entries = buildFullProjectEntries(cfg);
  const blob = await buildZipArchive(entries, onProgress);
  triggerBlobDownload(blob, "50500-shop-full.zip");
  return entries.length;
}

export async function downloadDeployBundleZip(
  cfg: EnvConfig,
  onProgress?: (done: number, total: number, currentPath: string) => void,
): Promise<number> {
  const files = deploymentBundle(cfg);
  const entries: ZipEntryInput[] = files.map((f) => ({ path: f.path, content: f.content }));
  const blob = await buildZipArchive(entries, onProgress);
  triggerBlobDownload(blob, "50500-deploy-bundle.zip");
  return entries.length;
}
