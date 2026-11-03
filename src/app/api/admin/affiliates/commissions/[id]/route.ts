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
  if (!Number.isInteger(id) || id < 1) return bad("شناسه نامعتبر است");
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const status = body?.status;
  const reference = typeof body?.payoutReference === "string" ? body.payoutReference.trim().slice(0, 140) : "";
  if (status !== "approved" && status !== "paid" && status !== "void") return bad("وضعیت پورسانت معتبر نیست");
  if (status === "paid" && reference.length < 3) return bad("برای تسویه پورسانت، شماره سند یا مرجع پرداخت لازم است");
  const client = await pool.connect();
  let orderCode = "";
  try {
    await client.query("BEGIN");
    const current = await client.query("SELECT id,order_code,amount,status FROM affiliate_commissions WHERE id=$1 FOR UPDATE", [id]);
    if (!current.rowCount) throw new Error("COMMISSION_NOT_FOUND");
    const row = current.rows[0];
    if (row.status === "paid") throw new Error("COMMISSION_ALREADY_PAID");
    if (row.status === "void" && status !== "void") throw new Error("COMMISSION_VOID_FINAL");
    if (status === "approved" && row.status !== "pending" && row.status !== "approved") throw new Error("COMMISSION_TRANSITION_INVALID");
    if (status === "void" && row.status === "approved" && !reference) throw new Error("COMMISSION_VOID_REFERENCE_REQUIRED");
    if (status === "paid" && row.status !== "approved") throw new Error("COMMISSION_NOT_APPROVED");
    orderCode = String(row.order_code);
    await client.query("UPDATE affiliate_commissions SET status=$1,payout_reference=$2,updated_at=now() WHERE id=$3", [status, reference, id]);
    if (status === "paid") {
      const accounts = await client.query("SELECT code,id FROM finance_accounts WHERE code IN ('6001','1001') AND is_active=true");
      const byCode = new Map(accounts.rows.map(x => [String(x.code), Number(x.id)]));
      if (!byCode.has("6001") || !byCode.has("1001")) throw new Error("FINANCE_ACCOUNTS_MISSING");
      const amount = Number(row.amount);
      if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("COMMISSION_AMOUNT_INVALID");
      const journalCode = `AUTO-AFF-${id}-${Date.now()}`;
      const journal = await client.query("INSERT INTO finance_journals(journal_code,description,reference) VALUES($1,$2,$3) RETURNING id", [journalCode, `تسویه پورسانت همکار برای سفارش ${orderCode}`, reference]);
      await client.query("INSERT INTO finance_journal_lines(journal_id,account_id,debit,credit) VALUES($1,$2,$3,0),($1,$4,0,$3)", [Number(journal.rows[0].id), byCode.get("6001"), amount, byCode.get("1001")]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error) {
      if (error.message === "COMMISSION_NOT_FOUND") return bad("پورسانت پیدا نشد", 404);
      if (error.message === "COMMISSION_ALREADY_PAID") return bad("پورسانت قبلاً تسویه شده و قابل تغییر نیست", 409);
      if (error.message === "COMMISSION_NOT_APPROVED") return bad("ابتدا پورسانت باید تأیید شود", 409);
      if (error.message === "COMMISSION_VOID_FINAL") return bad("پورسانت باطل‌شده قابل فعال‌سازی مجدد نیست", 409);
      if (error.message === "COMMISSION_TRANSITION_INVALID") return bad("تغییر وضعیت پورسانت مجاز نیست", 409);
      if (error.message === "COMMISSION_VOID_REFERENCE_REQUIRED") return bad("برای ابطال پورسانت تأییدشده، مرجع یا توضیح مستند لازم است", 409);
      if (error.message === "FINANCE_ACCOUNTS_MISSING") return bad("سرفصل‌های مالی لازم برای تسویه پورسانت پیدا نشدند", 500);
      if (error.message === "COMMISSION_AMOUNT_INVALID") return bad("مبلغ پورسانت نامعتبر است", 409);
    }
    throw error;
  } finally {
    client.release();
  }
  await logAdminAudit({ action: "affiliate_commission_updated", resource: "affiliate_commissions", resourceId: id, summary: `تغییر وضعیت پورسانت سفارش ${orderCode} به ${status}` });
  return Response.json({ ok: true, journalPosted: status === "paid" });
}
