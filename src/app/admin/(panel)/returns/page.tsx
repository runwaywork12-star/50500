import { requireAdminPermission } from "@/lib/auth";
import { ReturnsManager } from "@/components/admin/ReturnsManager";
export const dynamic="force-dynamic";
export default async function Page(){
  await requireAdminPermission("returns:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">مرجوعی و بازپرداخت</h1><p className="mt-1 text-sm opacity-60">پرونده مرجوعی، بررسی کالا، وضعیت بازپرداخت و ثبت سند انتقال وجه خارج از سایت.</p></header><ReturnsManager/></div>;}
