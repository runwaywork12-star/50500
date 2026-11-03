import { requireAdminPermission } from "@/lib/auth";
import { BlogManager } from "@/components/admin/BlogManager";
export const dynamic = "force-dynamic";
export default async function AdminBlogPage(){
  await requireAdminPermission("content:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">مدیریت مقالات و نوشته‌ها</h1><p className="mt-1 text-sm text-white/50">ایجاد، ویرایش، پیش‌نویس یا انتشار مقاله؛ تنظیم تصویر، متن، تیترهای داخلی و اطلاعات سئو.</p></header><BlogManager/></div>;}
