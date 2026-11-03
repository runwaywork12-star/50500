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
  if (!body) return bad("درخواست نامعتبر است");

  const allowedStatus = ["requested", "approved", "rejected", "received", "closed"];
  const allowedRefund = ["not_started", "pending", "sent"];
  const status = typeof body.status === "string" && allowedStatus.includes(body.status) ? body.status : null;
  const refundStatus = typeof body.refundStatus === "string" && allowedRefund.includes(body.refundStatus) ? body.refundStatus : null;
  const reference = typeof body.refundReference === "string" ? body.refundReference.trim().slice(0, 140) : undefined;
  const note = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 1500) : undefined;
  if (!status && !refundStatus && reference === undefined && note === undefined) return bad("هیچ تغییر معتبری ارسال نشده است");

  const client = await pool.connect();
  let orderCode = "";
  let restockedUnits = 0;
  let finalStatus = "";
  let finalRefundStatus = "";
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT id,order_id,order_code,status,refund_status,refund_reference,refund_amount,items,restocked_at FROM return_requests WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!locked.rowCount) throw new Error("RETURN_NOT_FOUND");
    const row = locked.rows[0];
    orderCode = String(row.order_code);
    const targetStatus = status ?? String(row.status);
    const targetRefund = refundStatus ?? String(row.refund_status);
    const currentStatus = String(row.status);

    const transitions: Record<string, string[]> = {
      requested: ["requested", "approved", "rejected"],
      approved: ["approved", "received", "rejected", "closed"],
      rejected: ["rejected", "closed"],
      received: ["received", "closed"],
      closed: ["closed"],
    };
    if (!transitions[currentStatus]?.includes(targetStatus)) throw new Error("RETURN_TRANSITION_INVALID");
    if (String(row.refund_status) === "sent" && targetRefund !== "sent") throw new Error("REFUND_ALREADY_SENT");
    if (targetRefund === "sent" && targetStatus !== "received") throw new Error("REFUND_REQUIRES_RECEIPT");
    const targetReference = reference ?? String(row.refund_reference || "");
    if (targetRefund === "sent" && targetReference.trim().length < 3) throw new Error("REFUND_REFERENCE_REQUIRED");
    if (targetRefund === "sent" && Number(row.refund_amount) <= 0) throw new Error("REFUND_AMOUNT_REQUIRED");
    if (targetStatus === "rejected" && targetRefund !== "not_started") throw new Error("REJECTED_REFUND_CONFLICT");
    if (targetStatus === "closed" && targetRefund === "pending") throw new Error("RETURN_REFUND_STILL_PENDING");
    if (targetStatus === "closed" && Number(row.refund_amount) > 0 && targetRefund !== "sent") throw new Error("RETURN_REFUND_NOT_SETTLED");

    // A full-return receipt is restocked exactly once. Items are snapshotted when the case is created.
    if (targetStatus === "received" && !row.restocked_at) {
      const items = Array.isArray(row.items) ? row.items as Array<{ product_id?: number | null; quantity?: number; unit_cost?: number; title?: string }> : [];
      for (const item of items) {
        const productId = Number(item.product_id || 0);
        const quantity = Math.floor(Number(item.quantity || 0));
        if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1) continue;
        const product = await client.query("SELECT id,title FROM products WHERE id=$1 FOR UPDATE", [productId]);
        if (!product.rowCount) throw new Error("RETURN_PRODUCT_MISSING");
        await client.query("UPDATE products SET stock=stock+$1,sales_count=greatest(0,sales_count-$1),updated_at=now() WHERE id=$2", [quantity, productId]);
        await client.query(
          `INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor)
           VALUES($1,$2,'return_restock',$3,$4,'admin')`,
          [productId, quantity, orderCode, `مرجوعی کامل؛ پرونده #${id}`],
        );
        restockedUnits += quantity;
      }
      await client.query("UPDATE return_requests SET restocked_at=now(),restock_note=$1 WHERE id=$2", ["دریافت کامل کالا و بازگشت موجودی به انبار", id]);
    }

    if(targetRefund === "sent" && String(row.refund_status) !== "sent"){
      const accounts=await client.query("SELECT code,id FROM finance_accounts WHERE code IN ('4101','1001') AND is_active=true");
      const byCode=new Map(accounts.rows.map(x=>[String(x.code),Number(x.id)]));
      if(!byCode.has('4101')||!byCode.has('1001'))throw new Error("FINANCE_ACCOUNTS_MISSING");
      const journalCode=`AUTO-RET-REFUND-${id}-${Date.now()}`;
      const journal=await client.query("INSERT INTO finance_journals(journal_code,description,reference) VALUES($1,$2,$3) RETURNING id",[journalCode,`ثبت بازپرداخت سفارش ${orderCode} طبق مرجع بانکی`,targetReference]);
      await client.query("INSERT INTO finance_journal_lines(journal_id,account_id,debit,credit) VALUES($1,$2,$3,0),($1,$4,0,$3)",[Number(journal.rows[0].id),byCode.get('4101'),Number(row.refund_amount),byCode.get('1001')]);
    }

    const fields: string[] = ["status=$1", "refund_status=$2", "updated_at=now()"];
    const values: unknown[] = [targetStatus, targetRefund];
    if (reference !== undefined) { values.push(reference); fields.push(`refund_reference=$${values.length}`); }
    if (note !== undefined) { values.push(note); fields.push(`admin_note=$${values.length}`); }
    values.push(id);
    const updated = await client.query(
      `UPDATE return_requests SET ${fields.join(",")} WHERE id=$${values.length} RETURNING status,refund_status`,
      values,
    );
    finalStatus = String(updated.rows[0].status);
    finalRefundStatus = String(updated.rows[0].refund_status);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error) {
      if (error.message === "RETURN_NOT_FOUND") return bad("پرونده مرجوعی پیدا نشد", 404);
      if (error.message === "RETURN_PRODUCT_MISSING") return bad("یکی از کالاهای ثبت‌شده در پرونده مرجوعی پیدا نشد؛ موجودی تغییر نکرد", 409);
      if (error.message === "RETURN_TRANSITION_INVALID") return bad("تغییر وضعیت با گردش کار مرجوعی سازگار نیست", 409);
      if (error.message === "REFUND_REQUIRES_RECEIPT") return bad("ثبت انتقال وجه فقط پس از ثبت دریافت کالای مرجوعی مجاز است", 409);
      if (error.message === "REFUND_REFERENCE_REQUIRED") return bad("برای ثبت انتقال وجه، شماره پیگیری بانکی معتبر الزامی است", 409);
      if (error.message === "REFUND_AMOUNT_REQUIRED") return bad("مبلغ بازپرداخت باید بیشتر از صفر باشد", 409);
      if (error.message === "REFUND_ALREADY_SENT") return bad("بازپرداخت ثبت‌شده قابل برگشت یا تغییر وضعیت نیست", 409);
      if (error.message === "FINANCE_ACCOUNTS_MISSING") return bad("سرفصل‌های مالی لازم برای ثبت سند پیدا نشدند", 500);
      if (error.message === "REJECTED_REFUND_CONFLICT") return bad("برای رد پرونده، وضعیت بازپرداخت باید شروع‌نشده باشد", 409);
      if (error.message === "RETURN_REFUND_STILL_PENDING") return bad("پرونده تا زمان تعیین تکلیف انتقال وجه قابل بستن نیست", 409);
      if (error.message === "RETURN_REFUND_NOT_SETTLED") return bad("تا زمان ثبت مرجع پرداخت، پرونده دارای مبلغ بازپرداخت بسته نمی‌شود", 409);
    }
    throw error;
  } finally {
    client.release();
  }
  await logAdminAudit({
    action: "return_updated",
    resource: "returns",
    resourceId: id,
    summary: `بروزرسانی پرونده ${orderCode}: ${finalStatus}/${finalRefundStatus}؛ بازگشت موجودی ${restockedUnits} واحد؛ ثبت مرجع بازپرداخت ${finalRefundStatus === "sent" ? "بله" : "خیر"}`,
  });
  return Response.json({
    ok: true,
    status: finalStatus,
    refundStatus: finalRefundStatus,
    restockedUnits,
    notice: restockedUnits > 0
      ? `${restockedUnits} واحد به موجودی برگشت. ارزش مالی کالای مرجوعی را پس از تأیید بهای تمام‌شده در دفتر کل ثبت کنید. ثبت مرجع پرداخت فقط سابقه را نگه می‌دارد و انتقال وجه واقعی باید در بانک یا درگاه انجام شده باشد.`
      : "وضعیت پرونده ثبت شد. انتقال وجه واقعی باید از مسیر بانک یا درگاه انجام شود.",
  });
}
