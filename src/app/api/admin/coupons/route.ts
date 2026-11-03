import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { coupons } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  return Response.json(await db.select().from(coupons).orderBy(desc(coupons.id)));
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase().slice(0, 30) : "";
  const percent = Math.floor(Number(body.percent));
  const minOrder = Math.floor(Number(body.minOrder ?? 0));
  const maxUses = body.maxUses === undefined || body.maxUses === null || body.maxUses === "" ? null : Math.floor(Number(body.maxUses));
  const startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
  const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
  const maxDiscount = body.maxDiscount === undefined || body.maxDiscount === null || body.maxDiscount === "" ? null : Math.floor(Number(body.maxDiscount));
  if (code.length < 3) return bad("کد تخفیف را وارد کنید");
  if (!(percent >= 1 && percent <= 90)) return bad("درصد باید بین ۱ تا ۹۰ باشد");
  if (!Number.isInteger(minOrder) || minOrder < 0 || (maxDiscount !== null && (!Number.isInteger(maxDiscount) || maxDiscount < 0))) return bad("محدوده مبلغ سفارش یا سقف تخفیف نامعتبر است");
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1000000)) return bad("محدودیت استفاده باید بین ۱ تا یک میلیون باشد");
  if ((startsAt && Number.isNaN(startsAt.getTime())) || (expiresAt && Number.isNaN(expiresAt.getTime())) || (startsAt && expiresAt && expiresAt <= startsAt)) return bad("بازه زمانی تخفیف نامعتبر است");
  await ensureDb();
  try {
    const [row] = await db.insert(coupons).values({ code, percent, maxDiscount, minOrder, maxUses, startsAt, expiresAt }).returning();
    return Response.json({ ok: true, coupon: row });
  } catch {
    return bad("این کد قبلاً ثبت شده است");
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return bad("شناسه نامعتبر است");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<typeof coupons.$inferInsert> = {};
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  if (body.maxUses !== undefined) {
    const value = body.maxUses === null || body.maxUses === "" ? null : Math.floor(Number(body.maxUses));
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 1000000)) return bad("محدودیت استفاده نامعتبر است");
    patch.maxUses = value;
  }
  if (body.startsAt !== undefined) { const value = body.startsAt ? new Date(String(body.startsAt)) : null; if (value && Number.isNaN(value.getTime())) return bad("تاریخ شروع نامعتبر است"); patch.startsAt = value; }
  if (body.expiresAt !== undefined) { const value = body.expiresAt ? new Date(String(body.expiresAt)) : null; if (value && Number.isNaN(value.getTime())) return bad("تاریخ پایان نامعتبر است"); patch.expiresAt = value; }
  if (body.minOrder !== undefined) { const value = Math.floor(Number(body.minOrder)); if (!Number.isInteger(value) || value < 0) return bad("حداقل سفارش نامعتبر است"); patch.minOrder = value; }
  if (body.maxDiscount !== undefined) { const value = body.maxDiscount === null || body.maxDiscount === "" ? null : Math.floor(Number(body.maxDiscount)); if (value !== null && (!Number.isInteger(value) || value < 0)) return bad("سقف تخفیف نامعتبر است"); patch.maxDiscount = value; }
  if (body.percent !== undefined) {
    const n = Math.floor(Number(body.percent));
    if (!(n >= 1 && n <= 90)) return bad("درصد نامعتبر است");
    patch.percent = n;
  }
  await ensureDb();
  if (patch.maxUses !== undefined && patch.maxUses !== null) {
    const [current] = await db.select({ usageCount: coupons.usageCount }).from(coupons).where(eq(coupons.id, id)).limit(1);
    if (!current) return bad("کد تخفیف پیدا نشد", 404);
    if (patch.maxUses < current.usageCount) return bad("سقف استفاده نمی‌تواند کمتر از تعداد مصرف‌شده باشد", 409);
  }
  await db.update(coupons).set(patch).where(eq(coupons.id, id));
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return bad("شناسه نامعتبر است");
  await ensureDb();
  const [current] = await db.select({ usageCount: coupons.usageCount }).from(coupons).where(eq(coupons.id, id)).limit(1);
  if (current && current.usageCount > 0) return bad("این کد سابقه مصرف دارد؛ برای حفظ گزارش‌ها آن را غیرفعال کنید، حذف دائمی ممکن نیست", 409);
  await db.delete(coupons).where(eq(coupons.id, id));
  return Response.json({ ok: true });
}
