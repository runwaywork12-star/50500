import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { categories, messages, orderItems, orders, payments, products, reviews } from "@/db/schema";
import { toEnDigits } from "./format";

function tehranDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(d);
}

export async function getAdminStats() {
  await ensureDb();
  const [totalsRows, pendingRows, productRows, reviewRows, messageRows, daily, recent, profitRows] = await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} <> 'cancelled' and ${orders.paymentStatus} in ('paid','cod')), 0)::bigint`,
        count: sql<number>`count(*)::int`,
        today: sql<number>`(count(*) filter (where ${orders.createdAt} > now() - interval '24 hours'))::int`,
      })
      .from(orders),
    db.select({ c: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "pending")),
    db.select({ c: sql<number>`count(*)::int` }).from(products).where(eq(products.isActive, true)),
    db.select({ c: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.isApproved, false)),
    db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.isRead, false)),
    pool.query<{ day: string; total: string; count: number }>(
      `select to_char((created_at at time zone 'Asia/Tehran')::date, 'YYYY-MM-DD') as day,
              coalesce(sum(total), 0)::bigint as total, count(*)::int as count
         from orders
        where created_at > now() - interval '7 days' and status <> 'cancelled'
        group by 1 order by 1`,
    ),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(6),
    pool.query<{ profit: string }>(`select coalesce(sum((oi.unit_price - case when oi.unit_cost > 0 then oi.unit_cost else coalesce(p.cost_price, 0) end) * oi.quantity), 0)::bigint as profit
      from order_items oi join orders o on o.id = oi.order_id left join products p on p.id = oi.product_id
      where o.status <> 'cancelled' and o.payment_status in ('paid','cod')`),
  ]);

  const dailyMap = new Map(daily.rows.map((r) => [r.day, { total: Number(r.total), count: r.count }]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400_000);
    const key = tehranDayKey(d);
    const label = new Intl.DateTimeFormat("fa-IR", { weekday: "short", timeZone: "Asia/Tehran" }).format(d);
    return { key, label, total: dailyMap.get(key)?.total ?? 0, count: dailyMap.get(key)?.count ?? 0 };
  });

  return {
    revenue: Number(totalsRows[0]?.revenue ?? 0),
    estimatedGrossProfit: Number(profitRows.rows[0]?.profit ?? 0),
    orderCount: totalsRows[0]?.count ?? 0,
    todayCount: totalsRows[0]?.today ?? 0,
    pendingCount: pendingRows[0]?.c ?? 0,
    productCount: productRows[0]?.c ?? 0,
    pendingReviews: reviewRows[0]?.c ?? 0,
    unreadMessages: messageRows[0]?.c ?? 0,
    days,
    recent,
  };
}

export async function getAdminOrders(status?: string, q?: string) {
  await ensureDb();
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(orders.status, status));
  if (q?.trim()) {
    const term = `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`;
    const digits = `%${toEnDigits(q.trim())}%`;
    conditions.push(or(ilike(orders.code, digits), ilike(orders.customerName, term), ilike(orders.phone, digits), ilike(orders.city, term), ilike(orders.province, term))!);
  }
  const rows = await db
    .select()
    .from(orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(250);
  const ids = rows.map((r) => r.id);
  const [items, manualAttempts] = ids.length ? await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
    db.select({ orderId: payments.orderId }).from(payments)
      .where(and(inArray(payments.orderId, ids), eq(payments.gateway, "manual"), eq(payments.status, "awaiting_transfer"))),
  ]) : [[], []];
  const pendingManualOrderIds = new Set(manualAttempts.map((p) => p.orderId));
  return rows.map((o) => ({
    ...o,
    items: items.filter((i) => i.orderId === o.id),
    hasPendingManualTransfer: pendingManualOrderIds.has(o.id),
  }));
}

export async function getAdminProducts(q: string | undefined, page: number, perPage = 30) {
  await ensureDb();
  const conds: (SQL | undefined)[] = [];
  if (q) {
    const v = `%${q.trim()}%`;
    const v2 = `%${toEnDigits(q.trim())}%`;
    conds.push(or(ilike(products.title, v), ilike(products.slug, v2)));
  }
  const where = conds.length ? and(...conds) : undefined;
  const [rows, count] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        description: products.description,
        specs: products.specs,
        price: products.price,
        costPrice: products.costPrice,
        comparePrice: products.comparePrice,
        stock: products.stock,
        salesCount: products.salesCount,
        isFeatured: products.isFeatured,
        isActive: products.isActive,
        images: products.images,
        categoryName: categories.shortName,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(desc(products.id))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ c: sql<number>`count(*)::int` }).from(products).where(where),
  ]);
  const total = count[0]?.c ?? 0;
  return { rows, total, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAdminReviews() {
  await ensureDb();
  return db
    .select({
      id: reviews.id,
      name: reviews.name,
      city: reviews.city,
      rating: reviews.rating,
      comment: reviews.comment,
      isApproved: reviews.isApproved,
      createdAt: reviews.createdAt,
      productTitle: products.title,
      productSlug: products.slug,
    })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .orderBy(reviews.isApproved, desc(reviews.createdAt))
    .limit(150);
}

export async function getAdminMessages() {
  await ensureDb();
  return db.select().from(messages).orderBy(messages.isRead, desc(messages.createdAt)).limit(150);
}

export async function getAdminBadges() {
  await ensureDb();
  const [o, r, m] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "pending")),
    db.select({ c: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.isApproved, false)),
    db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.isRead, false)),
  ]);
  return { orders: o[0]?.c ?? 0, reviews: r[0]?.c ?? 0, messages: m[0]?.c ?? 0 };
}

export async function getCategoryOptions() {
  await ensureDb();
  return db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).orderBy(categories.sortOrder);
}
