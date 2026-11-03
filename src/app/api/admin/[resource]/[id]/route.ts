import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { coupons, messages, orderItems, orders, products, reviews } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/options";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ resource: string; id: string }> };
const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const { resource, id } = await params;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId <= 0) return bad("شناسه نامعتبر است");
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  switch (resource) {
    case "orders": {
      const patch: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
      if (typeof body.status === "string" && ORDER_STATUSES.some((s) => s.id === body.status)) patch.status = body.status;
      if (typeof body.paymentStatus === "string" && body.paymentStatus in PAYMENT_STATUSES) {
        if (body.paymentStatus === "paid") return bad("تأیید پرداخت فقط پس از تأیید درگاه معتبر امکان‌پذیر است", 409);
        patch.paymentStatus = body.paymentStatus;
      }
      if (typeof body.trackingNumber === "string") patch.trackingNumber = body.trackingNumber.trim().slice(0, 100);
      if (typeof body.adminNote === "string") patch.adminNote = body.adminNote.trim().slice(0, 2000);
      try {
        await db.transaction(async (tx) => {
        const [current] = await tx.select().from(orders).where(eq(orders.id, rowId)).limit(1);
        if (!current) throw new Error("ORDER_NOT_FOUND");
        if (typeof body.paymentStatus === "string") {
          if (body.paymentStatus === "paid") throw new Error("PAID_STATUS_LOCKED");
          if (current.paymentStatus === "paid" && body.paymentStatus !== "paid") {
            throw new Error("PAID_STATUS_LOCKED");
          }
          if (body.paymentStatus === "cod" && current.paymentMethod !== "cod") {
            throw new Error("COD_STATUS_NOT_ALLOWED");
          }
        }
        const nextStatus = patch.status ?? current.status;
        if (current.paymentStatus === "paid" && current.status !== "cancelled" && nextStatus === "cancelled") {
          throw new Error("PAID_ORDER_CANCELLATION_REQUIRES_REFUND");
        }
        if (current.status !== "cancelled" && nextStatus === "cancelled") {
          if (current.couponCode) await tx.update(coupons).set({ usageCount: sql`greatest(0, ${coupons.usageCount} - 1)` }).where(eq(coupons.code, current.couponCode));
          const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, rowId));
          for (const line of lines) {
            if (!line.productId) continue;
            await tx.update(products)
              .set({ stock: sql`${products.stock} + ${line.quantity}`, salesCount: sql`greatest(0, ${products.salesCount} - ${line.quantity})` })
              .where(eq(products.id, line.productId));
            await tx.execute(sql`INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor)
              VALUES(${line.productId},${line.quantity},'sale_correction',${current.code},'بازگشت موجودی پس از لغو سفارش','admin')`);
          }
        } else if (current.status === "cancelled" && nextStatus !== "cancelled") {
          if (current.couponCode) {
            const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, current.couponCode)).limit(1);
            if (coupon) {
              const claimed = await tx.update(coupons).set({ usageCount: sql`${coupons.usageCount} + 1` }).where(and(eq(coupons.id, coupon.id), eq(coupons.isActive, true), sql`(${coupons.maxUses} IS NULL OR ${coupons.usageCount} < ${coupons.maxUses})`, sql`(${coupons.startsAt} IS NULL OR ${coupons.startsAt} <= now())`, sql`(${coupons.expiresAt} IS NULL OR ${coupons.expiresAt} >= now())`)).returning({id:coupons.id});
              if (!claimed.length) throw new Error("COUPON_LIMIT_REACHED");
            }
          }
          const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, rowId));
          for (const line of lines) {
            if (!line.productId) continue;
            const reserved = await tx.update(products)
              .set({ stock: sql`${products.stock} - ${line.quantity}`, salesCount: sql`${products.salesCount} + ${line.quantity}` })
              .where(and(eq(products.id, line.productId), sql`${products.stock} >= ${line.quantity}`, eq(products.isActive, true)))
              .returning({ id: products.id });
            if (!reserved.length) throw new Error("INSUFFICIENT_STOCK");
            await tx.execute(sql`INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor)
              VALUES(${line.productId},${-line.quantity},'sale_correction',${current.code},'رزرو مجدد موجودی هنگام بازگشایی سفارش','admin')`);
          }
        }
        await tx.update(orders).set(patch).where(eq(orders.id, rowId));
        });
      } catch (error) {
        if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return bad("موجودی برای بازگشایی سفارش کافی نیست", 409);
        if (error instanceof Error && error.message === "ORDER_NOT_FOUND") return bad("سفارش پیدا نشد", 404);
        if (error instanceof Error && error.message === "COUPON_LIMIT_REACHED") return bad("ظرفیت کد تخفیف تکمیل شده و سفارش قابل بازگشایی نیست", 409);
        if (error instanceof Error && error.message === "PAID_STATUS_LOCKED") return bad("وضعیت پرداخت تأییدشده قابل تغییر دستی نیست؛ فرایند بازپرداخت باید جداگانه ثبت شود", 409);
        if (error instanceof Error && error.message === "COD_STATUS_NOT_ALLOWED") return bad("وضعیت پرداخت در محل فقط برای سفارش‌های پرداخت در محل مجاز است", 409);
        if (error instanceof Error && error.message === "PAID_ORDER_CANCELLATION_REQUIRES_REFUND") return bad("سفارش پرداخت‌شده را بدون ثبت بازپرداخت نمی‌توان لغو کرد؛ ابتدا فرایند بازپرداخت را تکمیل کنید", 409);
        throw error;
      }
      break;
    }
    case "products": {
      const patch: Partial<typeof products.$inferInsert> = {};
      if (body.price !== undefined) {
        const n = Math.floor(Number(body.price));
        if (!Number.isSafeInteger(n) || !(n > 0) || n > 2_000_000_000) return bad("قیمت نامعتبر است");
        patch.price = n;
      }
      if (body.comparePrice !== undefined) {
        const n = body.comparePrice === null || body.comparePrice === "" ? 0 : Math.floor(Number(body.comparePrice));
        patch.comparePrice = n > 0 ? n : null;
      }
      if (body.costPrice !== undefined) {
        const n = Math.floor(Number(body.costPrice));
        if (!Number.isSafeInteger(n) || !(n >= 0) || n > 2_000_000_000) return bad("بهای تمام‌شده نامعتبر است");
        patch.costPrice = n;
      }
      if (body.stock !== undefined) {
        const n = Math.floor(Number(body.stock));
        if (!Number.isSafeInteger(n) || !(n >= 0) || n > 1_000_000) return bad("موجودی نامعتبر است");
        patch.stock = n;
      }
      if (typeof body.isFeatured === "boolean") patch.isFeatured = body.isFeatured;
      if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
      if (typeof body.title === "string") {
        if (body.title.trim().length < 3) return bad("عنوان محصول باید حداقل ۳ نویسه باشد");
        patch.title = body.title.trim().slice(0, 200);
      }
      if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 12000);
      if (Array.isArray(body.images)) {
        if (body.images.length > 10 || body.images.some((v) => typeof v !== "string" || v.length > 1000 || !(v.startsWith("/") || /^https:\/\//i.test(v)))) return bad("فهرست تصاویر نامعتبر است");
        patch.images = Array.from(new Set(body.images.map((v) => String(v).trim()).filter(Boolean))).slice(0, 10);
      }
      if (Array.isArray(body.specs)) {
        if (body.specs.length > 40 || body.specs.some((v) => !v || typeof v !== "object" || typeof (v as {label?: unknown}).label !== "string" || typeof (v as {value?: unknown}).value !== "string")) return bad("مشخصات محصول نامعتبر است");
        patch.specs = body.specs.map((v) => ({ label: String((v as {label:string}).label).trim().slice(0,100), value: String((v as {value:string}).value).trim().slice(0,500) }));
      }
      if (Object.keys(patch).length) {
        try {
          await db.transaction(async (tx) => {
            const [current] = await tx.select({ id: products.id, stock: products.stock, title: products.title }).from(products).where(eq(products.id, rowId)).limit(1);
            if (!current) throw new Error("PRODUCT_NOT_FOUND");
            await tx.update(products).set(patch).where(eq(products.id, rowId));
            if (patch.stock !== undefined) {
              const delta = Number(patch.stock) - Number(current.stock);
              if (delta !== 0) await tx.execute(sql`INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor)
                VALUES(${rowId},${delta},'adjustment','ADMIN-EDIT','اصلاح دستی موجودی از ویرایش محصول','admin')`);
            }
          });
        } catch (error) {
          if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") return bad("محصول پیدا نشد", 404);
          throw error;
        }
      }
      break;
    }
    case "reviews": {
      if (typeof body.isApproved === "boolean") await db.update(reviews).set({ isApproved: body.isApproved }).where(eq(reviews.id, rowId));
      break;
    }
    case "messages": {
      if (typeof body.isRead === "boolean") await db.update(messages).set({ isRead: body.isRead }).where(eq(messages.id, rowId));
      break;
    }
    default:
      return bad("منبع نامعتبر است", 404);
  }
  await logAdminAudit({ action: "record_updated", resource, resourceId: rowId, summary: `ویرایش رکورد ${resource}` });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const { resource, id } = await params;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId <= 0) return bad("شناسه نامعتبر است");

  switch (resource) {
    case "products": {
      // Preserve order, purchasing, and stock history: product removal is an archive, not a hard delete.
      const archived = await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, rowId)).returning({ id: products.id });
      if (!archived.length) return bad("محصول پیدا نشد", 404);
      break;
    }
    case "reviews":
      await db.delete(reviews).where(eq(reviews.id, rowId));
      break;
    case "messages":
      await db.delete(messages).where(eq(messages.id, rowId));
      break;
    case "orders":
      return bad("حذف دائمی سفارش غیرفعال است؛ برای حفظ سوابق مالی از وضعیت لغو استفاده کنید", 409);
    default:
      return bad("منبع نامعتبر است", 404);
  }
  await logAdminAudit({ action: "record_deleted", resource, resourceId: rowId, summary: resource === "products" ? "بایگانی محصول (حفظ سوابق سفارش و انبار)" : `حذف رکورد ${resource}` });
  return Response.json({ ok: true });
}
