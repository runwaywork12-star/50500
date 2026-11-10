import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ExternalLink, Eye, FileText, ImagePlus, RotateCcw, Save, Search } from "lucide-react";
import { DEFAULT_CONTROL_STATE, downloadJSON, publishControlState, useControlState, type PageControl } from "@/lib/control-center";
import { contentMediaReference } from "@/lib/media-library";
import { ManagedImage } from "@/components/ManagedImage";
import { fa } from "@/lib/format";
import { Badge, Card, EmptyState, Field, Notice, PanelHeader, Toggle } from "./ControlUi";
import { MediaPicker } from "./MediaPicker";
import { ArticlesEditor, ImageSlotsEditor, PageCopyEditor, PageEditorHelp } from "./ContentSections";

export function PagesPanel({ onToast, onOpenContent, onOpenMedia, onOpenProducts }: { onToast: (message: string) => void; onOpenContent: () => void; onOpenMedia: () => void; onOpenProducts: () => void }) {
  const state = useControlState();
  const [selectedId, setSelectedId] = useState("home");
  const [draft, setDraft] = useState<PageControl | null>(null);
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = state.pages.find((page) => page.id === selectedId) ?? state.pages[0];
  useEffect(() => { setDraft(selected ? { ...selected } : null); }, [selectedId, selected?.updatedAt]);

  const filtered = useMemo(() => state.pages.filter((page) => `${page.title} ${page.route} ${page.seoTitle}`.toLowerCase().includes(query.trim().toLowerCase())), [state.pages, query]);
  const dirty = Boolean(draft && selected && JSON.stringify(draft) !== JSON.stringify(selected));

  const save = async () => {
    if (!draft) return;
    if (!draft.seoTitle.trim()) { onToast("عنوان SEO نمی‌تواند خالی باشد"); return; }
    const next = { ...draft, seoTitle: draft.seoTitle.trim(), seoDescription: draft.seoDescription.trim(), updatedAt: new Date().toISOString() };
    const updated = { ...state, pages: state.pages.map((page) => page.id === next.id ? next : page) };
    setSaving(true);
    setError("");
    try {
      await publishControlState(updated);
      onToast(`تنظیمات «${next.title}» ذخیره شد`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره تنظیمات ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!draft) return;
    const original = DEFAULT_CONTROL_STATE.pages.find((page) => page.id === draft.id);
    if (original) { setDraft({ ...original }); onToast("نسخه پیش‌فرض برای ویرایش بارگذاری شد؛ برای اعمال، انتشار را بزنید"); }
  };

  const previewPath = (route: string) => route === "/" ? "/" : route.replace(/\/?\*.*$/, "") || "/";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <PanelHeader
        title="مدیریت صفحات و محتوا"
        description="صفحه را انتخاب کنید؛ متن، تصویر، وضعیت نمایش و تنظیمات سئوی آن را از همین‌جا ویرایش کنید."
        actions={<>
          <button onClick={onOpenContent} className="btn btn-ghost px-4 py-2.5 text-xs"><FileText className="size-4" /> ویرایش متن‌های سایت</button>
          <button onClick={onOpenMedia} className="btn btn-ghost px-4 py-2.5 text-xs"><ImagePlus className="size-4" /> آپلود و کتابخانه تصاویر</button>
          <button onClick={() => downloadJSON("50500-pages-seo.json", state.pages)} className="btn btn-ghost px-4 py-2.5 text-xs"><Download className="size-4" /> خروجی SEO</button>
        </>}
      />
      <Notice>صفحه اصلی، عنوان و متن صفحات، مقاله‌ها و تصاویر از این بخش در دسترس‌اند. غیرفعال‌کردن صفحه، نمایش همان مسیر را در فروشگاه متوقف می‌کند.</Notice>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="self-start">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
            <input className="input pe-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی صفحه…" />
          </div>
          <div className="grid max-h-[65vh] gap-1 overflow-y-auto pe-1">
            {filtered.map((page) => (
              <button key={page.id} onClick={() => setSelectedId(page.id)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-start text-xs transition ${selectedId === page.id ? "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/25" : "soft-h tdim"}`}>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">{page.title}</span><span dir="ltr" className="mt-0.5 block truncate text-[10px] opacity-70">{page.route}</span></span>
                <span className={`size-2 shrink-0 rounded-full ${page.enabled ? "bg-emerald-400" : "bg-rose-400"}`} title={page.enabled ? "فعال" : "غیرفعال"} />
              </button>
            ))}
            {!filtered.length && <p className="p-4 text-center text-xs tdim">صفحه‌ای پیدا نشد.</p>}
          </div>
        </Card>

        {draft ? (
          <div className="grid min-w-0 grid-cols-1 content-start gap-5">
            <PageEditorHelp pageId={selectedId} onOpenContent={onOpenContent} onOpenProducts={onOpenProducts} />
            <PageCopyEditor pageId={selectedId} onToast={onToast} />
            <ImageSlotsEditor pageId={selectedId} onToast={onToast} />
            {(selectedId === "blog" || selectedId === "article") && <ArticlesEditor onToast={onToast} />}
            <Card
              title={`نمایش و سئو: ${draft.title}`}
              description={`مسیر: ${draft.route} · آخرین انتشار: ${new Date(draft.updatedAt).toLocaleString("fa-IR")}`}
              action={<div className="flex items-center gap-2">{dirty && <Badge tone="amber">ذخیره‌نشده</Badge>}<Badge tone={draft.enabled ? "green" : "rose"}>{draft.enabled ? "فعال" : "غیرفعال"}</Badge></div>}
            >
              <div className="grid gap-4">
                <Toggle checked={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} label="دسترسی به صفحه در فروشگاه" description="بعد از انتشار، مسیر برای بازدیدکنندگان فعال یا غیرفعال می‌شود" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="عنوان صفحه در پنل"><input className="input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field>
                  <Field label="نمایش در موتورهای جستجو">
                    <select className="input" value={draft.robots} onChange={(event) => setDraft({ ...draft, robots: event.target.value as PageControl["robots"] })}>
                      <option value="index,follow">index, follow</option>
                      <option value="noindex,nofollow">noindex, nofollow</option>
                    </select>
                  </Field>
                </div>
                <Field label="عنوان SEO" hint={`${fa(draft.seoTitle.length)} کاراکتر · پیشنهاد: حداکثر ۶۰ کاراکتر`}>
                  <input className="input" value={draft.seoTitle} maxLength={120} onChange={(event) => setDraft({ ...draft, seoTitle: event.target.value })} />
                </Field>
                <Field label="توضیحات متا" hint={`${fa(draft.seoDescription.length)} کاراکتر · پیشنهاد: ۷۰ تا ۱۵۵ کاراکتر`}>
                  <textarea className="input min-h-24" value={draft.seoDescription} maxLength={320} onChange={(event) => setDraft({ ...draft, seoDescription: event.target.value })} />
                </Field>
                <Field label="کلمات کلیدی" hint="با ویرگول انگلیسی جدا کنید"><input className="input" value={draft.keywords} onChange={(event) => setDraft({ ...draft, keywords: event.target.value })} /></Field>
                <div className="grid gap-2"><span className="text-xs font-bold tdim">تصویر اشتراک‌گذاری (Open Graph)</span><div className="flex gap-2"><button type="button" onClick={() => setPicking(true)} className="btn btn-ghost px-4 py-2.5 text-xs"><ImagePlus className="size-4" /> انتخاب یا آپلود تصویر</button>{draft.ogImage && <button type="button" onClick={() => setDraft({ ...draft, ogImage: "" })} className="text-xs tdim underline">حذف تصویر</button>}</div></div>
                {draft.ogImage && <div className="h-36 overflow-hidden rounded-2xl" style={{ background: "var(--muted-surface)" }}><ManagedImage src={draft.ogImage} alt="پیش‌نمایش تصویر اشتراک‌گذاری" className="size-full object-contain p-2" /></div>}
              </div>
            </Card>

            <Card title="پیش‌نمایش نتیجه در گوگل" description="این پیش‌نمایش بر اساس همین عنوان و توضیح ساخته می‌شود">
              <div className="rounded-2xl bg-white p-4 text-left" dir="ltr">
                <p className="text-xs text-emerald-800">50500.shop{previewPath(draft.route)}</p>
                <p className="mt-1 truncate text-lg text-blue-700">{draft.seoTitle}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">{draft.seoDescription}</p>
              </div>
            </Card>
            <p className="text-[11px] leading-6 tdim">این سایت فعلاً صفحه‌های React و آدرس‌های دارای # دارد؛ تگ‌ها در مرورگر تنظیم می‌شوند و نمایش یکسان برای همه موتورهای جستجو یا شبکه‌های اجتماعی تضمین نمی‌شود.</p>
            {error && <p role="alert" className="text-xs font-bold text-rose-400">{error}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => void save()} disabled={saving} className="btn btn-primary px-5 py-3 text-xs disabled:opacity-60"><Save className="size-4" /> {saving ? "در حال ذخیره…" : "ذخیره تنظیمات سئو و نمایش"}</button>
              <Link to={previewPath(draft.route)} target="_blank" className="btn btn-ghost px-4 py-3 text-xs"><Eye className="size-4" /> پیش‌نمایش صفحه <ExternalLink className="size-3.5" /></Link>
              <button onClick={reset} className="btn btn-ghost px-4 py-3 text-xs"><RotateCcw className="size-4" /> بازگشت به پیش‌فرض</button>
            </div>
          </div>
        ) : <EmptyState icon={<FileText className="size-7" />} title="یک صفحه انتخاب کنید" description="از فهرست سمت راست، صفحه موردنظر را انتخاب کنید." />}
      </div>
      {picking && draft && <MediaPicker title="تصویر اشتراک‌گذاری" onClose={() => setPicking(false)} onToast={onToast} onSelect={(selection) => setDraft({ ...draft, ogImage: contentMediaReference(selection) })} />}
    </div>
  );
}
