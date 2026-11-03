import { requireAdminPermission } from "@/lib/auth";
import { AiWorkbench } from "@/components/admin/ControlCenterClient";
export const dynamic = "force-dynamic";
export default async function AdminContentPage(){
  await requireAdminPermission("integrations:read");
 return <div className="grid gap-2"><div className="mb-3"><h1 className="text-2xl font-black">استودیوی محتوا و هوش مصنوعی</h1><p className="mt-1 text-sm text-white/50">تولید کلمات کلیدی، توضیح محصول، متا تگ و پیش‌نویس مقاله</p></div><AiWorkbench/></div>; }
