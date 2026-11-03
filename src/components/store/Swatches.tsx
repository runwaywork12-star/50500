import { Check } from "lucide-react";
import { useId } from "react";
import { LeatherCanvas } from "./LeatherCanvas";
import { mixHex } from "@/lib/leather";
import { cn } from "@/lib/format";
import { LEATHER_COLORS, OPTION_LABELS, THREAD_COLORS, leatherById, threadById } from "@/lib/options";

/** The production design of every 50500 mat. */
export const MAT_PATTERN = "diamond" as const;

/** Fine photographic grain so the canvas reads as real hide, not flat vector. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)' opacity='.55'/%3E%3C/svg%3E\")";

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
    <span className="absolute end-1 top-1 z-10 grid size-5 place-items-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
      <Check className="size-3" strokeWidth={3.2} />
    </span>
  );
}

/** Natural grain + soft vignette layered over a leather sample. */
export function LeatherGrain() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{ backgroundImage: GRAIN, backgroundSize: "140px 140px" }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 30% 20%, rgba(255,255,255,0.14), transparent 55%), radial-gradient(130% 110% at 75% 90%, rgba(0,0,0,0.4), transparent 60%)",
        }}
      />
    </>
  );
}

/**
 * Photographic-looking embroidery spool: soft cylindrical falloff, muted wood,
 * fine windings and a blurred specular band — no hard cartoon outlines.
 */
export function ThreadSpool({ color, className = "" }: { color: string; className?: string }) {
  const uid = "s" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const deep = mixHex(color, "#171316", 0.7);
  const dark = mixHex(color, "#241c1a", 0.44);
  const mid = mixHex(color, "#000000", 0.06);
  const light = mixHex(color, "#ffffff", 0.24);
  const hi = mixHex(color, "#ffffff", 0.5);
  return (
    <svg viewBox="0 0 64 84" className={className} aria-hidden="true">
      <defs>
        {/* thread wound around the barrel with a soft cylinder falloff */}
        <linearGradient id={`${uid}th`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={deep} />
          <stop offset="0.09" stopColor={dark} />
          <stop offset="0.24" stopColor={mid} />
          <stop offset="0.38" stopColor={light} />
          <stop offset="0.47" stopColor={hi} />
          <stop offset="0.58" stopColor={light} />
          <stop offset="0.72" stopColor={mid} />
          <stop offset="0.88" stopColor={dark} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        {/* muted, natural wood */}
        <linearGradient id={`${uid}wd`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5d4227" />
          <stop offset="0.24" stopColor="#a37a4f" />
          <stop offset="0.42" stopColor="#c39c70" />
          <stop offset="0.58" stopColor="#b28a5d" />
          <stop offset="0.8" stopColor="#835f39" />
          <stop offset="1" stopColor="#4d3620" />
        </linearGradient>
        <linearGradient id={`${uid}wdv`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
        {/* fine wound-thread texture */}
        <pattern id={`${uid}wn`} width="26" height="1.7" patternUnits="userSpaceOnUse" patternTransform="rotate(-3)">
          <rect width="26" height="0.7" fill="#000" fillOpacity="0.2" />
          <rect y="0.75" width="26" height="0.4" fill="#fff" fillOpacity="0.15" />
        </pattern>
        <pattern id={`${uid}wg`} width="34" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 3.5 Q 9 2.6, 17 3.5 T 34 3.5" stroke="#6b4a28" strokeOpacity="0.3" strokeWidth="0.7" fill="none" />
        </pattern>
        <filter id={`${uid}bl`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id={`${uid}soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* soft contact shadow */}
      <ellipse cx="33" cy="79.5" rx="20" ry="3" fill="#000" opacity="0.5" filter={`url(#${uid}bl)`} />

      {/* bottom wooden flange */}
      <path d="M8 69.5 A24 6.2 0 0 0 56 69.5 V73.2 A24 6.2 0 0 1 8 73.2 Z" fill="#4a3420" />
      <path d="M8 69.5 A24 6.2 0 0 0 56 69.5 V73.2 A24 6.2 0 0 1 8 73.2 Z" fill={`url(#${uid}wd)`} opacity="0.92" />
      <ellipse cx="32" cy="69.5" rx="24" ry="6.2" fill={`url(#${uid}wd)`} />
      <ellipse cx="32" cy="69.5" rx="24" ry="6.2" fill={`url(#${uid}wdv)`} />
      <ellipse cx="32" cy="69.5" rx="24" ry="6.2" fill="none" stroke="#3a2716" strokeOpacity="0.45" strokeWidth="0.7" />
      <ellipse cx="32" cy="69.8" rx="15.5" ry="3.9" fill="none" stroke="#77532d" strokeOpacity="0.4" strokeWidth="0.7" />

      {/* wound thread barrel */}
      <path d="M14.5 18 H49.5 V69 A17.5 4.9 0 0 1 14.5 69 Z" fill={`url(#${uid}th)`} />
      <path d="M14.5 18 H49.5 V69 A17.5 4.9 0 0 1 14.5 69 Z" fill={`url(#${uid}wn)`} opacity="0.8" />
      {/* soft specular band */}
      <rect x="24.5" y="20" width="8" height="45" rx="4" fill="#fff" opacity="0.13" filter={`url(#${uid}soft)`} />
      {/* shadow under the top flange */}
      <path d="M14.5 18 H49.5" stroke="#000" strokeOpacity="0.32" strokeWidth="2.4" filter={`url(#${uid}soft)`} />
      {/* side falloff so the barrel reads as a cylinder */}
      <path d="M14.5 18 V69" stroke="#000" strokeOpacity="0.2" strokeWidth="3" filter={`url(#${uid}soft)`} />
      <path d="M49.5 18 V69" stroke="#000" strokeOpacity="0.28" strokeWidth="3.4" filter={`url(#${uid}soft)`} />

      {/* top wooden flange */}
      <path d="M8 12 A24 6.2 0 0 0 56 12 V15.7 A24 6.2 0 0 1 8 15.7 Z" fill="#5d4227" />
      <path d="M8 12 A24 6.2 0 0 0 56 12 V15.7 A24 6.2 0 0 1 8 15.7 Z" fill={`url(#${uid}wd)`} />
      <path d="M8 12 A24 6.2 0 0 0 56 12 V15.7 A24 6.2 0 0 1 8 15.7 Z" fill={`url(#${uid}wg)`} />
      <ellipse cx="32" cy="12" rx="24" ry="6.2" fill={`url(#${uid}wd)`} />
      <ellipse cx="32" cy="12" rx="24" ry="6.2" fill={`url(#${uid}wdv)`} />
      <ellipse cx="32" cy="12" rx="24" ry="6.2" fill="none" stroke="#3a2716" strokeOpacity="0.42" strokeWidth="0.7" />
      {/* paper label */}
      <ellipse cx="32" cy="12" rx="12.6" ry="3.2" fill="#e7dcc7" opacity="0.9" />
      <ellipse cx="32" cy="12" rx="12.6" ry="3.2" fill="none" stroke="#a68c62" strokeOpacity="0.6" strokeWidth="0.6" />
      <ellipse cx="32" cy="11.4" rx="12.6" ry="3.2" fill="#ffffff" opacity="0.2" />
      {/* hub hole with depth */}
      <ellipse cx="32" cy="12" rx="5.4" ry="1.65" fill="#1d140b" />
      <ellipse cx="32" cy="11.5" rx="5.4" ry="1.65" fill="#0a0705" />
      <path d="M27 12.6 A5.4 1.65 0 0 0 37 12.6" stroke="#7d5c36" strokeOpacity="0.65" strokeWidth="0.7" fill="none" />

      {/* loose thread tail */}
      <path d="M48.5 43 C 55 47.5, 57.5 56, 54.5 63.5 C 52.5 68.5, 47.5 70.5, 44.5 68.5" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.95" />
      <path d="M48.5 43 C 55 47.5, 57.5 56, 54.5 63.5" stroke={light} strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.55" />
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
  /* Slightly muted thread on the sample keeps the stitching from looking printed. */
  const stitch = mixHex(threadHex, "#000000", 0.14);
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
                  "relative block aspect-square w-full overflow-hidden rounded-2xl",
                  "shadow-[0_10px_18px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-14px_24px_rgba(0,0,0,0.4)]",
                  "transition duration-200",
                  active ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-[var(--surface-2,transparent)]" : "ring-1 ring-[var(--line)] group-hover:ring-[var(--line-strong)]",
                )}
              >
                {/* Finer quilting + grain: reads as photographed leather, not vector art. */}
                <LeatherCanvas
                  leather={c.hex}
                  thread={stitch}
                  pattern={MAT_PATTERN}
                  units={150}
                  cell={30}
                  maxPixels={72_000}
                  className="size-full transition-transform duration-500 group-hover:scale-[1.05]"
                  label={`نمونه چرم ${c.name}`}
                />
                <LeatherGrain />
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
                  "relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-2xl",
                  "bg-[radial-gradient(120%_90%_at_50%_15%,rgba(255,255,255,0.09),transparent_65%),linear-gradient(180deg,#171a1f,#0e1014)]",
                  "transition duration-200",
                  active ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-[var(--surface-2,transparent)]" : "ring-1 ring-[var(--line)] group-hover:ring-[var(--line-strong)]",
                )}
              >
                <ThreadSpool color={c.hex} className="relative z-10 h-[82%] w-auto drop-shadow-[0_5px_7px_rgba(0,0,0,0.55)] transition-transform duration-300 group-hover:-translate-y-0.5" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(90% 70% at 50% 0%, rgba(255,255,255,0.08), transparent 60%)" }}
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
