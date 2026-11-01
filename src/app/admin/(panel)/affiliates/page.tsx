import { requireAdminPermission } from "@/lib/auth";
import { AffiliateManager } from "@/components/admin/AffiliateManager";
export const dynamic="force-dynamic";
export default async function Page(){
  await requireAdminPermission("affiliates:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">همکاران فروش و پورسانت</h1><p className="mt-1 text-sm opacity-60">تعریف کد همکاری، نرخ پورسانت، ثبت دستی سفارش منتسب و پیگیری تسویه‌ها.</p></header><AffiliateManager/></div>;}
