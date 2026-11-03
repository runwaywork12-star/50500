import { AdminStaffManager } from "@/components/admin/AdminStaffManager";
import { requireAdminPermission } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function AdminStaffPage() {
  await requireAdminPermission("security:read");
  return <div className="grid gap-5"><header><h1 className="text-2xl font-black">مدیریت کاربران پنل و دسترسی‌ها</h1><p className="mt-1 text-sm opacity-60">ساخت حساب مستقل برای کارکنان، تعیین مجوز هر ماژول، تغییر رمز و لغو نشست‌های قبلی. این قسمت فقط برای مدیر اصلی است.</p></header><AdminStaffManager/></div>;
}
