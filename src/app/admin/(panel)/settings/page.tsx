import { requireAdminPermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsManager } from "@/components/admin/ControlCenterClient";
export const dynamic = "force-dynamic";
export default async function AdminSettingsPage(){
  await requireAdminPermission("content:read");
 const settings=await getSettings(); return <div className="grid gap-2"><div className="mb-3"><h1 className="text-2xl font-black">تنظیمات و مدیریت ظاهر</h1><p className="mt-1 text-sm text-white/50">اطلاعات عمومی، تماس، سئو، محتوای قابل تنظیم سایت؛ مدیریت تصاویر هیرو در بخش «کتابخانه تصاویر» انجام می‌شود</p></div><SettingsManager initial={settings}/></div>; }
