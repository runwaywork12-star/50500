import { requireAdminPermission } from "@/lib/auth";
import { SystemManager } from "@/components/admin/AuditManager";
export const dynamic="force-dynamic";
export default async function Page(){
  await requireAdminPermission("security:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">سلامت سیستم و پشتیبان‌گیری</h1><p className="mt-1 text-sm opacity-60">وضعیت دیتابیس، شمارنده اطلاعات و دریافت خروجی پشتیبان عملیاتی.</p></header><SystemManager/></div>;}
