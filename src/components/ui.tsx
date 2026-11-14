import { ThemeLink as Link } from "@/components/ThemeLink";
import { ArrowLeft, Star } from "lucide-react";
import type { ReactNode, SVGProps } from "react";
import { cn, fa } from "@/lib/format";

export function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`امتیاز ${fa(value)} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(className, i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "tfaint")} />
      ))}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  desc,
  action,
  center = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  desc?: string;
  action?: { href: string; label: string };
  center?: boolean;
}) {
  return (
    <div className={cn("mb-9 flex flex-col gap-5 sm:mb-12", center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between")}>
      <div className={cn("max-w-2xl", center && "mx-auto")}>
        {eyebrow && (
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3.5 py-1.5 text-xs font-bold text-brand-200">
            <span className="size-1.5 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(255,143,69,0.9)]" />
            {eyebrow}
          </p>
        )}
        <h2 className="text-balance text-3xl font-black leading-[1.35] sm:text-4xl lg:text-[2.75rem]">{title}</h2>
        {desc && <p className="mt-4 text-sm leading-8 tdim sm:text-base">{desc}</p>}
        <span className={cn("mt-5 block h-1 w-14 rounded-full bg-linear-to-l from-brand-300 to-brand-600", center && "mx-auto")} />
      </div>
      {action && (
        <Link href={action.href} className="btn btn-ghost shrink-0 px-5 py-3 text-sm">
          {action.label} <ArrowLeft className="size-4" />
        </Link>
      )}
    </div>
  );
}

export function Price({ value, className = "", unitClass = "text-xs font-medium tdim" }: { value: number; className?: string; unitClass?: string }) {
  return (
    <span className={className}>
      {fa(value)} <span className={unitClass}>تومان</span>
    </span>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs tdim">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {item.href ? (
            <Link href={item.href} className="inline-block py-2 transition-colors hover:text-brand-300">
              {item.label}
            </Link>
          ) : (
            <span className="tdim">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="tfaint">/</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageHero({ eyebrow, title, desc, children }: { eyebrow?: string; title?: ReactNode; desc?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b bd">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[110px]" />
      <div className="container-x relative flex flex-col items-center py-8 text-center sm:py-10 lg:py-12">
        {children && <div className="flex justify-center">{children}</div>}
        {eyebrow && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[11px] font-bold text-brand-300">
            <span className="size-1.5 rounded-full bg-brand-400" /> {eyebrow}
          </span>
        )}
        <h1 className="mt-3 text-[1.6rem] font-black leading-tight sm:text-3xl lg:text-[2.6rem]">{title}</h1>
        {desc && <p className="mt-3 max-w-xl text-[13px] leading-7 tdim sm:text-sm sm:leading-8">{desc}</p>}
      </div>
    </section>
  );
}
