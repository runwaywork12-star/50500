import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { categories, products } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const categoryId = Number(url.searchParams.get("categoryId") || 0);
  const conditions: SQL[] = [];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(ilike(products.title, pattern), ilike(products.slug, pattern))!);
  }
  if (Number.isInteger(categoryId) && categoryId > 0) conditions.push(eq(products.categoryId, categoryId));
  const rows = await db.select({ id: products.id, title: products.title, slug: products.slug, price: products.price, stock: products.stock, isActive: products.isActive, isFeatured: products.isFeatured, categoryName: categories.name })
    .from(products).innerJoin(categories, eq(products.categoryId, categories.id))
    .where(conditions.length ? and(...conditions) : undefined).orderBy(desc(products.id)).limit(500);
  return Response.json({ rows, truncated: rows.length === 500 });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !Array.isArray(body.ids)) return bad("فهرست کالاهای انتخاب‌شده معتبر نیست");
  const ids = Array.from(new Set(body.ids.map(Number))).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length || ids.length > 250) return bad("برای ویرایش گروهی بین ۱ تا ۲۵۰ کالا انتخاب کنید");
  const patch: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  if (typeof body.isFeatured === "boolean") patch.isFeatured = body.isFeatured;
  const pricePercent = body.pricePercent === undefined ? null : Number(body.pricePercent);
  const stockDelta = body.stockDelta === undefined ? null : Math.floor(Number(body.stockDelta));
  const categoryId = body.categoryId === undefined ? null : Math.floor(Number(body.categoryId));
  if (pricePercent !== null && (!Number.isFinite(pricePercent) || pricePercent < -90 || pricePercent > 300)) return bad("درصد تغییر قیمت باید بین ۹۰- تا ۳۰۰ باشد");
  if (stockDelta !== null && (!Number.isInteger(stockDelta) || Math.abs(stockDelta) > 5000)) return bad("تغییر موجودی نامعتبر است");
  if (categoryId !== null) {
    if (!Number.isInteger(categoryId) || categoryId < 1) return bad("دسته‌بندی نامعتبر است");
    const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (!category) return bad("دسته‌بندی پیدا نشد");
    patch.categoryId = categoryId;
  }
  if (pricePercent === null && stockDelta === null && Object.keys(patch).length === 0) return bad("هیچ تغییری انتخاب نشده است");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT id,stock,price FROM products WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [ids]);
    if (locked.rowCount !== ids.length) throw new Error("PRODUCT_SET_CHANGED");
    for (const row of locked.rows) {
      const id = Number(row.id);
      const assignments: string[] = [];
      const values: unknown[] = [];
      const add = (expr: string, value: unknown) => { values.push(value); assignments.push(`${expr}=$${values.length}`); };
      if (patch.isActive !== undefined) add("is_active", patch.isActive);
      if (patch.isFeatured !== undefined) add("is_featured", patch.isFeatured);
      if (patch.categoryId !== undefined) add("category_id", patch.categoryId);
      if (pricePercent !== null) {
        const newPrice = Math.round(Number(row.price) * (1 + pricePercent / 100));
        if (!Number.isSafeInteger(newPrice) || newPrice < 1 || newPrice > 2_000_000_000) throw new Error("PRICE_OUT_OF_RANGE");
        add("price", newPrice);
      }
      if (stockDelta !== null) {
        const oldStock = Number(row.stock);
        const newStock = Math.max(0, oldStock + stockDelta);
        const actualDelta = newStock - oldStock;
        add("stock", newStock);
        if (actualDelta !== 0) {
          await client.query(
            `INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor)
             VALUES($1,$2,'adjustment','BULK-EDIT',$3,'admin')`,
            [id, actualDelta, `اصلاح گروهی موجودی برای ${ids.length} کالا`],
          );
        }
      }
      if (assignments.length) {
        values.push(id);
        await client.query(`UPDATE products SET ${assignments.join(",")},updated_at=now() WHERE id=$${values.length}`, values);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && error.message === "PRODUCT_SET_CHANGED") return bad("فهرست کالاها هنگام ویرایش تغییر کرده است؛ صفحه را تازه کنید", 409);
    if (error instanceof Error && error.message === "PRICE_OUT_OF_RANGE") return bad("قیمت یکی از کالاها پس از تغییر از محدوده مجاز خارج می‌شود؛ درصد را کمتر کنید", 409);
    throw error;
  } finally {
    client.release();
  }
  await logAdminAudit({ action: "products_bulk_updated", resource: "products", resourceId: ids.join(","), summary: `ویرایش گروهی ${ids.length} محصول` });
  return Response.json({ ok: true, updated: ids.length });
}
