import { requireAdminPermission } from "@/lib/auth";
import { AuditManager } from "@/components/admin/AuditManager";
export const dynamic="force-dynamic";
export default async function Page(){
  await requireAdminPermission("security:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">گزارش فعالیت و امنیت</h1><p className="mt-1 text-sm opacity-60">سابقه رویدادهای مدیریتی ثبت‌شده در ماژول‌های عملیاتی جدید.</p></header><AuditManager/></div>;}
