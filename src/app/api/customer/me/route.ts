import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/customer-auth";
import { ensureDb } from "@/db/bootstrap";
import { pool } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getCustomer();
  if (!customer) return NextResponse.json({ customer: null }, { status: 401 });
  await ensureDb();
  const [orderResult, statResult] = await Promise.all([
    pool.query(
      `SELECT o.code, o.status, o.payment_status AS "paymentStatus", o.payment_method AS "paymentMethod",
              o.shipping_method AS "shippingMethod", o.tracking_number AS "trackingNumber",
              o.total, o.created_at AS "createdAt",
              COALESCE((SELECT json_agg(json_build_object(
                'title', oi.title, 'quantity', oi.quantity, 'unitPrice', oi.unit_price
              ) ORDER BY oi.id) FROM order_items oi WHERE oi.order_id=o.id), '[]'::json) AS items
       FROM orders o WHERE o.phone=$1 ORDER BY o.created_at DESC LIMIT 30`,
      [customer.phone],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS "orderCount",
              COUNT(*) FILTER (WHERE status NOT IN ('cancelled','delivered'))::int AS "activeCount",
              COALESCE(SUM(total) FILTER (WHERE payment_status='paid'),0)::bigint AS "paidTotal"
       FROM orders WHERE phone=$1`,
      [customer.phone],
    ),
  ]);
  const stats = statResult.rows[0] ?? { orderCount: 0, activeCount: 0, paidTotal: 0 };
  return NextResponse.json({
    customer: { id: customer.id, phone: customer.phone, email: customer.email ?? null, fullName: customer.fullName, createdAt: customer.createdAt },
    stats: { orderCount: Number(stats.orderCount), activeCount: Number(stats.activeCount), paidTotal: Number(stats.paidTotal) },
    orders: orderResult.rows,
  });
}
