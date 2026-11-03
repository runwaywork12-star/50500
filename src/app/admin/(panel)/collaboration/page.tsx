import { requireAdminPermission } from "@/lib/auth";
import { AgentKeysManager } from "@/components/admin/ControlCenterClient";
export const dynamic = "force-dynamic";
export default async function AdminCollaborationPage(){
  await requireAdminPermission("integrations:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">همکاری با سایت و اتصال سرویس‌ها</h1><p className="mt-1 text-sm text-white/50">ساخت دسترسی محدود برای همکار فنی، سیستم‌های اتوماسیون و ایجنت‌های هوش مصنوعی. برای هر توکن فقط دسترسی‌های لازم را فعال کن.</p></header><section className="surface rounded-2xl p-4 text-sm leading-7 text-white/65">توکن‌ها محرمانه هستند و فقط هش آن‌ها در پایگاه داده ذخیره می‌شود. دسترسی‌های نوشتن را فقط به سرویس مورداعتماد بده و دوره‌ای توکن‌های قدیمی را غیرفعال کن.</section><AgentKeysManager/></div>;}
