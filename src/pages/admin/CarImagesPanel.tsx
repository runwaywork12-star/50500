import { useMemo, useRef, useState } from "react";
import { CarFront, ChevronDown, Image as ImageIcon, RotateCcw, Search, Upload } from "lucide-react";
import { BRANDS, type Brand } from "@/lib/catalog";
import { carImageSlot, defaultCarImage, type ImageSlots } from "@/lib/car-images";
import { contentMediaReference, uploadMedia } from "@/lib/media-library";
import { publishSiteContent, useSiteContent } from "@/lib/site-content";
import { fa } from "@/lib/format";
import { ManagedImage } from "@/components/ManagedImage";
import { MediaPicker, type MediaSelection } from "./MediaPicker";

type Target = { slot: string; label: string; brandSlug: string; modelSlug?: string };

/** One photo slot: preview, upload from computer, pick from library, or revert to the placeholder. */
function CarPhotoSlot({ target, slots, onToast }: { target: Target; slots: ImageSlots; onToast: (m: string) => void }) {
  const { content } = useSiteContent();
  const current = slots[target.slot];
  const previewSrc = current?.src || defaultCarImage(target.brandSlug);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  const save = async (src: string, alt: string) => {
    await publishSiteContent({ ...content, imageSlots: { ...content.imageSlots, [target.slot]: { src, alt } } });
    onToast(`تصویر «${target.label}» ذخیره شد`);
  };

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return onToast("فقط فایل تصویری مجاز است");
    setBusy(true);
    try {
      const asset = await uploadMedia(file, "خودروها");
      const reference = contentMediaReference({ src: (asset as { src?: string }).src ?? asset.dataUrl, assetId: asset.id });
      await save(reference, `${target.label}`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "آپلود تصویر ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  const onPick = ({ src, alt }: MediaSelection) => {
    setPicking(false);
    void save(src, alt || target.label);
  };

  const revert = async () => {
    const next = { ...content.imageSlots };
    delete next[target.slot];
    await publishSiteContent({ ...content, imageSlots: next });
    onToast(`تصویر «${target.label}» حذف شد؛ نمای پیش‌فرض نمایش داده می‌شود`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bd p-3" style={{ background: "var(--surface-2)" }}>
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl border bd" style={{ background: "var(--muted-surface)" }}>
        {previewSrc ? (
          <ManagedImage src={previewSrc} alt={current?.alt || target.label} className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-[10px] tfaint">بدون تصویر</span>
        )}
        {!current?.src && previewSrc && (
          <span className="absolute bottom-1 start-1 rounded bg-black/70 px-1 py-px text-[8px] font-bold text-white">پیش‌فرض</span>
        )}
      </div>
      <div className="min-w-[160px] flex-1">
        <p className="text-xs font-black">{target.label}</p>
        <p className="mt-0.5 text-[10px] tfaint">
          {current?.src ? "عکس آپلودشده شما — با بارگذاری جدید جایگزین می‌شود" : "عکس پیش‌فرض گروه — با بارگذاری، جایگزین می‌شود"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="btn btn-primary px-3 py-2 text-[11px] disabled:opacity-60">
          <Upload className="size-3.5" /> {busy ? "در حال آپلود…" : "بارگذاری عکس"}
        </button>
        <button type="button" onClick={() => setPicking(true)} className="btn btn-ghost px-3 py-2 text-[11px]">
          <ImageIcon className="size-3.5" /> از کتابخانه
        </button>
        {current?.src && (
          <button type="button" onClick={() => void revert()} className="btn btn-ghost px-3 py-2 text-[11px]">
            <RotateCcw className="size-3.5" /> حذف
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      {picking && <MediaPicker title={target.label} onClose={() => setPicking(false)} onToast={onToast} onSelect={onPick} />}
    </div>
  );
}

function BrandRow({ brand, slots, open, onToggle, onToast }: { brand: Brand; slots: ImageSlots; open: boolean; onToggle: () => void; onToast: (m: string) => void }) {
  const brandSlot = carImageSlot(brand.slug);
  const withPhoto = brand.models.filter((m) => slots[carImageSlot(brand.slug, m.slug)]?.src).length + (slots[brandSlot]?.src ? 1 : 0);
  return (
    <div className="rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-start" aria-expanded={open}>
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-500/10 text-brand-400"><CarFront className="size-4" /></span>
          <span>
            <span className="block text-sm font-black">{brand.name}</span>
            <span className="block text-[11px] tfaint">{fa(brand.models.length)} مدل · {fa(withPhoto)} عکس تنظیم‌شده</span>
          </span>
        </span>
        <ChevronDown className={`size-4 tfaint transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-3 border-t bd p-4">
          <CarPhotoSlot target={{ slot: brandSlot, label: `${brand.name} (عمومی برند)`, brandSlug: brand.slug }} slots={slots} onToast={onToast} />
          <p className="text-[11px] font-black tdim">عکس هر مدل (اختیاری؛ اگر نباشد، عکس برند نمایش داده می‌شود)</p>
          {brand.models.map((m) => (
            <CarPhotoSlot
              key={m.slug}
              target={{ slot: carImageSlot(brand.slug, m.slug), label: `${brand.name} ${m.name}`, brandSlug: brand.slug, modelSlug: m.slug }}
              slots={slots}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CarImagesPanel({ onToast }: { onToast: (m: string) => void }) {
  const { content } = useSiteContent();
  const slots = content.imageSlots;
  const [query, setQuery] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BRANDS.filter((b) => !q || b.name.toLowerCase().includes(q) || b.slug.includes(q) || b.models.some((m) => m.name.toLowerCase().includes(q)));
  }, [query]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-black">تصاویر خودرو</h1>
        <p className="mt-1 text-xs leading-6 tdim">
          برای هر برند و مدل یک عکس پیش‌فرض از گروه خودرو نمایش داده می‌شود. عکس دلخواه خود را بارگذاری کنید تا جایگزین شود؛ حذف تصویر دوباره به عکس پیش‌فرض برمی‌گردد. این عکس در سربرگ صفحهٔ محصولات همان خودرو دیده می‌شود.
        </p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 tfaint" />
        <input className="input ps-10" placeholder="جستجوی برند یا مدل…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="grid gap-3">
        {list.map((brand) => (
          <BrandRow
            key={brand.slug}
            brand={brand}
            slots={slots}
            open={openSlug === brand.slug || (query.trim().length > 0 && list.length <= 3)}
            onToggle={() => setOpenSlug((cur) => (cur === brand.slug ? null : brand.slug))}
            onToast={onToast}
          />
        ))}
        {list.length === 0 && <p className="rounded-2xl border border-dashed bd p-6 text-center text-xs tfaint">برندی پیدا نشد.</p>}
      </div>
    </div>
  );
}
