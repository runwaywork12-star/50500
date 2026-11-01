import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const lowOnly = url.searchParams.get("low") === "1";
  const params: unknown[] = [];
  let where = "";
  if (q) { params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`); where = `WHERE (p.title ILIKE $1 OR p.slug ILIKE $1)`; }
  if (lowOnly) where += `${where ? " AND" : " WHERE"} p.stock <= 5`;
  const [products, movements, summary] = await Promise.all([
    pool.query(`SELECT p.id,p.title,p.slug,p.stock,p.cost_price,p.price,c.short_name AS category_name FROM products p JOIN categories c ON c.id=p.category_id ${where} ORDER BY p.stock ASC,p.title LIMIT 500`, params),
    pool.query(`SELECT m.id,m.product_id,m.quantity_delta,m.movement_type,m.reference,m.note,m.created_at,p.title AS product_title FROM stock_movements m JOIN products p ON p.id=m.product_id ORDER BY m.created_at DESC LIMIT 120`),
    pool.query(`SELECT count(*)::int AS products, count(*) FILTER (WHERE stock <= 5)::int AS low_stock, coalesce(sum(stock),0)::bigint AS units FROM products WHERE is_active=true`),
  ]);
  return Response.json({ products: products.rows, movements: movements.rows, summary: summary.rows[0] });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const productId = Number(body?.productId);
  const newStock = Number(body?.newStock);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  const reference = typeof body?.reference === "string" ? body.reference.trim().slice(0, 100) : "";
  if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isSafeInteger(newStock) || newStock < 0 || newStock > 1_000_000) return bad("شناسه کالا یا موجودی جدید معتبر نیست");
  if (note.length < 3) return bad("علت اصلاح موجودی را بنویسید");
  const client = await pool.connect();
  let delta = 0;
  let title = "";
  try {
    await client.query("BEGIN");
    const current = await client.query<{stock:number; title:string}>("SELECT stock,title FROM products WHERE id=$1 FOR UPDATE", [productId]);
    if (!current.rowCount) { await client.query("ROLLBACK"); return bad("محصول پیدا نشد", 404); }
    delta = newStock - Number(current.rows[0].stock);
    title = current.rows[0].title;
    if (delta === 0) { await client.query("ROLLBACK"); return bad("موجودی جدید با موجودی فعلی برابر است"); }
    await client.query("UPDATE products SET stock=$1,updated_at=now() WHERE id=$2", [newStock, productId]);
    await client.query(`INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor)
      VALUES($1,$2,'adjustment',$3,$4,'admin')`, [productId, delta, reference, note]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  await logAdminAudit({ action:"stock_adjustment", resource:"products", resourceId:productId, summary:`${title}: ${delta > 0 ? "+" : ""}${delta} واحد؛ ${note}` });
  return Response.json({ ok:true, productId, delta, newStock });
}
