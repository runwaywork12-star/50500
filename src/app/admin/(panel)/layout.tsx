import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { AdminCommandSearch } from "@/components/admin/AdminCommandSearch";
import { AdminNav } from "@/components/admin/AdminClient";
import { Logo } from "@/components/Logo";
import { getAdminBadges } from "@/lib/admin-queries";
import { getAdminContext } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پنل مدیریت" };

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const context = await getAdminContext();
  if (!context) return redirect("/admin/login");
  const allBadges = await getAdminBadges();
  const canSee = (module: string) => context.kind === "owner" || context.permissions.includes(`${module}:read`) || context.permissions.includes(`${module}:write`) || context.permissions.includes(`${module}:*`);
  const badges = { ...allBadges, orders: canSee("orders") ? allBadges.orders : 0, reviews: canSee("support") ? allBadges.reviews : 0, messages: canSee("support") ? allBadges.messages : 0 };
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="flex flex-col border-b border-white/5 bg-ink-900 p-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-e lg:p-5">
        <div className="mb-4 flex items-center justify-between lg:mb-0 lg:block">
          <Logo href="/admin" />
          <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[10px] font-bold text-brand-300 lg:mt-3 lg:inline-block">پنل مدیریت</span>
        </div>
        <AdminNav badges={badges} permissions={context.permissions} owner={context.kind === "owner"} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-white/5 bg-ink-950/80 px-8 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-4"><p className="text-sm text-white/50">خوش آمدید 👋 {context.name}</p>{context.kind === "owner" && <AdminCommandSearch />}</div>
          <Link href="/" target="_blank" className="flex items-center gap-2 text-sm text-white/60 hover:text-brand-300">
            <ExternalLink className="size-4" /> مشاهده فروشگاه
          </Link>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
