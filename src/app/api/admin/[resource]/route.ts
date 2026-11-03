import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { carModels, categories, products } from "@/db/schema";
import { CATEGORY_DEFS } from "@/db/seed-data";
import { isAdminRequest } from "@/lib/auth";
import { toEnDigits } from "@/lib/format";
import { PRODUCT_IMAGES } from "@/lib/options";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGES = PRODUCT_IMAGES;

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const { resource } = await params;
  if (resource !== "products") return bad("منبع نامعتبر است", 404);
  await ensureDb();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return bad("درخواست نامعتبر است");
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const categoryId = Number(body.categoryId);
  const modelId = body.modelId ? Number(body.modelId) : null;
  const price = Math.floor(Number(toEnDigits(String(body.price ?? ""))));
  const compareRaw = Math.floor(Number(toEnDigits(String(body.comparePrice ?? ""))));
  const stock = Math.floor(Number(toEnDigits(String(body.stock ?? "0"))));
  const costPrice = Math.floor(Number(toEnDigits(String(body.costPrice ?? "0"))));
  const image = typeof body.image === "string" && ALLOWED_IMAGES.includes(body.image) ? body.image : ALLOWED_IMAGES[0];
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 4000) : "";
  const isFeatured = body.isFeatured === true;

  if (title.length < 3) return bad("عنوان محصول را وارد کنید");
  if (!(price > 0)) return bad("قیمت نامعتبر است");
  if (!(stock >= 0)) return bad("موجودی نامعتبر است");
  if (!(costPrice >= 0)) return bad("بهای تمام‌شده نامعتبر است");

  const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) return bad("دسته‌بندی نامعتبر است");

  let brandId: number | null = null;
  let modelSlug = "";
  if (modelId) {
    const [model] = await db.select().from(carModels).where(eq(carModels.id, modelId)).limit(1);
    if (!model) return bad("مدل خودرو نامعتبر است");
    brandId = model.brandId;
    modelSlug = model.slug;
  }

  const def = CATEGORY_DEFS.find((c) => c.slug === category.slug);
  const slug = `${def?.slugPrefix ?? "p"}-${modelSlug ? `${modelSlug}-` : ""}${Date.now().toString(36)}`;

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(products)
      .values({
        slug,
        title,
        categoryId,
        brandId,
        modelId,
        price,
        costPrice,
        comparePrice: compareRaw > price ? compareRaw : null,
        stock,
        images: Array.from(new Set([image, ...(def?.images ?? [])])).slice(0, 3),
        description: description || category.description,
        specs: def?.specs ?? [],
        rating: 5,
        ratingCount: 0,
        salesCount: 0,
        deliveryDays: def?.delivery ?? "۲ تا ۵ روز کاری",
        isFeatured,
      })
      .returning({ id: products.id, slug: products.slug });
    if (stock > 0) {
      await tx.execute(sql`INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor)
        VALUES(${row.id},${stock},'opening','PRODUCT-CREATE','موجودی اولیه هنگام ایجاد محصول','admin')`);
    }
    return row;
  });
  await logAdminAudit({ action: "product_created", resource: "products", resourceId: created.id, summary: `ایجاد محصول ${title} با موجودی اولیه ${stock}` });
  return Response.json({ ok: true, ...created });
}
