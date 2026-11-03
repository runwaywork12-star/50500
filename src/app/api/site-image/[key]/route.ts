import { readFile } from "node:fs/promises";
import path from "node:path";
import { ensureDb } from "@/db/bootstrap";
import { SITE_IMAGE_KEYS, getSiteImageUploadId, readUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const def = SITE_IMAGE_KEYS[key];
  if (!def) return new Response("not found", { status: 404 });
  await ensureDb();

  // Hero photos are independently editable in the admin panel. Until a hero
  // photo has been uploaded, reuse the store's real main product photo if one exists.
  let id = await getSiteImageUploadId(key);
  if (!id && key === "hero-mobile") id = await getSiteImageUploadId("hero");
  // Do not reuse a floor-mat photo as the hero fallback: the hero is intended to show
  // 50500's workshop / industrial sewing process until the owner uploads the real photo.
  if (!id && key === "mat") id = await getSiteImageUploadId("mat-black-red");

  const etag = id ? `"u${id}"` : `"f-${key}"`;
  const headers: Record<string, string> = { "Cache-Control": "public, max-age=0, must-revalidate", ETag: etag };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const up = id ? await readUpload(id) : null;
  if (up) return new Response(Buffer.from(up.data, "base64"), { headers: { ...headers, "Content-Type": up.mime } });

  let fallback = def.fallback;
  let file: Buffer;
  try {
    file = await readFile(path.join(process.cwd(), "public", fallback));
  } catch {
    // Always return a local, valid placeholder instead of a broken image.
    fallback = key === "hero" || key === "hero-mobile" ? "images/hero-workshop-50500.png" : "images/mat-default-50500.png";
    file = await readFile(path.join(process.cwd(), "public", fallback));
  }
  const ext = path.extname(fallback).toLowerCase();
  const contentType = ext === ".svg" ? "image/svg+xml" : ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg";
  return new Response(file, { headers: { ...headers, "Content-Type": contentType } });
}
