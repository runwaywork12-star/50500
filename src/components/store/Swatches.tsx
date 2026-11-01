"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { LeatherCanvas } from "./LeatherCanvas";
import { mixHex } from "@/lib/leather";
import { cn } from "@/lib/format";
import { LEATHER_COLORS, OPTION_LABELS, THREAD_COLORS, leatherById, threadById } from "@/lib/options";

/** The production design of every 50500 mat. */
export const MAT_PATTERN = "diamond" as const;

function PickerHead({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between text-sm">
      <span className="font-bold tdim">{label}</span>
      <span className="rounded-full soft px-2.5 py-0.5 text-xs tdim">{value}</span>
    </div>
  );
}

function ActiveBadge() {
  return (
    <span className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-brand-500 text-[#fff] shadow-lg shadow-black/40">
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

/** Realistic wooden spool with wound embroidery thread, wood grain and paper label. */
export function ThreadSpool({ color, className = "" }: { color: string; className?: string }) {
  const uid = "s" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const deep = mixHex(color, "#000000", 0.62);
  const dark = mixHex(color, "#000000", 0.38);
  const light = mixHex(color, "#ffffff", 0.38);
  const hi = mixHex(color, "#ffffff", 0.66);
  return (
    <svg viewBox="0 0 64 84" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}th`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={deep} />
          <stop offset="0.16" stopColor={dark} />
          <stop offset="0.34" stopColor={color} />
          <stop offset="0.44" stopColor={hi} />
          <stop offset="0.52" stopColor={light} />
          <stop offset="0.62" stopColor={color} />
          <stop offset="0.82" stopColor={dark} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`${uid}wd`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5e4023" />
          <stop offset="0.3" stopColor="#d9b47c" />
          <stop offset="0.45" stopColor="#f0d3a3" />
          <stop offset="0.6" stopColor="#c49a63" />
          <stop offset="0.85" stopColor="#7c5a34" />
          <stop offset="1" stopColor="#4e3519" />
        </linearGradient>
        <pattern id={`${uid}wn`} width="26" height="1.15" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
          <rect width="26" height="0.5" fill="#000" fillOpacity="0.34" />
          <rect y="0.55" width="26" height="0.32" fill="#fff" fillOpacity="0.24" />
        </pattern>
        <pattern id={`${uid}wg`} width="30" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 4.5 Q 8 3.4, 15 4.5 T 30 4.5" stroke="#4a3016" strokeOpacity="0.5" strokeWidth="0.8" fill="none" />
        </pattern>
        <filter id={`${uid}bl`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx="32" cy="79.5" rx="24" ry="3.5" fill="#000" opacity="0.45" filter={`url(#${uid}bl)`} />

      {/* bottom flange */}
      <path d="M6 70 A26 7 0 0 0 58 70 V74.5 A26 7 0 0 1 6 74.5 Z" fill="#3d2812" />
      <path d="M6 70 A26 7 0 0 0 58 70 V74.5 A26 7 0 0 1 6 74.5 Z" fill={`url(#${uid}wd)`} opacity="0.85" />
      <ellipse cx="32" cy="70" rx="26" ry="7" fill={`url(#${uid}wd)`} />
      <ellipse cx="32" cy="70" rx="26" ry="7" fill="none" stroke="#2e1c0c" strokeOpacity="0.7" strokeWidth="1" />
      <ellipse cx="32" cy="70" rx="17" ry="4.4" fill="none" stroke="#5b3d22" strokeOpacity="0.55" strokeWidth="1" />

      {/* thread barrel with fine windings */}
      <path d="M13 17 H51 V69.5 A19 5.2 0 0 1 13 69.5 Z" fill={`url(#${uid}th)`} />
      <path d="M13 17 H51 V69.5 A19 5.2 0 0 1 13 69.5 Z" fill={`url(#${uid}wn)`} />
      {/* specular sheen */}
      <rect x="23.5" y="18" width="6" height="50" rx="3" fill="#fff" opacity="0.28" filter={`url(#${uid}bl)`} />
      {/* windings tuck under the top flange */}
      <path d="M13 17 H51" stroke={deep} strokeWidth="2.4" />

      {/* top flange */}
      <path d="M6 11 A26 7 0 0 0 58 11 V15.5 A26 7 0 0 1 6 15.5 Z" fill="#4a3016" />
      <path d="M6 11 A26 7 0 0 0 58 11 V15.5 A26 7 0 0 1 6 15.5 Z" fill={`url(#${uid}wd)`} />
      <path d="M6 11 A26 7 0 0 0 58 11 V15.5 A26 7 0 0 1 6 15.5 Z" fill={`url(#${uid}wg)`} />
      <ellipse cx="32" cy="11" rx="26" ry="7" fill={`url(#${uid}wd)`} />
      <ellipse cx="32" cy="11" rx="26" ry="7" fill="none" stroke="#f4e2c2" strokeOpacity="0.5" strokeWidth="1" />
      {/* paper label ring */}
      <ellipse cx="32" cy="11" rx="13.5" ry="3.4" fill="#efe6d2" opacity="0.9" />
      <ellipse cx="32" cy="11" rx="13.5" ry="3.4" fill="none" stroke="#b49b6d" strokeWidth="0.8" />
      {/* center hole with depth */}
      <ellipse cx="32" cy="11" rx="6" ry="1.8" fill="#120b05" />
      <ellipse cx="32" cy="10.4" rx="6" ry="1.8" fill="#000" />
      <path d="M27 11.6 A6 1.8 0 0 0 37 11.6" stroke="#8a6a42" strokeOpacity="0.8" strokeWidth="0.8" fill="none" />

      {/* loose thread tail */}
      <path d="M50.5 46 C 57 50, 59.5 58, 56.5 66 C 54.5 71, 49 72.5, 46 70" stroke={color} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <path d="M50.5 46 C 57 50, 59.5 58, 56.5 66" stroke={light} strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function LeatherPicker({
  value,
  onChange,
  threadHex,
}: {
  value: string;
  onChange: (id: string) => void;
  threadHex: string;
}) {
  return (
    <div>
      <PickerHead label={OPTION_LABELS.leather} value={leatherById(value).name} />
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-3 sm:grid-cols-7">
        {LEATHER_COLORS.map((c) => {
          const active = c.id === value;
          return (
            <button key={c.id} type="button" onClick={() => onChange(c.id)} aria-pressed={active} aria-label={`چرم ${c.name}`} className="group flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-2xl shadow-[0_10px_20px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-12px_22px_rgba(0,0,0,0.32)] transition duration-200",
                  active ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-ink-850" : "ring-1 ring-[var(--line)] group-hover:ring-[var(--line)]",
                )}
              >
                <LeatherCanvas
                  leather={c.hex}
                  thread={threadHex}
                  pattern={MAT_PATTERN}
                  units={92}
                  cell={40}
                  maxPixels={72_000}
                  className="size-full transition-transform duration-500 group-hover:scale-110"
                  label={`نمونه چرم ${c.name}`}
                />
                {active && <ActiveBadge />}
              </span>
              <span className={cn("text-[11px] font-semibold", active ? "text-white" : "tdim")}>{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThreadPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <PickerHead label={OPTION_LABELS.thread} value={threadById(value).name} />
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-3 sm:grid-cols-8">
        {THREAD_COLORS.map((c) => {
          const active = c.id === value;
          return (
            <button key={c.id} type="button" onClick={() => onChange(c.id)} aria-pressed={active} aria-label={`نخ گلدوزی ${c.name}`} className="group flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "relative grid aspect-[4/5] w-full place-items-center rounded-2xl bg-linear-to-b from-white/[0.07] to-white/[0.02] transition duration-200",
                  active ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-ink-850" : "ring-1 ring-[var(--line)] group-hover:ring-[var(--line)]",
                )}
              >
                <ThreadSpool color={c.hex} className="h-[86%] w-auto drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]" />
                {active && <ActiveBadge />}
              </span>
              <span className={cn("text-[11px] font-semibold", active ? "text-white" : "tdim")}>{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
