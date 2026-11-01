import { pool } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Scheduled task: cancel stale online orders and release their stock reservations.
 * Invoke with POST and Authorization: Bearer <CRON_SECRET> from a trusted scheduler.
 * Defaults to 30 minutes; override with UNPAID_ORDER_TTL_MINUTES (5..1440).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) {
    return Response.json({ error: "Cron endpoint is not configured" }, { status: 503 });
  }
  const authorization = req.headers.get("authorization") ?? "";
  if (authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configuredTtl = Number(process.env.UNPAID_ORDER_TTL_MINUTES ?? 30);
  const ttl = Number.isFinite(configuredTtl) ? Math.min(1440, Math.max(5, Math.floor(configuredTtl))) : 30;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // SKIP LOCKED makes concurrent scheduler runs safe: only one worker claims an order.
    const stale = await client.query<{ id: number; code: string }>(
      `SELECT o.id, o.code
         FROM orders o
        WHERE o.status = 'pending'
          AND o.payment_method = 'online'
          AND o.payment_status IN ('pending', 'failed')
          AND o.created_at < now() - ($1::int * interval '1 minute')
          AND NOT EXISTS (
            SELECT 1 FROM payments p
             WHERE p.order_id = o.id AND p.status = 'paid'
          )
        ORDER BY o.created_at
        LIMIT 200
        FOR UPDATE OF o SKIP LOCKED`,
      [ttl],
    );
    for (const order of stale.rows) {
      const lines = await client.query<{ product_id: number | null; quantity: number }>(
        "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
        [order.id],
      );
      for (const line of lines.rows) {
        if (!line.product_id) continue;
        await client.query(
          `UPDATE products
              SET stock = stock + $1,
                  sales_count = greatest(0, sales_count - $1)
            WHERE id = $2`,
          [line.quantity, line.product_id],
        );
      }
      await client.query(`UPDATE coupons SET usage_count = greatest(0, usage_count - 1)
                            WHERE code = (SELECT coupon_code FROM orders WHERE id = $1)`, [order.id]);
      await client.query(
        "UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1",
        [order.id],
      );
    }
    await client.query("COMMIT");
    return Response.json({ ok: true, expired: stale.rows.length, ttlMinutes: ttl });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("expire unpaid orders failed", error);
    return Response.json({ error: "Unable to expire unpaid orders" }, { status: 500 });
  } finally {
    client.release();
  }
}
