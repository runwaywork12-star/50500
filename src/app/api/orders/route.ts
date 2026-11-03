import { rateLimit, requestClientKey } from "@/lib/rate-limit";
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { coupons, orderItems, orders, products, type OrderItemOption } from "@/db/schema";
import { normalizePhone, toEnDigits } from "@/lib/format";
import { PAYMENT_METHODS, PROVINCES, SHIPPING_METHODS, shippingCost } from "@/lib/options";
import { evaluateCoupon } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function sanitizeOptions(v: unknown): OrderItemOption[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 6).flatMap((o) => {
    if (!o || typeof o !== "object") return [];
    const r = o as Record<string, unknown>;
    const key = str(r.key, 20);
    const label = str(r.label, 30);
    const value = str(r.value, 40);
    if (!key || !label || !value) return [];
    const hex = typeof r.hex === "string" && /^#[0-9a-fA-F]{6}$/.test(r.hex) ? r.hex : undefined;
    return [hex ? { key, label, value, hex } : { key, label, value }];
  });
}

export async function POST(req: Request) {
  const limit = rateLimit(`orders:${requestClientKey(req)}`, 10, 60000);
  if (!limit.allowed) return Response.json({ error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  await ensureDb();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return bad("درخواست نامعتبر است");

  const customerName = str(body.customerName, 80);
  const phone = normalizePhone(str(body.phone, 20));
  const province = str(body.province, 40);
  const city = str(body.city, 50);
  const address = str(body.address, 400);
  const postalCode = toEnDigits(str(body.postalCode, 20)).replace(/\D/g, "");
  const notes = str(body.notes, 500);
  const shippingMethod = str(body.shippingMethod, 20);
  const paymentMethod = str(body.paymentMethod, 20);
  const couponCode = str(body.couponCode, 30);

  if (customerName.length < 3) return bad("نام و نام خانوادگی را کامل وارد کنید");
  if (!/^09\d{9}$/.test(phone)) return bad("شماره موبایل معتبر نیست");
  if (!PROVINCES.includes(province)) return bad("استان را انتخاب کنید");
  if (city.length < 2) return bad("شهر را وارد کنید");
  if (address.length < 10) return bad("آدرس را کامل‌تر وارد کنید");
  if (postalCode && postalCode.length !== 10) return bad("کد پستی باید ۱۰ رقم باشد");
  if (!SHIPPING_METHODS.some((m) => m.id === shippingMethod)) return bad("روش ارسال نامعتبر است");
  if (!PAYMENT_METHODS.some((m) => m.id === paymentMethod)) return bad("روش پرداخت نامعتبر است");

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const lines = rawItems.flatMap((it) => {
    if (!it || typeof it !== "object") return [];
    const r = it as Record<string, unknown>;
    const productId = Number(r.productId);
    const quantity = Math.floor(Number(r.quantity));
    if (!Number.isInteger(productId) || productId <= 0 || !(quantity >= 1 && quantity <= 10)) return [];
    return [{ productId, quantity, options: sanitizeOptions(r.options) }];
  });
  if (!lines.length) return bad("سبد خرید خالی است");

  const ids = Array.from(new Set(lines.map((l) => l.productId)));
  const rows = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.isActive, true)));
  const byId = new Map(rows.map((p) => [p.id, p]));

  const qtyById = new Map<number, number>();
  for (const l of lines) qtyById.set(l.productId, (qtyById.get(l.productId) ?? 0) + l.quantity);
  for (const [id, qty] of qtyById) {
    const p = byId.get(id);
    if (!p) return bad("برخی از محصولات سبد خرید دیگر موجود نیستند؛ لطفاً سبد را بررسی کنید");
    if (p.stock < qty) return bad(`موجودی «${p.title}» کافی نیست`);
  }

  const subtotal = lines.reduce((s, l) => s + byId.get(l.productId)!.price * l.quantity, 0);
  let discount = 0;
  let appliedCoupon: string | null = null;
  let appliedCouponId: number | null = null;
  if (couponCode) {
    const c = await evaluateCoupon(couponCode, subtotal);
    if (!c.ok) return bad(c.message);
    discount = c.discount;
    appliedCoupon = c.code;
    appliedCouponId = c.id;
  }
  const ship = shippingCost(shippingMethod, subtotal - discount);
  const total = subtotal - discount + ship;

  try {
    const code = await db.transaction(async (tx) => {
      let orderId = 0;
      let newCode = "";
      for (let attempt = 0; attempt < 6 && !orderId; attempt++) {
        newCode = String(randomInt(10000000, 100000000));
        const inserted = await tx
          .insert(orders)
          .values({
            code: newCode,
            customerName,
            phone,
            province,
            city,
            address,
            postalCode,
            notes,
            shippingMethod,
            paymentMethod,
            paymentStatus: paymentMethod === "cod" ? "cod" : "pending",
            status: "pending",
            subtotal,
            discount,
            shippingCost: ship,
            total,
            couponCode: appliedCoupon,
          })
          .onConflictDoNothing({ target: orders.code })
          .returning({ id: orders.id });
        if (inserted[0]) orderId = inserted[0].id;
      }
      if (!orderId) throw new Error("could not allocate order code");

      await tx.insert(orderItems).values(
        lines.map((l) => {
          const p = byId.get(l.productId)!;
          return {
            orderId,
            productId: p.id,
            title: p.title,
            image: p.images[0] ?? "",
            unitPrice: p.price,
            unitCost: p.costPrice,
            quantity: l.quantity,
            options: l.options,
          };
        }),
      );
      for (const [id, qty] of qtyById) {
        const reserved = await tx.update(products)
          .set({ stock: sql`${products.stock} - ${qty}` })
          .where(and(eq(products.id, id), sql`${products.stock} >= ${qty}`, eq(products.isActive, true)))
          .returning({ id: products.id });
        if (!reserved.length) throw new Error("INSUFFICIENT_STOCK");
      }
      // Count sales only after stock reservation succeeded for every item.
      for (const [id, qty] of qtyById) {
        await tx.update(products).set({ salesCount: sql`${products.salesCount} + ${qty}` }).where(eq(products.id, id));
      }
      if (appliedCouponId) {
        const claimed = await tx.update(coupons)
          .set({ usageCount: sql`${coupons.usageCount} + 1` })
          .where(and(eq(coupons.id, appliedCouponId), eq(coupons.isActive, true), sql`(${coupons.maxUses} IS NULL OR ${coupons.usageCount} < ${coupons.maxUses})`, sql`(${coupons.startsAt} IS NULL OR ${coupons.startsAt} <= now())`, sql`(${coupons.expiresAt} IS NULL OR ${coupons.expiresAt} >= now())`))
          .returning({ id: coupons.id });
        if (!claimed.length) throw new Error("COUPON_LIMIT_REACHED");
      }
      return newCode;
    });
    return Response.json({ code, paymentMethod, total });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return bad("موجودی یکی از محصولات هم‌زمان تغییر کرد؛ لطفاً سبد خرید را بررسی کنید", 409);
    if (error instanceof Error && error.message === "COUPON_LIMIT_REACHED") return bad("ظرفیت این کد تخفیف در همین لحظه تکمیل شد؛ کد دیگری انتخاب کنید", 409);
    console.error("order failed", error);
    return bad("ثبت سفارش با خطا مواجه شد؛ لطفاً دوباره تلاش کنید", 500);
  }
}
