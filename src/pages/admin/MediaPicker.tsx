import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Search, Upload, X } from "lucide-react";
import { IMAGES } from "@/lib/images";
import { listMedia, uploadMedia, type MediaAsset } from "@/lib/media-library";
import { isServerMode } from "@/lib/api";

export type MediaSelection = { src: string; name: string; alt: string; assetId?: string };

/** Reusable picker: bundled photos + the admin's real IndexedDB uploads. */
export function MediaPicker({ title, onSelect, onClose, onToast }: { title: string; onSelect: (selection: MediaSelection) => void; onClose: () => void; onToast: (message: string) => void }) {
  const [uploads, setUploads] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = () => listMedia().then(setUploads).catch((error) => onToast(error instanceof Error ? error.message : "خواندن رسانه ممکن نشد"));
  useEffect(() => { void refresh(); }, []);

  const items = useMemo(() => [
    ...uploads.map((asset) => ({ id: asset.id, assetId: asset.id, name: asset.name, alt: asset.alt, src: asset.dataUrl })),
    ...Object.keys(IMAGES).map((key) => ({ id: key, name: key.split("/").pop() ?? key, alt: key, src: key })),
  ], [uploads]);
  const filtered = items.filter((item) => `${item.name} ${item.alt}`.toLowerCase().includes(query.toLowerCase()));

  const upload = async (files: File[]) => {
    setBusy(true);
    try {
      for (const file of files) await uploadMedia(file);
      await refresh();
      onToast("تصویر آپلود و به انتخاب‌گر اضافه شد");
    } catch (error) { onToast(error instanceof Error ? error.message : "آپلود ناموفق بود"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border bd bg-ink-900 shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between border-b bd p-4">
          <div><h2 className="text-sm font-black">{title}</h2><p className="mt-1 text-[11px] tdim">یک تصویر موجود انتخاب کنید یا فایل جدید آپلود کنید</p></div>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-xl soft" aria-label="بستن"><X className="size-5" /></button>
        </div>
        <div className="flex flex-wrap gap-2 border-b bd p-4">
          <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" /><input className="input pe-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی تصویر…" /></div>
          <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn btn-primary px-4 py-2.5 text-xs disabled:opacity-60"><Upload className="size-4" /> {busy ? "در حال آپلود…" : "آپلود"}</button>
          <input ref={inputRef} hidden type="file" multiple accept={isServerMode() ? "image/jpeg,image/png,image/webp,image/gif,image/avif" : "image/jpeg,image/png,image/webp,image/gif,image/svg+xml"} onChange={(event) => void upload(Array.from(event.target.files ?? []))} />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((item) => (
            <button key={item.id} onClick={() => { onSelect(item); onClose(); }} className="group overflow-hidden rounded-2xl border bd text-start transition hover:border-brand-500/45">
              <span className="block aspect-square" style={{ background: "var(--muted-surface)" }}><img src={IMAGES[item.src] ?? item.src} alt={item.alt} loading="lazy" className="size-full object-contain p-2 transition group-hover:scale-105" /></span>
              <span className="block truncate p-2.5 text-[11px] font-bold">{item.name}</span>
            </button>
          ))}
          {!filtered.length && <div className="col-span-full grid place-items-center gap-3 py-16 text-center text-sm tdim"><ImageIcon className="size-8" /> تصویری پیدا نشد.</div>}
        </div>
      </div>
    </div>
  );
}
