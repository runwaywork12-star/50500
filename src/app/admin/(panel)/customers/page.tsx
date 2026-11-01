import { requireAdminPermission } from "@/lib/auth";
import { CustomerManager } from "@/components/admin/CustomerManager";
export const dynamic = "force-dynamic";
export default async function AdminCustomersPage(){
  await requireAdminPermission("customers:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">مشتریان و باشگاه مشتریان</h1><p className="mt-1 text-sm text-white/50">اطلاعات حساب، سابقه سفارش، مبالغ پرداخت‌شده و کنترل فعال یا مسدود بودن حساب.</p></header><CustomerManager/></div>;}
