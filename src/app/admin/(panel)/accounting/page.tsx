import { requireAdminPermission } from "@/lib/auth";
import { FinanceManager } from "@/components/admin/FinanceManager";
import { FinanceJournalManager } from "@/components/admin/FinanceJournalManager";
export const dynamic = "force-dynamic";
export default async function AdminAccountingPage(){
  await requireAdminPermission("finance:read");
return <div className="grid gap-6"><header><h1 className="text-2xl font-black">حسابداری و دفتر مالی</h1><p className="mt-1 text-sm text-white/50">فروش پرداخت‌شده، حاشیه سود تخمینی، هزینه‌ها، درآمدهای متفرقه، دفتر روزنامه متوازن و سرفصل حساب‌ها.</p></header><FinanceManager/><section className="border-t border-current/10 pt-6"><h2 className="mb-4 text-xl font-black">دفتر کل و اسناد دوطرفه</h2><FinanceJournalManager/></section></div>;}
