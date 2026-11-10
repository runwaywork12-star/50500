import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

type Asset = { body: Buffer; gzip?: Buffer; br?: Buffer; type: string; etag: string; cache: string };

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg", ".txt"]);
const assets = new Map<string, Asset>();
let scriptHashes: string[] = [];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Loads the built storefront into memory with precomputed brotli/gzip variants. */
export function loadStatic(dir: string) {
  if (!existsSync(dir)) {
    console.warn(`⚠ static directory "${dir}" not found — only the API will be served`);
    return;
  }
  for (const file of walk(dir)) {
    const ext = extname(file).toLowerCase();
    if (ext === ".html" && !file.endsWith("index.html")) continue; // e.g. third-party credits pages
    const body = readFileSync(file);
    const urlPath = `/${relative(dir, file).split(sep).join("/")}`;
    const asset: Asset = {
      body,
      type: TYPES[ext] ?? "application/octet-stream",
      etag: `"${createHash("sha256").update(body).digest("base64url").slice(0, 22)}"`,
      cache: ext === ".html" ? "no-cache" : "public, max-age=604800, stale-while-revalidate=86400",
    };
    if (COMPRESSIBLE.has(ext) && body.length > 1024) {
      asset.gzip = gzipSync(body, { level: 9 });
      asset.br = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 10, [constants.BROTLI_PARAM_SIZE_HINT]: body.length } });
    }
    assets.set(urlPath, asset);
  }
  const index = assets.get("/index.html");
  if (index) {
    // Hash every inline <script> so the CSP can forbid all other inline/injected scripts.
    const html = index.body.toString("utf8");
    scriptHashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
      (m) => `'sha256-${createHash("sha256").update(m[1], "utf8").digest("base64")}'`,
    );
  }
  console.log(`✓ static: ${assets.size} files, ${scriptHashes.length} inline script hash(es)`);
}

export function contentSecurityPolicy(production: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(" ")}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function serveStatic(path: string, acceptEncoding: string, ifNoneMatch: string | undefined): Response | null {
  let decoded: string;
  try { decoded = decodeURIComponent(path); } catch { return null; }
  const asset = assets.get(decoded === "/" ? "/index.html" : decoded) ?? (extname(decoded) ? undefined : assets.get("/index.html"));
  if (!asset) return null;
  const headers: Record<string, string> = { "Content-Type": asset.type, "Cache-Control": asset.cache, ETag: asset.etag, Vary: "Accept-Encoding" };
  if (ifNoneMatch === asset.etag) return new Response(null, { status: 304, headers });
  let body = asset.body;
  if (asset.br && /\bbr\b/.test(acceptEncoding)) { body = asset.br; headers["Content-Encoding"] = "br"; }
  else if (asset.gzip && /\bgzip\b/.test(acceptEncoding)) { body = asset.gzip; headers["Content-Encoding"] = "gzip"; }
  headers["Content-Length"] = String(body.length);
  return new Response(new Uint8Array(body), { status: 200, headers });
}
