import { requireAdminPermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsManager } from "@/components/admin/ControlCenterClient";
import { PaymentTransactions } from "@/components/admin/PaymentTransactions";
export const dynamic = "force-dynamic";
export default async function AdminPaymentsPage(){
  await requireAdminPermission("payments:read");
 const all=await getSettings(); const settings=Object.fromEntries(Object.entries(all).filter(([k])=>k.startsWith("payments."))); return <div className="grid gap-5"><div className="mb-1"><h1 className="text-2xl font-black">مرکز درگاه‌های پرداخت</h1><p className="mt-1 text-sm text-white/50">درگاه‌های متصل این نسخه: زرین‌پال و زیبال؛ همچنین کارت‌به‌کارت با تأیید دستی. پرداخت از طریق کارت‌های عضو شتاب توسط درگاه متصل انجام می‌شود؛ اتصال مستقیم PSPهای دیگر نیازمند قرارداد پذیرندگی، مستندات رسمی و آزمون تأیید است.</p></div><SettingsManager initial={settings}/><div className="surface rounded-2xl p-4 text-sm leading-7 text-amber-100/80">این صفحه فقط درگاه‌هایی را فعال می‌کند که اتصال واقعی آن‌ها در کد وجود دارد. نمایش نام بانک یا PSP به‌تنهایی به‌معنای امکان دریافت وجه نیست. بازپرداخت خودکار نیز در این نسخه فعال نیست.</div><PaymentTransactions/></div>; }
