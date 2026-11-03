import { requireAdminPermission } from "@/lib/auth";
import { SiteContentManager, SettingsHistory } from "@/components/admin/SiteContentManager";
import { getSettings } from "@/lib/settings";
export const dynamic = "force-dynamic";
export default async function AdminPagesPage(){
  await requireAdminPermission("content:read");
const settings=await getSettings();return <div className="grid gap-5"><header><h1 className="text-2xl font-black">مدیریت صفحات، نوشته‌ها و ظاهر</h1><p className="mt-1 text-sm text-white/50">ویرایش محتوای قابل تنظیم صفحه اصلی، هدر، فوتر، صفحات درباره ما، تماس، فروشگاه، مجله، فونت‌ها و تنظیمات سئو.</p></header><SiteContentManager initial={settings}/><SettingsHistory/></div>;}
