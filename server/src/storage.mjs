import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { q } from "./db.mjs";

const DRIVER = process.env.STORAGE_DRIVER ?? "local";
const LOCAL_DIR = process.env.STORAGE_DIR ?? "/data/uploads";
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 8 * 1024 * 1024);

const s3 = DRIVER === "s3"
  ? new S3Client({
      region: process.env.S3_REGION ?? "default",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
    })
  : null;

/** Magic-byte sniffing — the declared MIME type is never trusted. */
function sniff(buf) {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
    if (buf.subarray(0, 6).toString("ascii").startsWith("GIF8")) return "image/gif";
    const head = buf.subarray(0, 200).toString("ascii");
    if (head.includes("ftypavif")) return "image/avif";
  }
  return null; // SVG and everything else is rejected: SVG can carry script.
}

export async function saveUpload(file, { folder = "عمومی", alt = "" } = {}) {
  if (!file?.buffer?.length) throw new Error("فایل خالی است");
  if (file.buffer.length > MAX_BYTES) throw new Error(`حجم فایل باید کمتر از ${Math.round(MAX_BYTES / 1048576)} مگابایت باشد`);
  const kind = sniff(file.buffer);
  if (!kind) throw new Error("فقط JPG، PNG، WebP، GIF یا AVIF مجاز است (SVG به دلیل خطر اسکریپت پذیرفته نمی‌شود)");

  // Re-encode: strips EXIF/GPS, kills polyglot payloads, normalises to WebP.
  const pipeline = sharp(file.buffer, { limitInputPixels: 60_000_000, failOn: "error" }).rotate();
  const meta = await pipeline.metadata();
  const out = await pipeline.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });

  const id = crypto.randomUUID();
  const key = `${new Date().toISOString().slice(0, 7)}/${id}.webp`;

  if (DRIVER === "s3") {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET, Key: key, Body: out.data,
      ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable",
    }));
  } else {
    const dest = path.join(LOCAL_DIR, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, out.data, { mode: 0o640 });
  }

  const asset = {
    id, name: String(file.originalname ?? "image").slice(0, 120).replace(/[^\w.\-\u0600-\u06FF ]/g, ""),
    mime: "image/webp", size: out.data.length, width: out.info.width, height: out.info.height,
    alt: String(alt).slice(0, 200), folder: String(folder).slice(0, 60),
    object_key: key, storage: DRIVER,
    url: publicUrl(key),
  };
  await q(
    `INSERT INTO media(id,name,mime,size,width,height,alt,folder,storage,object_key)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [asset.id, asset.name, asset.mime, asset.size, asset.width, asset.height, asset.alt, asset.folder, asset.storage, key],
  );
  return { ...asset, originalMime: kind, originalWidth: meta.width, originalHeight: meta.height };
}

export function publicUrl(key) {
  if (DRIVER === "s3") return `${(process.env.S3_PUBLIC_BASE ?? "").replace(/\/$/, "")}/${key}`;
  return `/uploads/${key}`;
}

export async function deleteUpload(id) {
  const { rows } = await q("DELETE FROM media WHERE id=$1 RETURNING object_key, storage", [id]);
  const row = rows[0];
  if (!row) return false;
  if (row.storage === "s3") {
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: row.object_key })).catch(() => {});
  } else {
    await fs.unlink(path.join(LOCAL_DIR, row.object_key)).catch(() => {});
  }
  return true;
}

export async function storageHealth() {
  if (DRIVER === "s3") {
    return { ok: Boolean(process.env.S3_BUCKET && process.env.S3_ENDPOINT), driver: "s3", bucket: process.env.S3_BUCKET ?? null };
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const probe = path.join(LOCAL_DIR, ".health");
  await fs.writeFile(probe, "ok");
  await fs.unlink(probe);
  return { ok: true, driver: "local", dir: LOCAL_DIR };
}
