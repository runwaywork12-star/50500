import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Check, Download, Folder, Image as ImageIcon, Search, Trash2, Upload, X } from "lucide-react";
import { IMAGES } from "@/lib/images";
import { useSiteContent } from "@/lib/site-content";
import { downloadAsset, formatBytes, listMedia, removeMedia, saveMedia, uploadMedia, type MediaAsset } from "@/lib/media-library";
import { fa } from "@/lib/format";
import { isServerMode } from "@/lib/api";
import { Badge, Card, EmptyState, Field, Notice, PanelHeader } from "./ControlUi";

type LibraryItem = {
  key: string;
  name: string;
  dataUrl: string;
  uploaded: boolean;
  asset?: MediaAsset;
  folder: string;
  alt: string;
  size?: number;
  width?: number;
  height?: number;
  tags: string[];
};

export function MediaPanel({ onToast }: { onToast: (message: string) => void }) {
  const { content, updateHero } = useSiteContent();
  const [uploaded, setUploaded] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("همه");
  const [source, setSource] = useState("all");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [limit, setLimit] = useState(18);
  const [draft, setDraft] = useState<MediaAsset | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setUploaded(await listMedia());
    } catch (err) {
      onToast(err instanceof Error ? err.message : "خواندن کتابخانه ممکن نشد");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const items = useMemo<LibraryItem[]>(() => {
    const bundled: LibraryItem[] = Object.entries(IMAGES).map(([key, dataUrl]) => ({
      key: `bundled:${key}`,
      name: key.split("/").pop() ?? key,
      dataUrl,
      uploaded: false,
      folder: key.split("/").slice(0, -1).join("/") || "عمومی",
      alt: key.split("/").pop()?.replace(/\.[^.]+$/, "") ?? key,
      tags: ["داخل پروژه"],
    }));
    return [
      ...uploaded.map((asset) => ({
        key: asset.id,
        name: asset.name,
        dataUrl: asset.dataUrl,
        uploaded: true,
        asset,
        folder: asset.folder,
        alt: asset.alt,
        size: asset.size,
        width: asset.width,
        height: asset.height,
        tags: asset.tags,
      })),
      ...bundled,
    ];
  }, [uploaded]);

  const folders = useMemo(() => ["همه", ...Array.from(new Set(items.map((item) => item.folder))).sort()], [items]);
  const filtered = items.filter((item) => {
    if (source === "uploaded" && !item.uploaded) return false;
    if (source === "bundled" && item.uploaded) return false;
    if (folder !== "همه" && item.folder !== folder) return false;
    return `${item.name} ${item.alt} ${item.folder} ${item.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  const active = items.find((item) => item.key === activeKey) ?? null;

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    let ok = 0;
    const errors: string[] = [];
    for (const file of files) {
      try {
        await uploadMedia(file, folder === "همه" ? "عمومی" : folder);
        ok++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `${file.name}: خطا`);
      }
    }
    await load();
    setBusy(false);
    if (ok) onToast(`${fa(ok)} تصویر در کتابخانه ذخیره شد`);
    if (errors.length) onToast(errors[0]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void handleFiles(Array.from(e.dataTransfer.files));
  };

  const openItem = (item: LibraryItem) => {
    setActiveKey(item.key);
    setDraft(item.asset ? { ...item.asset, tags: [...item.asset.tags] } : null);
  };

  const applyHero = (item: LibraryItem) => {
    updateHero({
      image: item.uploaded ? item.dataUrl : item.key.replace(/^bundled:/, ""),
      imageAlt: item.alt || item.name,
    });
    onToast("تصویر هیرو به‌روزرسانی شد");
    setActiveKey(null);
  };

  const saveMeta = async () => {
    if (!draft) return;
    try {
      await saveMedia({ ...draft, updatedAt: new Date().toISOString() });
      await load();
      onToast("مشخصات تصویر ذخیره شد");
      setActiveKey(null);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "ذخیره ممکن نشد");
    }
  };

  const remove = async () => {
    if (!draft) return;
    if (content.hero.image === draft.dataUrl) {
      onToast("این تصویر در هیرو استفاده می‌شود؛ اول تصویر هیرو را تغییر دهید");
      return;
    }
    if (!window.confirm(`تصویر «${draft.name}» حذف شود؟`)) return;
    await removeMedia(draft.id);
    await load();
    onToast("تصویر از کتابخانه حذف شد");
    setActiveKey(null);
  };

  return (
    <div className="grid gap-5">
      <PanelHeader
        title="کتابخانه تصاویر و رسانه"
        description="آپلود واقعی فایل، مدیریت مشخصات و استفاده در محتوای سایت. فایل‌های آپلودی در IndexedDB همین مرورگر باقی می‌مانند."
        actions={
          <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn btn-primary px-4 py-2.5 text-xs disabled:opacity-60">
            <Upload className="size-4" /> {busy ? "در حال آپلود…" : "آپلود تصویر"}
          </button>
        }
      />

      {isServerMode() ? (
        <Notice>تصاویر روی سرور ذخیره می‌شوند: محتوای واقعی فایل بررسی، اطلاعات EXIF/GPS حذف و تصویر به WebP بهینه تبدیل می‌شود. فایل SVG به دلیل خطر اجرای اسکریپت پذیرفته نمی‌شود.</Notice>
      ) : (
        <Notice>نسخه نمایشی: آپلود واقعی انجام می‌شود اما فقط در همین مرورگر (IndexedDB) ذخیره می‌شود.</Notice>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`grid cursor-pointer place-items-center rounded-3xl border border-dashed px-5 py-8 text-center transition ${
          dragging ? "border-brand-400 bg-brand-500/15" : "bd soft-h"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={isServerMode() ? "image/jpeg,image/png,image/webp,image/gif,image/avif" : "image/jpeg,image/png,image/webp,image/gif,image/svg+xml"}
          multiple
          hidden
          onChange={(e) => void handleFiles(Array.from(e.target.files ?? []))}
        />
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-400">
          <Upload className="size-6" />
        </span>
        <p className="mt-3 text-sm font-black">فایل‌ها را اینجا رها کنید یا انتخاب کنید</p>
        <p className="mt-1.5 text-[11px] tdim">JPG، PNG، WebP، GIF و SVG · حداکثر ۸ مگابایت برای هر فایل</p>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
            <input
              className="input pe-10"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(18); }}
              placeholder="جستجوی نام، alt یا برچسب…"
            />
          </div>
          <select className="input" value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="پوشه">
            {folders.map((f) => <option key={f}>{f}</option>)}
          </select>
          <select className="input" value={source} onChange={(e) => setSource(e.target.value)} aria-label="منبع تصویر">
            <option value="all">همه منابع</option>
            <option value="uploaded">آپلودهای من</option>
            <option value="bundled">تصاویر داخل پروژه</option>
          </select>
          <div className="flex items-center justify-end text-xs tdim">{fa(filtered.length)} تصویر</div>
        </div>
      </Card>

      {loading ? (
        <div className="grid h-40 place-items-center text-sm tdim">در حال خواندن کتابخانه…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ImageIcon className="size-7" />} title="تصویری پیدا نشد" description="فیلترها را تغییر دهید یا اولین تصویر خود را آپلود کنید." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
            {filtered.slice(0, limit).map((item) => (
              <button
                key={item.key}
                onClick={() => openItem(item)}
                className="group overflow-hidden rounded-2xl border bd text-start transition hover:-translate-y-0.5 hover:border-brand-500/40"
                style={{ background: "var(--surface-1)" }}
              >
                <span className="relative block aspect-square overflow-hidden" style={{ background: "var(--muted-surface)" }}>
                  <img src={item.dataUrl} alt={item.alt} loading="lazy" className="size-full object-contain p-2 transition duration-300 group-hover:scale-105" />
                  <span className="absolute end-2 top-2">
                    <Badge tone={item.uploaded ? "brand" : "neutral"}>{item.uploaded ? "آپلود" : "پروژه"}</Badge>
                  </span>
                </span>
                <span className="block p-3">
                  <span className="block truncate text-xs font-bold" title={item.name}>{item.name}</span>
                  <span className="mt-1 block truncate text-[10px] tdim">
                    {item.folder}{item.size ? ` · ${formatBytes(item.size)}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {filtered.length > limit && (
            <button onClick={() => setLimit((l) => l + 18)} className="btn btn-ghost mx-auto px-5 py-2.5 text-xs">
              نمایش تصاویر بیشتر
            </button>
          )}
        </>
      )}

      {active && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveKey(null); }}
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border bd bg-ink-900 p-5 shadow-2xl animate-fade-up">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black">{active.name}</h2>
                <p className="mt-1 text-[11px] tdim">{active.folder}</p>
              </div>
              <button onClick={() => setActiveKey(null)} className="grid size-10 place-items-center rounded-xl soft" aria-label="بستن">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
              <div className="grid min-h-72 place-items-center overflow-hidden rounded-2xl" style={{ background: "var(--muted-surface)" }}>
                <img src={active.dataUrl} alt={active.alt} className="max-h-[55vh] max-w-full object-contain" />
              </div>
              <div className="grid content-start gap-3">
                {draft ? (
                  <>
                    <Field label="نام فایل">
                      <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    </Field>
                    <Field label="متن جایگزین (Alt)">
                      <textarea className="input min-h-20" value={draft.alt} onChange={(e) => setDraft({ ...draft, alt: e.target.value })} />
                    </Field>
                    <Field label="پوشه">
                      <input className="input" value={draft.folder} onChange={(e) => setDraft({ ...draft, folder: e.target.value })} />
                    </Field>
                    <Field label="برچسب‌ها" hint="با ویرگول جدا کنید">
                      <input
                        className="input"
                        value={draft.tags.join("، ")}
                        onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean) })}
                      />
                    </Field>
                    <div className="rounded-xl soft p-3 text-[10px] leading-5 tdim">
                      {formatBytes(draft.size)}
                      {draft.width > 0 && ` · ${fa(draft.width)}×${fa(draft.height)} پیکسل`}
                    </div>
                    <button onClick={() => void saveMeta()} className="btn btn-ghost py-2.5 text-xs">
                      <Check className="size-4" /> ذخیره مشخصات
                    </button>
                  </>
                ) : (
                  <p className="rounded-2xl soft p-3 text-[11px] leading-6 tdim">
                    این تصویر داخل پروژه است. برای ویرایش مشخصات، یک نسخه از آن را آپلود کنید.
                  </p>
                )}
                <button onClick={() => applyHero(active)} className="btn btn-primary py-2.5 text-xs">
                  <ImageIcon className="size-4" /> استفاده در هیرو
                </button>
                <button
                  onClick={() => downloadAsset({ ...(draft ?? ({} as MediaAsset)), dataUrl: active.dataUrl, name: active.name })}
                  className="btn btn-ghost py-2.5 text-xs"
                >
                  <Download className="size-4" /> دانلود فایل
                </button>
                {draft && (
                  <button onClick={() => void remove()} className="btn btn-ghost py-2.5 text-xs !text-rose-400">
                    <Trash2 className="size-4" /> حذف از کتابخانه
                  </button>
                )}
                {active.uploaded && (
                  <p className="flex items-center gap-1.5 text-[10px] tdim">
                    <Folder className="size-3.5" /> ذخیره در IndexedDB مرورگر
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
