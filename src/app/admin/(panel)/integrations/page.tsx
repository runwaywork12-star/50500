import { requireAdminPermission } from "@/lib/auth";
import { AgentKeysManager } from "@/components/admin/ControlCenterClient";
export const dynamic = "force-dynamic";
export default async function AdminIntegrationsPage(){
  await requireAdminPermission("integrations:read");
 return <div className="grid gap-2"><div className="mb-3"><h1 className="text-2xl font-black">ایجنت‌ها و اتصال‌های API</h1><p className="mt-1 text-sm text-white/50">مدیریت دسترسی ChatGPT، Claude و ابزارهای خودکار به فروشگاه</p></div><AgentKeysManager/></div>; }
