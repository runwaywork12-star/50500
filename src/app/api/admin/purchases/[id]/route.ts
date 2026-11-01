import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return bad("شناسه سفارش خرید نامعتبر است");
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (body?.status !== "cancelled") return bad("فقط لغو سفارش خرید در این مسیر مجاز است");
  const client = await pool.connect();
  let code = "";
  try {
    await client.query("BEGIN");
    const order = await client.query("SELECT id,code,status FROM purchase_orders WHERE id=$1 FOR UPDATE", [id]);
    if (!order.rowCount) throw new Error("PO_NOT_FOUND");
    if (order.rows[0].status === "cancelled") throw new Error("PO_ALREADY_CANCELLED");
    const receipt = await client.query("SELECT coalesce(sum(received_quantity),0)::int AS received FROM purchase_order_items WHERE purchase_order_id=$1", [id]);
    if (Number(receipt.rows[0].received) > 0) throw new Error("PO_HAS_RECEIPTS");
    code = String(order.rows[0].code);
    await client.query("UPDATE purchase_orders SET status='cancelled',updated_at=now() WHERE id=$1", [id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error) {
      if (error.message === "PO_NOT_FOUND") return bad("سفارش خرید پیدا نشد", 404);
      if (error.message === "PO_ALREADY_CANCELLED") return bad("این سفارش خرید قبلاً لغو شده است", 409);
      if (error.message === "PO_HAS_RECEIPTS") return bad("سفارش خریدی که بخشی از آن دریافت شده، از این مسیر قابل لغو نیست؛ ابتدا مانده و دریافت‌ها را بررسی کنید", 409);
    }
    throw error;
  } finally { client.release(); }
  await logAdminAudit({ action: "purchase_order_cancelled", resource: "purchase_orders", resourceId: id, summary: `لغو سفارش خرید ${code} قبل از دریافت کالا` });
  return Response.json({ ok: true });
}
