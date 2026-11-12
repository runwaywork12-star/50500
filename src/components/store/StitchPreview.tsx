import { useRef, useState, type PointerEvent } from "react";
import { RotateCcw } from "lucide-react";
import { LeatherCanvas } from "./LeatherCanvas";
import { MAT_PATTERN } from "./Swatches";

/**
 * Live mat preview. There are no preset combinations any more — the customer
 * picks leather + thread and can drag the texture around by hand to inspect
 * the quilting and embroidery from any angle.
 *
 * Performance notes: the shading geometry is cached inside LeatherCanvas, so
 * colour changes repaint only (no heavy recompute). The pixel budget is kept
 * modest so low-end phones paint within a frame or two.
 */
const PIECE = { margin: 34, radius: 38, binding: 22 };
/* Inner overscan is 8% per side; keep the travel inside it so no gap shows. */
const LIMIT = 6;

export function StitchPreview({
  leather,
  thread,
  className = "",
  label,
}: {
  leather: string;
  thread: string;
  className?: string;
  label: string;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const origin = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, v));

  const down = (e: PointerEvent<HTMLDivElement>) => {
    origin.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    // Ignore mostly-vertical movement so page scroll stays smooth.
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    if (Math.abs(dy) > Math.abs(dx) * 1.6) return;
    setOffset({ x: clamp(origin.current.ox + dx * 0.22), y: clamp(origin.current.oy + dy * 0.22) });
  };

  const up = () => setDragging(false);

  return (
    <div
      className={`group/prev select-none overflow-hidden ${className}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      onDoubleClick={() => setOffset({ x: 0, y: 0 })}
      role="img"
      aria-label={`${label} — برای جابه‌جایی بافت بکشید`}
      style={{ touchAction: "pan-y", cursor: dragging ? "grabbing" : "grab" }}
    >
      <div
        className="absolute will-change-transform"
        style={{
          inset: "-8%",
          transform: `translate3d(${offset.x}%, ${offset.y}%, 0)`,
          transition: dragging ? "none" : "transform 420ms cubic-bezier(.22,1,.36,1)",
        }}
      >
        <LeatherCanvas
          leather={leather}
          thread={thread}
          pattern={MAT_PATTERN}
          units={300}
          cell={44}
          piece={PIECE}
          maxPixels={320_000}
          className="size-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.5)]"
          label={label}
        />
      </div>

      {(offset.x !== 0 || offset.y !== 0) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOffset({ x: 0, y: 0 }); }}
          aria-label="بازگشت پیش‌نمایش به مرکز"
          className="on-photo absolute bottom-3 end-3 grid size-8 place-items-center rounded-full backdrop-blur transition hover:scale-105"
          style={{ background: "rgba(5,6,8,.6)", border: "1px solid rgba(255,255,255,.2)" }}
        >
          <RotateCcw className="size-3.5" />
        </button>
      )}
    </div>
  );
}
