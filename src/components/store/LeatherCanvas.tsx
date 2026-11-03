
import { useEffect, useRef, useState } from "react";
import { computeShading, paintLeather, type LeatherGeometry, type LeatherPattern, type LeatherPiece, type Shading } from "@/lib/leather";

type Props = {
  leather: string;
  thread?: string | null;
  pattern: LeatherPattern;
  /** texture units across the canvas width (smaller = bigger quilting) */
  units?: number;
  cell?: number;
  piece?: LeatherPiece | null;
  /** internal pixel budget (keeps rendering fast on high-DPI screens) */
  maxPixels?: number;
  lazy?: boolean;
  seed?: number;
  className?: string;
  label?: string;
};

export function LeatherCanvas({
  leather,
  thread = null,
  pattern,
  units = 100,
  cell = 44,
  piece = null,
  maxPixels = 120_000,
  lazy = false,
  seed = 7,
  className = "",
  label,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shading = useRef<Shading | null>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  const [visible, setVisible] = useState(!lazy);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) => (prev && Math.abs(prev[0] - r.width) < 1 && Math.abs(prev[1] - r.height) < 1 ? prev : [r.width, r.height]));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const hasPiece = Boolean(piece);
  const pm = piece?.margin ?? 0;
  const pr = piece?.radius ?? 0;
  const pb = piece?.binding ?? 0;

  useEffect(() => {
    if (!visible || !size || size[0] < 2 || size[1] < 2) return;
    const raf = requestAnimationFrame(() => {
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const scale = Math.min(dpr, Math.sqrt(maxPixels / (size[0] * size[1])));
      const w = Math.max(1, Math.round(size[0] * scale));
      const h = Math.max(1, Math.round(size[1] * scale));
      const geo: LeatherGeometry = { units, cell, pattern, seed, piece: hasPiece ? { margin: pm, radius: pr, binding: pb } : null };
      const key = `${w}x${h}|${units}|${cell}|${pattern}|${seed}|${hasPiece ? `${pm},${pr},${pb}` : "-"}`;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (!shading.current || shading.current.key !== key) {
        shading.current = { ...computeShading(w, h, geo), key };
      }
      paintLeather(ctx, shading.current, leather, thread, geo);
      canvas.dataset.ready = "1";
    });
    return () => cancelAnimationFrame(raf);
  }, [visible, size, leather, thread, pattern, units, cell, seed, hasPiece, pm, pr, pb, maxPixels]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={`block ${className}`}
      style={hasPiece ? undefined : { backgroundColor: leather }}
    />
  );
}
