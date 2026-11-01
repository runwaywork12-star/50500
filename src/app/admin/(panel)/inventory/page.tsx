import { requireAdminPermission } from "@/lib/auth";
import { InventoryManager } from "@/components/admin/InventoryManager";
export const dynamic="force-dynamic";
export default async function Page(){
  await requireAdminPermission("inventory:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">انبار و گردش موجودی</h1><p className="mt-1 text-sm opacity-60">موجودی لحظه‌ای محصولات، هشدار موجودی کم و ثبت اصلاحات با سابقه قابل پیگیری.</p></header><InventoryManager/></div>;}
