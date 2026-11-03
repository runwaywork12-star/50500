import { requireAdminPermission } from "@/lib/auth";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { coupons } from "@/db/schema";
import { desc } from "drizzle-orm";
import { CouponManager } from "@/components/admin/CouponManager";
export const dynamic = "force-dynamic";
export default async function AdminPromotionsPage(){
  await requireAdminPermission("content:read");
await ensureDb();const rows=await db.select().from(coupons).orderBy(desc(coupons.id));return <div className="grid gap-5"><header><h1 className="text-2xl font-black">تخفیف‌ها و کمپین‌ها</h1><p className="mt-1 text-sm text-white/50">ساخت کدهای تخفیف با سقف مصرف، حداقل خرید و تاریخ شروع و پایان؛ متن تبلیغات هدر و صفحه اصلی از بخش مدیریت صفحات تغییر می‌کند.</p></header><CouponManager initial={rows}/></div>;}
