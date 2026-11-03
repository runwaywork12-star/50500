import { requireAdminPermission } from "@/lib/auth";
import { PageBuilderManager } from "@/components/admin/PageBuilderManager";
export const dynamic="force-dynamic";
export default async function Page(){
  await requireAdminPermission("content:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">صفحه‌ساز بلوکی</h1><p className="mt-1 text-sm opacity-60">ساخت صفحات فرود سفارشی با بلوک متن، تصویر، ویژگی، فراخوان و پرسش‌وپاسخ؛ همراه پیش‌نویس، انتشار و SEO.</p></header><PageBuilderManager/></div>;}
