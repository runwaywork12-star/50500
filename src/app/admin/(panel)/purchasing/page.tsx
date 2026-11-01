import { requireAdminPermission } from "@/lib/auth";
import { PurchasingManager } from "@/components/admin/PurchasingManager";
export const dynamic="force-dynamic";
export default async function Page(){
  await requireAdminPermission("inventory:read");
return <div className="grid gap-5"><header><h1 className="text-2xl font-black">تأمین‌کنندگان و سفارش خرید</h1><p className="mt-1 text-sm opacity-60">ثبت تأمین‌کننده، سفارش تأمین کالا و دریافت کامل یا مرحله‌ای؛ رسید کالا موجودی را با سند انبار افزایش می‌دهد.</p></header><PurchasingManager/></div>;}
