import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { products, uploads } from "@/db/schema";
import { isAdminPermission } from "@/lib/auth";
import { classifyMat, SLOT_KEYS } from "@/lib/classify-mat";
import { MAT_SLOTS } from "@/lib/mat-photos";
import { SITE_IMAGE_KEYS, getSiteImageUploadId, setSiteImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MAX = 6 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const canManageContent = await isAdminPermission("content:write");
  const canManageCatalog = await isAdminPermission("catalog:write");
  if (!canManageContent && !canManageCatalog) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const target = String(form?.get("target") ?? "");
  const requiredPermission = target.startsWith("product:") ? "catalog:write" : "content:write";
  if (!(await isAdminPermission(requiredPermission))) return bad("برای بارگذاری این تصویر مجوز لازم را ندارید", 403);
  if (!(file instanceof File)) return bad("فایلی انتخاب نشده است");
  if (!TYPES.includes(file.type)) return bad("فقط عکس JPG، PNG یا WEBP مجاز است");
  if (file.size > MAX) return bad("حجم عکس حداکثر ۶ مگابایت است");

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const [row] = await db.insert(uploads).values({ mime: file.type, data }).returning({ id: uploads.id });
  const url = `/api/uploads/${row.id}`;

  if (target === "site:auto") {
    // detect the colour; if detection fails use the first slot that has no photo yet
    let key = await classifyMat(Buffer.from(data, "base64"));
    if (!key) {
      for (const k of SLOT_KEYS) {
        if (!(await getSiteImageUploadId(`mat-${k}`))) {
          key = k;
          break;
        }
      }
    }
    if (!key) return bad("رنگ این عکس تشخیص داده نشد؛ آن را در کارت رنگ مربوطه آپلود کنید");
    await setSiteImage(`mat-${key}`, row.id);
    const slot = MAT_SLOTS.find((x) => x.key === key);
    return Response.json({ ok: true, key, label: slot?.label ?? key, url: `/api/site-image/mat-${key}` });
  }
  if (target === "site:mat-default") {
    // The owner's temporary mat photo is the common default for every vehicle.
    // Individual vehicle product images can later override it independently.
    await Promise.all([
      setSiteImage("mat", row.id),
      ...MAT_SLOTS.map((slot) => setSiteImage(`mat-${slot.key}`, row.id)),
    ]);
    return Response.json({ ok: true, url: "/api/site-image/mat-black-red" });
  }
  if (target.startsWith("site:")) {
    const key = target.slice(5);
    if (!(key in SITE_IMAGE_KEYS)) return bad("مقصد نامعتبر است");
    await setSiteImage(key, row.id);
    return Response.json({ ok: true, url: `/api/site-image/${key}` });
  }
  if (target.startsWith("product:")) {
    const pid = Number(target.slice(8));
    const [p] = await db.select({ images: products.images }).from(products).where(eq(products.id, pid)).limit(1);
    if (!p) return bad("محصول پیدا نشد", 404);
    await db.update(products).set({ images: [url] }).where(eq(products.id, pid));
    return Response.json({ ok: true, url });
  }
  return bad("مقصد نامعتبر است");
}
