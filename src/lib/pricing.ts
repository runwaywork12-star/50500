import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { fa, toEnDigits } from "./format";

export type CouponResult =
  | { ok: true; id: number; code: string; percent: number; discount: number; message: string }
  | { ok: false; message: string };

export async function evaluateCoupon(rawCode: string, subtotal: number): Promise<CouponResult> {
  const code = toEnDigits(rawCode).trim().toUpperCase();
  if (!code) return { ok: false, message: "کد تخفیف را وارد کنید" };
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(sql`upper(${coupons.code}) = ${code}`, eq(coupons.isActive, true)))
    .limit(1);
  if (!coupon) return { ok: false, message: "کد تخفیف معتبر نیست" };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, message: "زمان شروع این کد تخفیف نرسیده است" };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, message: "مهلت استفاده از این کد تخفیف تمام شده است" };
  if (coupon.maxUses !== null && coupon.usageCount >= coupon.maxUses) return { ok: false, message: "ظرفیت استفاده از این کد تخفیف تکمیل شده است" };
  if (subtotal < coupon.minOrder) {
    return { ok: false, message: `این کد برای خریدهای بالای ${fa(coupon.minOrder)} تومان فعال است` };
  }
  const raw = Math.floor((subtotal * coupon.percent) / 100 / 1000) * 1000;
  const discount = Math.min(raw, coupon.maxDiscount ?? Number.MAX_SAFE_INTEGER);
  return {
    ok: true,
    id: coupon.id,
    code: coupon.code,
    percent: coupon.percent,
    discount,
    message: `${fa(coupon.percent)}٪ تخفیف اعمال شد`,
  };
}
