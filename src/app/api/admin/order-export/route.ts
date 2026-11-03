import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { orders } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { toEnDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  let text = String(value ?? "").replace(/[\r\n]+/g, " ");
  // Prevent spreadsheet formula injection when admins open exports in Excel/Sheets.
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  await ensureDb();
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "").slice(0, 30);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(orders.status, status));
  if (q) {
    const term = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const digits = `%${toEnDigits(q)}%`;
    conditions.push(or(ilike(orders.code, digits), ilike(orders.customerName, term), ilike(orders.phone, digits), ilike(orders.city, term), ilike(orders.province, term))!);
  }
  const rows = await db.select().from(orders).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(orders.createdAt)).limit(5000);
  const header = ["کد سفارش", "نام مشتری", "موبایل", "استان", "شهر", "آدرس", "کد پستی", "اقلام قبل از تخفیف", "تخفیف", "هزینه ارسال", "مبلغ نهایی تومان", "وضعیت سفارش", "وضعیت پرداخت", "روش پرداخت", "روش ارسال", "کد رهگیری", "یادداشت مشتری", "یادداشت مدیر", "تاریخ ایجاد"];
  const lines = [header, ...rows.map(o => [o.code,o.customerName,o.phone,o.province,o.city,o.address,o.postalCode,o.subtotal,o.discount,o.shippingCost,o.total,o.status,o.paymentStatus,o.paymentMethod,o.shippingMethod,o.trackingNumber,o.notes,o.adminNote,o.createdAt.toISOString()])];
  const csv = "\uFEFF" + lines.map(row => row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="50500-orders-${new Date().toISOString().slice(0,10)}.csv"`, "Cache-Control": "no-store" } });
}
