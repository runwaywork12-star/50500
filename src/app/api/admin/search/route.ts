import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  await ensureDb();
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ products: [], orders: [], customers: [], suppliers: [], purchases: [], returns: [] });
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const [products, orders, customers, suppliers, purchases, returns] = await Promise.all([
    pool.query("SELECT id,title,slug FROM products WHERE title ILIKE $1 OR slug ILIKE $1 ORDER BY id DESC LIMIT 5", [like]),
    pool.query("SELECT id,code,customer_name,total,status FROM orders WHERE code ILIKE $1 OR customer_name ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC LIMIT 5", [like]),
    pool.query("SELECT id,full_name,phone,email FROM customers WHERE full_name ILIKE $1 OR phone ILIKE $1 OR coalesce(email,'') ILIKE $1 LIMIT 5", [like]),
    pool.query("SELECT id,name,company,phone FROM suppliers WHERE name ILIKE $1 OR company ILIKE $1 OR phone ILIKE $1 LIMIT 4", [like]),
    pool.query("SELECT id,code,status,total_cost FROM purchase_orders WHERE code ILIKE $1 ORDER BY created_at DESC LIMIT 4", [like]),
    pool.query("SELECT id,order_code,customer_name,status FROM return_requests WHERE order_code ILIKE $1 OR customer_name ILIKE $1 ORDER BY requested_at DESC LIMIT 4", [like]),
  ]);
  return Response.json({ products: products.rows, orders: orders.rows, customers: customers.rows, suppliers: suppliers.rows, purchases: purchases.rows, returns: returns.rows });
}
