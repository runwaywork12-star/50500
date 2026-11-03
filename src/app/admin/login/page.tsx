import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/admin/AdminClient";
import { LogoMark } from "@/components/Logo";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ورود به پنل مدیریت" };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute top-1/4 h-80 w-80 rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <div className="surface rounded-[2rem] p-8">
          <div className="text-center">
            <LogoMark className="mx-auto size-14" />
            <h1 className="mt-5 text-2xl font-black">
              پنل مدیریت <span dir="ltr" className="font-english">50500</span>
            </h1>
            <p className="mt-2 text-sm text-white/50">مدیر اصلی با رمز محیطی و کارکنان با ایمیل و رمز خود وارد شوند</p>
          </div>
          <div className="mt-8">
            <LoginForm />
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white/[0.03] p-3 text-xs text-white/45">
            <ShieldCheck className="size-4 text-emerald-400" /> ورود امن مدیر · دسترسی فقط برای کاربران مجاز
          </p>
        </div>
        <Link href="/" className="mt-6 block text-center text-sm text-white/50 hover:text-brand-300">
          بازگشت به فروشگاه
        </Link>
      </div>
    </div>
  );
}
