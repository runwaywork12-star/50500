import { useRef, useState } from "react";
import { Image as ImageIcon, RotateCcw, Trash2, Upload } from "lucide-react";
import { BLOG_POSTS } from "@/data/content";
import { img } from "@/lib/images";
import { publishSiteContent, useSiteContent } from "@/lib/site-content";
import type { ReactNode } from "react";
import { MediaPicker } from "./MediaPicker";

function CmsCard({ title, desc, icon, children }: { title: string; desc?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border bd p-5" style={{ background: "var(--surface-1)" }}>
      <div className="mb-4 flex items-start gap-3">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-400">{icon}</span>}
        <div>
          <h2 className="text-sm font-black">{title}</h2>
          {desc && <p className="mt-0.5 text-[11px] leading-5 tfaint">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function CmsField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-bold tdim">{label}</span>
      {children}
      {hint && <span className="text-[10px] leading-5 tfaint">{hint}</span>}
    </label>
  );
}

type CmsField = { key: string; label: string; textarea?: boolean };
type CmsSlot = { id: string; label: string; fallback: string };
type CmsPage = { id: string; title: string; fields: CmsField[]; slot?: CmsSlot };

export const CMS_PAGES: CmsPage[] = [
  {
    id: "products",
    title: "صفحه فروشگاه",
    fields: [
      { key: "title", label: "عنوان پیش‌فرض صفحه فروشگاه" },
      { key: "desc", label: "توضیح زیر عنوان (بدون فیلتر فعال)", textarea: true },
    ],
    slot: { id: "products.hero", label: "تصویر پس‌زمینه هدر فروشگاه", fallback: "images/showcase/card-rear-mat.jpg" },
  },
  {
    id: "about",
    title: "درباره ما",
    fields: [
      { key: "intro", label: "جمله معرفی زیر عنوان صفحه", textarea: true },
      { key: "story1", label: "پاراگراف اول «داستان ما»", textarea: true },
      { key: "story2", label: "پاراگراف دوم «داستان ما»", textarea: true },
    ],
    slot: { id: "about.cover", label: "تصویر بخش داستان ما", fallback: "images/showcase/card-front-mat.jpg" },
  },
  {
    id: "contact",
    title: "تماس با ما",
    fields: [
      { key: "title", label: "عنوان صفحه تماس" },
      { key: "desc", label: "توضیح زیر عنوان", textarea: true },
    ],
    slot: { id: "contact.cover", label: "تصویر نمای فروشگاه", fallback: "images/hero-mat.webp" },
  },
  {
    id: "blog",
    title: "مجله",
    fields: [
      { key: "title", label: "عنوان صفحه مجله" },
      { key: "desc", label: "توضیح زیر عنوان", textarea: true },
    ],
    slot: { id: "blog.cover", label: "تصویر شاخص صفحه مجله", fallback: "images/workshop/sewing-machine.jpg" },
  },
  {
    id: "track",
    title: "پیگیری سفارش",
    fields: [
      { key: "title", label: "عنوان صفحه پیگیری" },
      { key: "desc", label: "توضیح زیر عنوان" },
    ],
  },
];

function ImageSlotEditor({ slot, onToast }: { slot: CmsSlot; onToast: (m: string) => void }) {
  const { content } = useSiteContent();
  const current = content.imageSlots[slot.id];
  const fileRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast("فقط فایل تصویری مجاز است");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void publishSiteContent({
        ...content,
        imageSlots: { ...content.imageSlots, [slot.id]: { src: String(reader.result), alt: file.name.replace(/\.[^.]+$/, "") } },
      });
      onToast(`تصویر «${slot.label}» به‌روزرسانی شد`);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="rounded-2xl border bd p-4" style={{ background: "var(--surface-2)" }}>
      <p className="text-xs font-black">{slot.label}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <img
          src={current?.src ?? img(slot.fallback)}
          alt={current?.alt ?? slot.label}
          className="size-24 shrink-0 rounded-xl object-cover"
          style={{ background: "var(--muted-surface)" }}
        />
        <div className="grid min-w-[200px] flex-1 content-start gap-2">
          <input
            className="input"
            placeholder="متن جایگزین تصویر (Alt)"
            value={current?.alt ?? ""}
            onChange={(e) =>
              void publishSiteContent({ ...content, imageSlots: { ...content.imageSlots, [slot.id]: { src: current?.src ?? img(slot.fallback), alt: e.target.value } } })
            }
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileRef.current?.click()} className="btn btn-primary px-3 py-2 text-[11px]">
              <Upload className="size-3.5" /> بارگذاری تصویر
            </button>
            <button onClick={() => setPicking(true)} className="btn btn-ghost px-3 py-2 text-[11px]">
              <ImageIcon className="size-3.5" /> از کتابخانه تصاویر
            </button>
            {current && (
              <button
                onClick={() => {
                  const next = { ...content.imageSlots };
                  delete next[slot.id];
                  void publishSiteContent({ ...content, imageSlots: next });
                  onToast("تصویر پیش‌فرض بازیابی شد");
                }}
                className="text-[11px] font-bold text-rose-400 hover:underline"
              >
                <RotateCcw className="inline size-3" /> بازگشت به پیش‌فرض
              </button>
            )}
          </div>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {picking && (
        <MediaPicker
          title={slot.label}
          onClose={() => setPicking(false)}
          onToast={onToast}
          onSelect={({ src, alt }) => {
            void publishSiteContent({ ...content, imageSlots: { ...content.imageSlots, [slot.id]: { src, alt } } });
            onToast(`تصویر «${alt}» برای این صفحه انتخاب شد`);
          }}
        />
      )}
    </div>
  );
}

export function ArticlesCmsEditor({ onToast }: { onToast: (m: string) => void }) {
  const { content } = useSiteContent();
  const [slug, setSlug] = useState(BLOG_POSTS[0].slug);
  const base = BLOG_POSTS.find((p) => p.slug === slug) ?? BLOG_POSTS[0];
  const draft = {
    title: content.articles[slug]?.title ?? base.title,
    excerpt: content.articles[slug]?.excerpt ?? base.excerpt,
    body: (content.articles[slug]?.body ?? base.body).join("\n"),
  };
  const edited = Boolean(content.articles[slug]);

  const set = (patch: Partial<{ title: string; excerpt: string; body: string }>) => {
    const nextDraft = { ...draft, ...patch };
    void publishSiteContent({
      ...content,
      articles: {
        ...content.articles,
        [slug]: { title: nextDraft.title, excerpt: nextDraft.excerpt, body: nextDraft.body.split("\n").filter((l) => l.trim().length > 0) },
      },
    });
  };

  const reset = () => {
    const next = { ...content.articles };
    delete next[slug];
    void publishSiteContent({ ...content, articles: next });
    onToast("مقاله به متن پیش‌فرض بازگشت");
  };

  return (
    <CmsCard title="مقالات مجله" desc="عنوان، خلاصه و متن کامل هر مقاله را ویرایش کنید؛ بلافاصله روی سایت اعمال می‌شود" icon={<Trash2 className="size-4.5 hidden" />}>
      <div className="grid gap-3">
        <CmsField label="انتخاب مقاله">
          <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {BLOG_POSTS.map((p) => (
              <option key={p.slug} value={p.slug}>{p.title}</option>
            ))}
          </select>
        </CmsField>
        <CmsField label="عنوان مقاله">
          <input className="input" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </CmsField>
        <CmsField label="خلاصه (نمایش در کارتی مجله و صفحه اصلی)">
          <textarea className="input min-h-16 resize-y" value={draft.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
        </CmsField>
        <CmsField label="متن کامل (هر پاراگراف در یک خط)">
          <textarea className="input min-h-44 resize-y" value={draft.body} onChange={(e) => set({ body: e.target.value })} />
        </CmsField>
        {edited && (
          <button onClick={reset} className="justify-self-start text-[11px] font-bold text-rose-400 hover:underline">
            <RotateCcw className="inline size-3" /> بازگشت به متن پیش‌فرض
          </button>
        )}
      </div>
    </CmsCard>
  );
}

export function PagesCmsEditor({ onToast, onLog }: { onToast: (m: string) => void; onLog: (a: string, m: string) => void }) {
  const { content } = useSiteContent();
  const [pageId, setPageId] = useState(CMS_PAGES[0].id);
  const page = CMS_PAGES.find((p) => p.id === pageId) ?? CMS_PAGES[0];
  const pageContent = content.pageContent[page.id] ?? {};

  const setField = (key: string, value: string) => {
    void publishSiteContent({
      ...content,
      pageContent: { ...content.pageContent, [page.id]: { ...pageContent, [key]: value } },
    });
    onLog(`ویرایش متن «${page.title} / ${key}»`, "محتوای سایت");
  };

  return (
    <CmsCard title="متن و تصویر صفحات" desc="کنترل متن و تصویر همه صفحات فروشگاه" icon={<ImageIcon className="size-4.5" />}>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CMS_PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPageId(p.id)}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold transition ${
              pageId === p.id ? "border-brand-500/60 bg-brand-500/15 text-brand-300" : "bd tdim soft-h"
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {page.fields.map((f) => (
          <CmsField key={f.key} label={f.label}>
            {f.textarea ? (
              <textarea className="input min-h-20 resize-y" value={pageContent[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} />
            ) : (
              <input className="input" value={pageContent[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} />
            )}
          </CmsField>
        ))}
        {page.slot && <ImageSlotEditor slot={page.slot} onToast={onToast} />}
      </div>
    </CmsCard>
  );
}
