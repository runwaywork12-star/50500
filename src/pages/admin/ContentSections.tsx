import { useEffect, useState } from "react";
import { ImagePlus, LoaderCircle, RotateCcw, Save } from "lucide-react";
import { BLOG_POSTS } from "@/data/content";
import { ManagedImage } from "@/components/ManagedImage";
import { IMAGE_SLOT_DEFINITIONS, PAGE_COPY_FIELDS } from "@/lib/content-fields";
import { contentMediaReference } from "@/lib/media-library";
import { publishSiteContent, useSiteContent, type ArticleEdit, type PageCopy } from "@/lib/site-content";
import { Card, Field, Notice } from "./ControlUi";
import { MediaPicker } from "./MediaPicker";

type Toast = (message: string) => void;

export function PageCopyEditor({ pageId, onToast }: { pageId: string; onToast: Toast }) {
  const { content, replace } = useSiteContent();
  const fields = PAGE_COPY_FIELDS[pageId];
  const [draft, setDraft] = useState<PageCopy>(() => content.pageContent[pageId] ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(content.pageContent[pageId] ?? {});
    setError("");
  }, [pageId]);

  if (!fields) return null;

  const save = async () => {
    setBusy(true);
    setError("");
    const next = { ...content, pageContent: { ...content.pageContent, [pageId]: draft } };
    try {
      const published = await publishSiteContent(next);
      replace(published);
      onToast("متن این صفحه ذخیره شد");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  const labels: Record<keyof PageCopy, string> = {
    eyebrow: "برچسب بالای صفحه",
    title: "عنوان صفحه",
    description: "توضیح زیر عنوان",
    bodyTitle: "عنوان بخش اصلی",
    body: "متن بخش اصلی",
    bodySecondary: "پاراگراف دوم",
  };

  return (
    <Card title="متن‌های قابل ویرایش این صفحه" description="فیلد خالی یعنی متن اصلی سایت نمایش داده می‌شود. اطلاعات متغیر مثل شماره سفارش تغییر نمی‌کند.">
      <div className="grid gap-4">
        {(Object.keys(fields) as (keyof PageCopy)[]).map((key) => (
          <Field key={key} label={labels[key]} hint={draft[key] ? undefined : `متن فعلی پیش‌فرض: ${fields[key]}`}>
            {key === "body" || key === "bodySecondary" || key === "description" ? (
              <textarea className="input min-h-20 resize-y" value={draft[key] ?? ""} placeholder={fields[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            ) : (
              <input className="input" value={draft[key] ?? ""} placeholder={fields[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            )}
          </Field>
        ))}
        {error && <p role="alert" className="text-xs font-bold text-rose-400">{error}</p>}
        <button type="button" onClick={() => void save()} disabled={busy} className="btn btn-primary justify-self-start px-5 py-2.5 text-xs disabled:opacity-60">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} ذخیره متن صفحه
        </button>
      </div>
    </Card>
  );
}

export function ImageSlotsEditor({ pageId, onToast }: { pageId: string; onToast: Toast }) {
  const { content, replace } = useSiteContent();
  const slots = IMAGE_SLOT_DEFINITIONS[pageId] ?? [];
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!slots.length) return null;

  const saveSlot = async (id: string, src: string | null, alt: string) => {
    setBusy(true);
    setError("");
    const imageSlots = { ...content.imageSlots };
    if (src) imageSlots[id] = { src, alt };
    else delete imageSlots[id];
    const next = { ...content, imageSlots };
    try {
      const published = await publishSiteContent(next);
      replace(published);
      onToast(src ? "تصویر این بخش ذخیره شد" : "تصویر پیش‌فرض این بخش بازگردانده شد");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره تصویر ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="تصاویر این صفحه" description="هر تصویر را با فایل جدید یا عکس موجود در کتابخانه جایگزین کنید.">
      {error && <p role="alert" className="mb-3 text-xs font-bold text-rose-400">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot) => (
          <div key={slot.id} className="overflow-hidden rounded-2xl border bd">
            <div className="h-32" style={{ background: "var(--muted-surface)" }}>
              <ManagedImage slot={slot.id} src={slot.fallback} alt={slot.alt} className="size-full object-contain p-2" />
            </div>
            <div className="grid gap-2 p-3">
              <p className="text-xs font-bold">{slot.label}</p>
              <button type="button" disabled={busy} onClick={() => setPicking(slot.id)} className="btn btn-ghost w-full py-2 text-xs disabled:opacity-50"><ImagePlus className="size-4" /> انتخاب یا آپلود تصویر</button>
              {content.imageSlots[slot.id] && <button type="button" disabled={busy} onClick={() => void saveSlot(slot.id, null, slot.alt)} className="inline-flex items-center justify-center gap-1 text-[11px] tdim hover:text-brand-300"><RotateCcw className="size-3.5" /> تصویر پیش‌فرض</button>}
            </div>
          </div>
        ))}
      </div>
      {picking && <MediaPicker title={slots.find((slot) => slot.id === picking)?.label ?? "انتخاب تصویر"} onClose={() => setPicking(null)} onToast={onToast} onSelect={(selection) => void saveSlot(picking, contentMediaReference(selection), selection.alt)} />}
    </Card>
  );
}

export function ArticlesEditor({ onToast }: { onToast: Toast }) {
  const { content, replace } = useSiteContent();
  const [slug, setSlug] = useState(BLOG_POSTS[0].slug);
  const [draft, setDraft] = useState<ArticleEdit>({});
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const original = BLOG_POSTS.find((article) => article.slug === slug) ?? BLOG_POSTS[0];

  useEffect(() => {
    setDraft(content.articles[slug] ?? {});
    setError("");
  }, [slug]);

  const save = async () => {
    setBusy(true);
    setError("");
    const next = { ...content, articles: { ...content.articles, [slug]: draft } };
    try {
      const published = await publishSiteContent(next);
      replace(published);
      onToast("مقاله و تصویر آن ذخیره شد");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره مقاله ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="ویرایش مقاله‌ها" description="عنوان، چکیده، متن و تصویر هر مقاله در مجله و صفحه اصلی استفاده می‌شود.">
      <div className="grid gap-4">
        <Field label="انتخاب مقاله"><select className="input" value={slug} onChange={(event) => setSlug(event.target.value)}>{BLOG_POSTS.map((article) => <option key={article.slug} value={article.slug}>{article.title}</option>)}</select></Field>
        <Field label="عنوان مقاله"><input className="input" value={draft.title ?? original.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field>
        <Field label="چکیده"><textarea className="input min-h-20" value={draft.excerpt ?? original.excerpt} onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })} /></Field>
        <Field label="متن مقاله" hint="هر پاراگراف را در یک خط جدا بنویسید."><textarea className="input min-h-40 resize-y leading-7" value={(draft.body ?? original.body).join("\n")} onChange={(event) => setDraft({ ...draft, body: event.target.value.split("\n") })} /></Field>
        <div className="grid items-center gap-3 sm:grid-cols-[160px_1fr]">
          <div className="h-28 overflow-hidden rounded-2xl" style={{ background: "var(--muted-surface)" }}><ManagedImage src={draft.image || original.image} alt={draft.imageAlt || original.title} className="size-full object-cover" /></div>
          <div className="grid gap-2"><button type="button" onClick={() => setPicking(true)} className="btn btn-ghost justify-self-start px-4 py-2.5 text-xs"><ImagePlus className="size-4" /> انتخاب یا آپلود عکس مقاله</button><Field label="متن جایگزین تصویر"><input className="input" value={draft.imageAlt ?? ""} placeholder={original.title} onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })} /></Field></div>
        </div>
        {error && <p role="alert" className="text-xs font-bold text-rose-400">{error}</p>}
        <button type="button" onClick={() => void save()} disabled={busy} className="btn btn-primary justify-self-start px-5 py-2.5 text-xs disabled:opacity-60">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} ذخیره مقاله</button>
      </div>
      {picking && <MediaPicker title="تصویر مقاله" onClose={() => setPicking(false)} onToast={onToast} onSelect={(selection) => setDraft({ ...draft, image: contentMediaReference(selection), imageAlt: selection.alt })} />}
    </Card>
  );
}

export function PageEditorHelp({ pageId, onOpenContent, onOpenProducts }: { pageId: string; onOpenContent: () => void; onOpenProducts: () => void }) {
  if (pageId === "home") return <Notice>متن هیرو، هدر، فوتر، پرسش‌های متداول و تصویرهای صفحه اصلی در <button className="font-black underline" onClick={onOpenContent}>ویرایش محتوای سایت</button> قرار دارند.</Notice>;
  if (pageId === "product") return <Notice>برای تغییر عنوان، توضیحات و تصویر اختصاصی هر کالا به <button className="font-black underline" onClick={onOpenProducts}>مدیریت محصولات</button> بروید.</Notice>;
  if (pageId === "contact") return <Notice>تلفن، ایمیل، نشانی و ساعت کاری از بخش <button className="font-black underline" onClick={onOpenContent}>محتوای سایت و اطلاعات تماس</button> تنظیم می‌شوند.</Notice>;
  return null;
}