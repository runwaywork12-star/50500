import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { brands, carModels, categories, products } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
const csvCell = (value: unknown) => {
  let raw = String(value ?? "").replace(/[\r\n]+/g, " ");
  if (/^[\s]*[=+@-]/.test(raw)) raw = "'" + raw;
  return '"' + raw.replace(/"/g, '""') + '"';
};

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  await ensureDb();
  const rawIds = new URL(req.url).searchParams.get("ids") || "";
  const ids = Array.from(new Set(rawIds.split(",").map(Number))).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length || ids.length > 500) return Response.json({ error: "برای خروجی بین ۱ تا ۵۰۰ کالا انتخاب کنید" }, { status: 400 });
  const rows = await db.select({ id: products.id, title: products.title, slug: products.slug, category: categories.name, brand: brands.name, model: carModels.name, price: products.price, costPrice: products.costPrice, comparePrice: products.comparePrice, stock: products.stock, salesCount: products.salesCount, isActive: products.isActive, isFeatured: products.isFeatured, description: products.description })
    .from(products).leftJoin(categories, eq(products.categoryId, categories.id)).leftJoin(brands, eq(products.brandId, brands.id)).leftJoin(carModels, eq(products.modelId, carModels.id))
    .where(inArray(products.id, ids));
  const header = ["شناسه", "عنوان", "شناسه لاتین", "دسته بندی", "برند", "مدل خودرو", "قیمت تومان", "بهای تمام شده تومان", "قیمت قبل تومان", "موجودی", "تعداد فروش", "فعال", "ویژه", "توضیحات"];
  const lines = [header, ...rows.map((r) => [r.id, r.title, r.slug, r.category, r.brand, r.model, r.price, r.costPrice, r.comparePrice, r.stock, r.salesCount, r.isActive ? "بله" : "خیر", r.isFeatured ? "بله" : "خیر", r.description])];
  const csv = "\uFEFF" + lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename*=UTF-8''50500-products-${new Date().toISOString().slice(0, 10)}.csv`, "Cache-Control": "no-store" } });
}
