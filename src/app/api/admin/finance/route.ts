import { desc, eq, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { financeEntries } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const integer = (v: unknown) => Math.floor(Number(v));

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const [sales, ledger, entries] = await Promise.all([
    pool.query<{ sales: string; margin: string; shipping: string; legacy: number }>(`
      WITH paid_orders AS (
        SELECT id, total, shipping_cost FROM orders
         WHERE status <> 'cancelled' AND payment_status IN ('paid','cod')
      ), item_margin AS (
        SELECT COALESCE(SUM((oi.unit_price - CASE WHEN oi.unit_cost > 0 THEN oi.unit_cost ELSE COALESCE(p.cost_price,0) END) * oi.quantity),0)::bigint AS margin,
               COUNT(*) FILTER (WHERE oi.unit_cost = 0)::int AS legacy
          FROM order_items oi JOIN paid_orders po ON po.id = oi.order_id
          LEFT JOIN products p ON p.id = oi.product_id
      ), order_totals AS (
        SELECT COALESCE(SUM(total),0)::bigint AS sales, COALESCE(SUM(shipping_cost),0)::bigint AS shipping FROM paid_orders
      )
      SELECT ot.sales, im.margin, ot.shipping, im.legacy FROM order_totals ot CROSS JOIN item_margin im
    `),
    db.select({
      income: sql<number>`coalesce(sum(${financeEntries.amount}) filter (where ${financeEntries.type} = 'income' and ${financeEntries.isVoided} = false),0)::bigint`,
      expenses: sql<number>`coalesce(sum(${financeEntries.amount}) filter (where ${financeEntries.type} = 'expense' and ${financeEntries.isVoided} = false),0)::bigint`,
    }).from(financeEntries),
    db.select().from(financeEntries).orderBy(desc(financeEntries.happenedAt), desc(financeEntries.id)).limit(400),
  ]);
  const s = sales.rows[0];
  const otherIncome = Number(ledger[0]?.income ?? 0);
  const expenses = Number(ledger[0]?.expenses ?? 0);
  const grossMargin = Number(s?.margin ?? 0) + Number(s?.shipping ?? 0);
  return Response.json({
    stats: {
      paidSales: Number(s?.sales ?? 0),
      grossMargin,
      otherIncome,
      expenses,
      netEstimate: grossMargin + otherIncome - expenses,
      legacyCostRows: Number(s?.legacy ?? 0),
    },
    entries,
  });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return bad("درخواست نامعتبر است");
  const type = body.type === "income" || body.type === "expense" ? body.type : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 60) : "";
  const amount = integer(body.amount);
  const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 100) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const happenedAt = body.happenedAt ? new Date(String(body.happenedAt)) : new Date();
  if (!type) return bad("نوع تراکنش را مشخص کنید");
  if (title.length < 2 || !category) return bad("عنوان و دسته‌بندی الزامی است");
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 2_000_000_000) return bad("مبلغ باید عدد صحیح مثبت و به تومان باشد");
  if (Number.isNaN(happenedAt.getTime())) return bad("تاریخ تراکنش نامعتبر است");
  const [entry] = await db.insert(financeEntries).values({ type, title, category, amount, reference, note, happenedAt }).returning();
  await logAdminAudit({ action: "finance_entry_created", resource: "finance_entries", resourceId: entry.id, summary: `${type === "income" ? "درآمد" : "هزینه"} ${title}: ${amount} تومان` });
  return Response.json({ ok: true, entry });
}
