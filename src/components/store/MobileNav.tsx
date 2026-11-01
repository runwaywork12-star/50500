"use client";

import { ThemeLink as Link } from "@/components/ThemeLink";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, PackageCheck, Phone, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn, fa } from "@/lib/format";

export function MobileNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const items = [
    { href: "/", label: "خانه", icon: House },
    { href: "/products", label: "فروشگاه", icon: LayoutGrid },
    { href: "/cart", label: "سبد خرید", icon: ShoppingBag, special: true, badge: count },
    { href: "/track", label: "پیگیری", icon: PackageCheck },
    { href: "/contact", label: "تماس", icon: Phone },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bd bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, special, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors", active ? "text-brand-400" : "tdim")}
            >
              {special ? (
                <span className="relative -mt-7 grid size-12 place-items-center rounded-2xl bg-linear-to-br from-brand-400 to-brand-600 text-[#fff] shadow-lg shadow-brand-500/40 ring-4 ring-ink-950">
                  <Icon className="size-5" />
                  {!!badge && (
                    <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-photo px-1 text-[10px] font-black text-ink-950 ring-2 ring-ink-950">
                      {fa(badge)}
                    </span>
                  )}
                </span>
              ) : (
                <Icon className="size-5" />
              )}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
