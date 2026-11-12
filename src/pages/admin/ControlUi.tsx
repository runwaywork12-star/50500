import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/format";

export function PanelHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-black sm:text-2xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-xs leading-6 tdim sm:text-sm">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className, action, icon }: { title?: string; description?: string; children: ReactNode; className?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-3xl border bd p-4 sm:p-5", className)} style={{ background: "var(--surface-1)" }}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-400">{icon}</span>}
            <div className="min-w-0">
              {title && <h2 className="text-sm font-black">{title}</h2>}
              {description && <p className="mt-1 text-[11px] leading-5 tdim">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-xs font-bold tdim">{label}</span>
      {children}
      {hint && <span className="text-[10px] leading-5 tfaint">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border bd px-3.5 py-3 text-start transition soft-h disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold">{label}</span>
        {description && <span className="mt-1 block text-[10px] leading-5 tdim">{description}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-500" : "soft")}>
        <span className={cn("absolute top-1 size-4 rounded-full bg-white shadow transition-all", checked ? "start-6" : "start-1")} />
      </span>
    </button>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[11px] leading-6", tone === "warning" ? "border-amber-400/25 bg-amber-400/10 text-amber-300" : "border-sky-400/25 bg-sky-400/10 text-sky-300")}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "rose" | "brand" }) {
  const tones = {
    neutral: "border-white/10 bg-white/5 tdim",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    rose: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    brand: "border-brand-500/25 bg-brand-500/10 text-brand-300",
  };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold", tones[tone])}>{children}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed bd px-5 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-400">{icon}</span>
      <h3 className="mt-4 text-sm font-black">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-6 tdim">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
