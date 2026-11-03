import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth";
import { AdminSecurityManager } from "@/components/admin/AdminSecurityManager";
export const dynamic="force-dynamic";
export default async function MySecurityPage(){
 const context=await getAdminContext();
 if(!context) redirect("/admin/login");
 const apiPath=context.kind==="owner"?"/api/admin/owner-security/totp":"/api/admin/staff/me/totp";
 return <div className="grid gap-5"><header><h1 className="text-2xl font-black">امنیت حساب من</h1><p className="mt-1 text-sm opacity-60">مدیریت احراز هویت دومرحله‌ای حساب {context.kind==="owner"?"مدیر اصلی":"کارمند"} پنل.</p></header><AdminSecurityManager apiPath={apiPath}/></div>;
}
