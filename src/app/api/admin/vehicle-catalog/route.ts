import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { brands, carModels } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const clean = (v: unknown, max = 120) => typeof v === "string" ? v.trim().slice(0, max) : "";
const slugify = (v: string) => v.normalize("NFKD").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const [brandRows, modelRows] = await Promise.all([
    db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.name)),
    db.select().from(carModels).orderBy(asc(carModels.sortOrder), asc(carModels.name)),
  ]);
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const cell = (value: unknown) => {
      let raw = String(value ?? "");
      if (/^[\s\u0000-\u001f]*[=+@\-]/.test(raw)) raw = `'${raw}`;
      return `"${raw.replace(/"/g, '""')}"`;
    };
    const rows = [["brand_name", "brand_slug", "model_name", "model_full_name", "model_slug", "sort_order"], ...brandRows.flatMap(b => modelRows.filter(m => m.brandId === b.id).map(m => [b.name, b.slug, m.name, m.fullName, m.slug, m.sortOrder]))];
    const csv = "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="50500-vehicle-catalog.csv"', "Cache-Control": "no-store" } });
  }
  return Response.json({ brands: brandRows.map(b => ({ ...b, models: modelRows.filter(m => m.brandId === b.id) })) });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return bad("درخواست نامعتبر است");
  const kind = clean(body.kind, 20);
  const name = clean(body.name);
  const slug = slugify(clean(body.slug, 120) || name);
  const sortOrder = Math.max(0, Math.min(100000, Math.floor(Number(body.sortOrder) || 0)));
  if (kind !== "bulk" && (!name || !slug)) return bad("نام و شناسه دسته لازم است");
  try {
    if (kind === "bulk") {
      const entries = Array.isArray(body.entries) ? body.entries.slice(0, 100) as Array<Record<string, unknown>> : [];
      if (!entries.length) return bad("حداقل یک ردیف برند و مدل وارد کن");
      const result = await db.transaction(async tx => {
        let brandsAdded = 0;
        let modelsAdded = 0;
        let totalModels = 0;
        for (const entry of entries) {
          const brandName = clean(entry.brand, 120);
          const modelNames = Array.isArray(entry.models) ? entry.models.map(v => clean(v, 120)).filter(Boolean).slice(0, 100) : [];
          totalModels += modelNames.length;
          if (!brandName) continue;
          if (totalModels > 500) throw new Error("حداکثر ۵۰۰ مدل در هر بار ورود گروهی مجاز است");
          let [brandRow] = await tx.select().from(brands).where(eq(brands.name, brandName)).limit(1);
          if (!brandRow) {
            const brandSlug = slugify(clean(entry.slug, 120) || brandName) || `brand-${Date.now()}`;
            const [created] = await tx.insert(brands).values({ name: brandName, nameEn: clean(entry.nameEn, 120) || brandName, slug: brandSlug, sortOrder: Math.max(0, Math.floor(Number(entry.sortOrder) || 0)) }).onConflictDoNothing({ target: brands.slug }).returning();
            brandRow = created ?? (await tx.select().from(brands).where(eq(brands.slug, brandSlug)).limit(1))[0];
            if (created) brandsAdded++;
          }
          if (!brandRow) continue;
          for (const [index, modelName] of modelNames.entries()) {
            const existing = await tx.select({ id: carModels.id }).from(carModels).where(and(eq(carModels.brandId, brandRow.id), eq(carModels.name, modelName))).limit(1);
            if (existing.length) continue;
            const baseSlug = `${brandRow.slug}-${slugify(modelName)}`.slice(0, 150);
            const [createdModel] = await tx.insert(carModels).values({ brandId: brandRow.id, name: modelName, fullName: `${brandRow.name} ${modelName}`, slug: baseSlug || `${brandRow.slug}-model-${index + 1}`, sortOrder: index }).onConflictDoNothing({ target: carModels.slug }).returning({ id: carModels.id });
            if (createdModel) modelsAdded++;
          }
        }
        return { brandsAdded, modelsAdded };
      });
      return Response.json({ ok: true, ...result });
    }
    if (kind === "brand") {
      const nameEn = clean(body.nameEn, 120) || name;
      const [created] = await db.insert(brands).values({ name, nameEn, slug, sortOrder }).returning();
      return Response.json({ ok: true, item: { ...created, models: [] } }, { status: 201 });
    }
    if (kind === "model") {
      const brandId = Number(body.brandId);
      if (!Number.isInteger(brandId) || brandId < 1) return bad("برند والد را انتخاب کن");
      const [parent] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1);
      if (!parent) return bad("برند والد پیدا نشد");
      const [created] = await db.insert(carModels).values({ brandId, name, fullName: clean(body.fullName, 180) || name, slug, sortOrder }).returning();
      return Response.json({ ok: true, item: created }, { status: 201 });
    }
    return bad("نوع موردنظر باید برند یا مدل باشد");
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("unique") ? "این شناسه قبلاً ثبت شده است" : e instanceof Error && e.message.includes("حداکثر") ? e.message : "ذخیره انجام نشد؛ شناسه تکراری یا اطلاعات نامعتبر است";
    return bad(msg, msg.includes("حداکثر") ? 400 : 409);
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return bad("درخواست نامعتبر است");
  const kind = clean(body.kind, 20), id = Number(body.id), name = clean(body.name), slug = slugify(clean(body.slug, 120) || name);
  if (!Number.isInteger(id) || id < 1 || !name || !slug) return bad("اطلاعات ویرایش کامل نیست");
  try {
    if (kind === "brand") {
      const [item] = await db.update(brands).set({ name, nameEn: clean(body.nameEn, 120) || name, slug, sortOrder: Math.max(0, Number(body.sortOrder) || 0) }).where(eq(brands.id, id)).returning();
      if (!item) return bad("برند پیدا نشد", 404);
      return Response.json({ ok: true, item });
    }
    if (kind === "model") {
      const brandId = Number(body.brandId);
      if (!Number.isInteger(brandId) || brandId < 1) return bad("برند والد را انتخاب کن");
      const [item] = await db.update(carModels).set({ name, fullName: clean(body.fullName, 180) || name, slug, brandId, sortOrder: Math.max(0, Number(body.sortOrder) || 0) }).where(eq(carModels.id, id)).returning();
      if (!item) return bad("مدل پیدا نشد", 404);
      return Response.json({ ok: true, item });
    }
    return bad("نوع موردنظر نامعتبر است");
  } catch { return bad("ویرایش انجام نشد؛ احتمالاً شناسه تکراری است", 409); }
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return bad("درخواست نامعتبر است");
  const kind = clean(body.kind, 20), id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return bad("شناسه نامعتبر است");
  if (kind === "brand") {
    const children = await db.select({ id: carModels.id }).from(carModels).where(eq(carModels.brandId, id)).limit(1);
    if (children.length) return bad("ابتدا زیرمجموعه‌های این برند را منتقل یا حذف کن", 409);
    const [linked] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, id)).limit(1);
    if (!linked) return bad("برند پیدا نشد", 404);
    await db.delete(brands).where(eq(brands.id, id));
    return Response.json({ ok: true });
  }
  if (kind === "model") {
    // Keep historical product references valid; detach the model from products instead of deleting order history.
    const { products } = await import("@/db/schema");
    const { sql } = await import("drizzle-orm");
    await db.update(products).set({ modelId: null }).where(sql`${products.modelId} = ${id}`);
    await db.delete(carModels).where(eq(carModels.id, id));
    return Response.json({ ok: true });
  }
  return bad("نوع موردنظر نامعتبر است");
}
