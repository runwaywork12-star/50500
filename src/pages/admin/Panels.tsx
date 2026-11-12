import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  BadgePercent,
  Banknote,
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Handshake,
  Image as ImageIcon,
  Inbox,
  Link2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UserCog,
  UserPlus,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { HERO_LINK_OPTIONS, MEDIA_LIBRARY, useSiteContent } from "@/lib/site-content";
import { downloadJSON, getControlState, saveControlState, type ControlState } from "@/lib/control-center";
import { listMedia, saveMedia, type MediaAsset } from "@/lib/media-library";
import { clearProductOverrides, getProductOverrides, setProductOverride, type ProductOverride } from "@/lib/product-overrides";
import { ArticlesCmsEditor, PagesCmsEditor } from "./CmsPages";
import { LEATHER_COLORS, THREAD_COLORS } from "@/lib/options";
import {
  STAFF_MODULES,
  dateFa,
  financeTotals,
  money,
  type AdminState,
  type StaffMember,
} from "@/lib/admin";
import { cn, fa } from "@/lib/format";
import { img } from "@/lib/images";

/* ------------------------------------------------------------------ *
 * Professional admin modules:
 *  1. ContentEditor — live editing of the whole storefront
 *  2. Affiliates    — partner links, commission, settlement
 *  3. Finance       — P&L totals + income/expense journal
 *  4. AuditLog      — who changed what, when
 *  5. Staff         — members, roles and per-module permissions
 *  6. SystemPanel   — default theme, maintenance, backup/restore
 * ------------------------------------------------------------------ */

export type PanelBase = {
  state: AdminState;
  patch: <K extends keyof AdminState>(key: K, value: AdminState[K]) => void;
  onToast: (message: string) => void;
  onLog: (action: string, module: string) => void;
};


/* ----------------------- گزینه‌های چرم و نخ گلدوزی ----------------------- */

function MatOptionsManager({ onToast }: { onToast: (m: string) => void }) {
  const { content, update } = useSiteContent();
  const opts = content.matOptions;

  const activeLeathers = LEATHER_COLORS.filter((c) => !opts.disabledLeather.includes(c.id)).length;
  const activeThreads = THREAD_COLORS.filter((c) => !opts.disabledThread.includes(c.id)).length;

  const toggle = (kind: "disabledLeather" | "disabledThread", id: string, name: string, disable: boolean) => {
    const current = opts[kind];
    const activeCount =
      kind === "disabledLeather"
        ? LEATHER_COLORS.filter((c) => !current.includes(c.id)).length
        : THREAD_COLORS.filter((c) => !current.includes(c.id)).length;
    if (disable && activeCount <= 1) {
      onToast("حداقل یک رنگ باید فعال بماند");
      return;
    }
    const next = disable ? [...current, id] : current.filter((x) => x !== id);
    update({ matOptions: { ...opts, [kind]: next } });
    onToast(`رنگ «${name}» ${disable ? "در فروشگاه مخفی شد" : "در فروشگاه فعال شد"}`);
  };

  const ColorRow = ({ c, kind }: { c: { id: string; name: string; hex: string }; kind: "disabledLeather" | "disabledThread" }) => {
    const off = opts[kind].includes(c.id);
    return (
      <div className="flex items-center gap-3 rounded-xl border bd px-3 py-2" style={{ background: "var(--field)", opacity: off ? 0.55 : 1 }}>
        <span
          className="size-7 shrink-0 rounded-full shadow-inner"
          style={{ background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,.5), rgba(255,255,255,0) 45%), ${c.hex}`, outline: "1px solid var(--line)" }}
        />
        <span className="min-w-0 flex-1 truncate text-xs font-bold">{c.name}</span>
        <Switch checked={!off} onChange={(on) => toggle(kind, c.id, c.name, !on)} label={off ? "مخفی" : "فعال"} />
      </div>
    );
  };

  return (
    <Card
      title="رنگ چرم و نخ گلدوزی موجود"
      desc="رنگ‌هایی را که فعلاً نمی‌توانید تولید کنید مخفی کنید؛ بلافاصله از صفحه محصول حذف می‌شوند"
      icon={<Wrench className="size-4.5" />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-brand-300">{activeLeathers} رنگ چرم فعال</span>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300">{activeThreads} رنگ نخ فعال</span>
        <span className="ms-auto tfaint">تغییر بلافاصله لایو می‌شود</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-black tfaint">رنگ‌های چرم ({LEATHER_COLORS.length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            {LEATHER_COLORS.map((c) => <ColorRow key={c.id} c={c} kind="disabledLeather" />)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-black tfaint">رنگ‌های نخ گلدوزی ({THREAD_COLORS.length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {THREAD_COLORS.map((c) => <ColorRow key={c.id} c={c} kind="disabledThread" />)}
          </div>
        </div>
      </div>
      {((activeLeathers <= 1) || (activeThreads <= 1)) && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-400/10 px-3 py-2 text-[10px] leading-5 text-amber-300">
          هشدار: انتخاب صفحه محصول محدود شده است؛ حداقل یک رنگ از هر نوع حتماً باید فعال بماند.
        </p>
      )}
    </Card>
  );
}

/* ------------------------------ shared atoms ------------------------------ */


function ModuleHeading({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-1 max-w-2xl text-xs leading-6 tdim">{desc}</p>
      </div>
      {action}
    </div>
  );
}

export function Card({ title, desc, children, className = "", icon }: { title: string; desc?: string; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <section className={cn("rounded-3xl border bd p-5", className)} style={{ background: "var(--surface-1)" }}>
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

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-bold tdim">{label}</span>
      {children}
      {hint && <span className="text-[10px] leading-4 tfaint">{hint}</span>}
    </label>
  );
}

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border bd p-3 sm:p-4" style={{ background: "var(--surface-1)" }}>
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-bold leading-4 tfaint sm:text-[11px]">{label}</span>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-400 sm:size-8">{icon}</span>
      </div>
      <p className="mt-1.5 text-sm font-black leading-5 sm:mt-2 sm:text-lg">{value}</p>
      {sub && <p className="mt-0.5 text-[9px] leading-4 tfaint sm:text-[10px]">{sub}</p>}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border bd px-3.5 py-3 text-sm font-bold transition hover:border-brand-500/40"
    >
      <span>{label}</span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-500" : "soft")}>
        <span className={cn("absolute top-1 size-4 rounded-full bg-white transition-all", checked ? "start-6" : "start-1")} />
      </span>
    </button>
  );
}

function statusTone(status: string) {
  return status === "active"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : status === "pending"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
      : "border-rose-400/30 bg-rose-400/10 text-rose-300";
}

const STATUS_LABEL: Record<string, string> = { active: "فعال", pending: "در انتظار تأیید", suspended: "متوقف" };

/* --------------------------- 1. live site content -------------------------- */

export function ContentPanel({ onToast, onLog }: Pick<PanelBase, "onToast" | "onLog">) {
  const site = useSiteContent();
  const { content, update, updateHero, updatePromo, updateContact, updateFooter, updateHeading, updateTrust } = site;

  const save = () => {
    onToast("تغییرات محتوا ذخیره و روی سایت اعمال شد");
    onLog("انتشار تغییرات محتوای صفحه‌ها", "محتوای سایت");
  };

  const setPhone = (value: string) => {
    const digits = value.replace(/[^\d۰-۹()+\- ]/g, "");
    const tel = digits.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "");
    const href = tel ? `tel:+98${tel.replace(/^0/, "")}` : content.contact.phoneHref;
    updateContact({ phone: digits, phoneHref: href });
  };

  const headingKeys: { key: "tabs" | "groups" | "testimonials" | "blog"; label: string }[] = [
    { key: "tabs", label: "بخش محصولات پیشنهادی" },
    { key: "groups", label: "بخش خودروی شما کدام است؟" },
    { key: "testimonials", label: "بخش نظرات مشتریان" },
    { key: "blog", label: "بخش مجله" },
  ];

  return (
    <div className="grid gap-5">
      <ModuleHeading
        title="محتوای سایت"
        desc="همه متون، تصاویر و سربرگ‌های فروشگاه را همین‌جا ویرایش کنید؛ تغییرات بلافاصله روی سایت بازتاب می‌یابد."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/" className="btn btn-ghost px-4 py-2.5 text-xs">
              <Eye className="size-4" /> مشاهده زنده سایت
            </Link>
            <button onClick={save} className="btn btn-primary px-4 py-2.5 text-xs">
              <Save className="size-4" /> ذخیره و انتشار
            </button>
          </div>
        }
      />

      <div className="flex items-start gap-2 rounded-2xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-[11px] leading-6 text-brand-300">
        <Activity className="mt-0.5 size-4 shrink-0" />
        <span>
          هر فیلد ذخیره‌ی خودکار دارد و بلافاصله در صفحه اصلی، هدر و فوتر اعمال می‌شود. با «ذخیره و انتشار»، رویداد آن در لاگ فعالیت ثبت می‌شود.
        </span>
      </div>

      {/* ===== کنترل متن و تصویر کامل همه صفحات ===== */}
      <PagesCmsEditor onToast={onToast} onLog={onLog} />
      <MatOptionsManager onToast={onToast} />
      <ArticlesCmsEditor onToast={onToast} />

      {/* announcement + promo bar */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="نوار سربرگ" desc="پیام بالای سایت: ارسال، کد تخفیف و شماره تماس" icon={<Inbox className="size-4.5" />}>
          <div className="grid gap-3">
            <Field label="متن اعلان (سمت وسط، فقط دسکتاپ)">
              <input className="input" value={content.announcement} onChange={(e) => update({ announcement: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="متن ارسال (راست)">
                <input className="input" value={content.promoBar.shipping} onChange={(e) => update({ promoBar: { ...content.promoBar, shipping: e.target.value } })} />
              </Field>
              <Field label="کد تخفیف">
                <input className="input" dir="ltr" value={content.promoBar.code} onChange={(e) => update({ promoBar: { ...content.promoBar, code: e.target.value } })} />
              </Field>
              <Field label="درصد نمایشی">
                <input className="input" value={content.promoBar.percent} onChange={(e) => update({ promoBar: { ...content.promoBar, percent: e.target.value } })} />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="اطلاعات تماس" desc="در فوتر، صفحه تماس و صفحه سفارش نمایش داده می‌شود" icon={<PhoneIcon />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="تلفن" hint={content.contact.phoneHref}>
              <input className="input" dir="ltr" value={content.contact.phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="ایمیل">
              <input className="input" dir="ltr" value={content.contact.email} onChange={(e) => updateContact({ email: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="نشانی">
                <input className="input" value={content.contact.address} onChange={(e) => updateContact({ address: e.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="ساعت کاری">
                <input className="input" value={content.contact.hours} onChange={(e) => updateContact({ hours: e.target.value })} />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      {/* hero */}
      <Card title="هیرو (بالای صفحه اصلی)" desc="تیتر، توضیح، دکمه‌ها، جستجوی خودرو و تصویر پس‌زمینه" icon={<ImageIcon className="size-4.5" />}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px]">
          <div className="grid gap-3">
            <Field label="برچسب بالای هیرو">
              <input className="input" value={content.hero.eyebrow} onChange={(e) => updateHero({ eyebrow: e.target.value })} />
            </Field>
            <Field label="تیتر — خط اول (قبل از رنگ نارنجی)">
              <input className="input" value={content.hero.titleLine1} onChange={(e) => updateHero({ titleLine1: e.target.value })} />
            </Field>
            <Field label="تیتر — بخش نارنجی">
              <input className="input text-brand-400" value={content.hero.titleHighlight} onChange={(e) => updateHero({ titleHighlight: e.target.value })} />
            </Field>
            <Field label="تیتر — خط دوم">
              <input className="input" value={content.hero.titleLine2} onChange={(e) => updateHero({ titleLine2: e.target.value })} />
            </Field>
          </div>

          <div className="grid gap-3">
            <Field label="توضیح کوتاه زیر تیتر">
              <textarea className="input min-h-24 resize-y leading-7" value={content.hero.description} onChange={(e) => updateHero({ description: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="دکمه اصلی">
                <input className="input" value={content.hero.primary.label} onChange={(e) => updateHero({ primary: { ...content.hero.primary, label: e.target.value } })} />
              </Field>
              <Field label="مقصد دکمه اصلی">
                <select className="input" value={content.hero.primary.href} onChange={(e) => updateHero({ primary: { ...content.hero.primary, href: e.target.value } })}>
                  {HERO_LINK_OPTIONS.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="دکمه ثانویه">
                <input className="input" value={content.hero.secondary.label} onChange={(e) => updateHero({ secondary: { ...content.hero.secondary, label: e.target.value } })} />
              </Field>
              <Field label="مقصد دکمه ثانویه">
                <select className="input" value={content.hero.secondary.href} onChange={(e) => updateHero({ secondary: { ...content.hero.secondary, href: e.target.value } })}>
                  {HERO_LINK_OPTIONS.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="عنوان جستجوی خودرو">
                <input className="input" value={content.hero.finderTitle} onChange={(e) => updateHero({ finderTitle: e.target.value })} />
              </Field>
              <Field label="توضیح جستجوی خودرو">
                <input className="input" value={content.hero.finderDesc} onChange={(e) => updateHero({ finderDesc: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border bd" style={{ background: "var(--muted-surface)" }}>
              <img src={img(content.hero.image)} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white">پیش‌نمایش هیرو</span>
            </div>
            <Field label="تصویر هیرو" hint={`${MEDIA_LIBRARY.length} تصویر در کتابخانه رسانه`}>
              <select className="input" value={content.hero.image} onChange={(e) => updateHero({ image: e.target.value })}>
                {MEDIA_LIBRARY.map((key) => <option key={key} value={key}>{key.replace("images/", "")}</option>)}
              </select>
            </Field>
            <Field label="متن جایگزین تصویر (SEO)">
              <input className="input" value={content.hero.imageAlt} onChange={(e) => updateHero({ imageAlt: e.target.value })} />
            </Field>
          </div>
        </div>
      </Card>

      {/* trust strip */}
      <Card title="نوار اعتماد (زیر هیرو)" desc="چهار باکس با آیکون — عنوان و توضیح هر کدام" icon={<BadgeCheck className="size-4.5" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          {content.trust.map((row, i) => (
            <div key={i} className="rounded-2xl border bd p-3">
              <p className="mb-2 text-[10px] font-black tfaint">بکس {fa(i + 1)}</p>
              <div className="grid gap-2">
                <input className="input !py-2 text-xs" value={row.title} onChange={(e) => updateTrust(i, { title: e.target.value })} />
                <input className="input !py-2 text-xs" value={row.desc} onChange={(e) => updateTrust(i, { desc: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* promo banner */}
      <Card title="بنر پیشنهاد ویژه (کارت نارنجی صفحه اصلی)" desc="با سوییچ می‌توانید کل بنر را مخفی کنید" icon={<BadgePercent className="size-4.5" />}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <Switch checked={content.promo.enabled} onChange={(v) => updatePromo({ enabled: v })} label={content.promo.enabled ? "بنر نمایش داده می‌شود" : "بنر مخفی است"} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="برچسب (بج بالای تیتر)">
                <input className="input" value={content.promo.label} onChange={(e) => updatePromo({ label: e.target.value })} />
              </Field>
              <Field label="کد تخفیف">
                <input className="input" dir="ltr" value={content.promo.code} onChange={(e) => updatePromo({ code: e.target.value })} />
              </Field>
            </div>
          </div>
          <div className="grid gap-3">
            <Field label="عنوان بنر">
              <input className="input" value={content.promo.title} onChange={(e) => updatePromo({ title: e.target.value })} />
            </Field>
            <Field label="بخش نارنجی عنوان">
              <input className="input text-brand-400" value={content.promo.highlight} onChange={(e) => updatePromo({ highlight: e.target.value })} />
            </Field>
            <Field label="متن بنر">
              <textarea className="input min-h-20 resize-y" value={content.promo.description} onChange={(e) => updatePromo({ description: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="متن دکمه">
                <input className="input" value={content.promo.button} onChange={(e) => updatePromo({ button: e.target.value })} />
              </Field>
              <Field label="مقصد دکمه">
                <select className="input" value={content.promo.href} onChange={(e) => updatePromo({ href: e.target.value })}>
                  {HERO_LINK_OPTIONS.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </div>
      </Card>

      {/* section headings */}
      <Card title="سربرگ بخش‌های صفحه اصلی" desc="برچسب، عنوان و توضیح هر بخش (تب‌ها، گروه خودرو، نظرات، مجله)" icon={<FileText className="size-4.5" />}>
        <div className="grid gap-4 md:grid-cols-2">
          {headingKeys.map(({ key, label }) => (
            <div key={key} className="rounded-2xl border bd p-3.5" style={{ background: "var(--field)" }}>
              <p className="mb-2.5 text-[11px] font-black">{label}</p>
              <div className="grid gap-2">
                <input className="input !py-2 text-xs" placeholder="برچسب بالای عنوان" value={content.headings[key].eyebrow} onChange={(e) => updateHeading(key, { eyebrow: e.target.value })} />
                <input className="input !py-2 text-sm !font-black" placeholder="عنوان بخش" value={content.headings[key].title} onChange={(e) => updateHeading(key, { title: e.target.value })} />
                <input className="input !py-2 text-xs" placeholder="توضیح زیر عنوان" value={content.headings[key].desc} onChange={(e) => updateHeading(key, { desc: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* footer */}
      <Card title="فوتر" desc="متن معرفی، کپی‌رایت و یادداشت پایین سایت" icon={<FileText className="size-4.5" />}>
        <div className="grid gap-3">
          <Field label="متن معرفی در ستون اول فوتر">
            <textarea className="input min-h-20 resize-y" value={content.footer.about} onChange={(e) => updateFooter({ about: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="کپی‌رایت">
              <input className="input" value={content.footer.copyright} onChange={(e) => updateFooter({ copyright: e.target.value })} />
            </Field>
            <Field label="یادداشت پایین صفحه">
              <input className="input" value={content.footer.note} onChange={(e) => updateFooter({ note: e.target.value })} />
            </Field>
          </div>
        </div>
      </Card>


    </div>
  );
}

function PhoneIcon() {
  return <Phone />;
}

function Phone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className ?? "size-4.5"}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c1 .4 2 .6 3 .7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

/* -------------------------------- 2. affiliates ---------------------------- */

export function AffiliatesPanel({ state, patch, onToast, onLog }: PanelBase) {
  const [form, setForm] = useState({ name: "", phone: "", code: "", rate: 10 });

  const totals = useMemo(() => {
    const rows = state.affiliates;
    return {
      partners: rows.filter((r) => r.status === "active").length,
      clicks: rows.reduce((s, r) => s + r.clicks, 0),
      orders: rows.reduce((s, r) => s + r.orders, 0),
      balance: rows.reduce((s, r) => s + r.balance, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
    };
  }, [state.affiliates]);

  const conversion = totals.clicks ? (totals.orders / totals.clicks) * 100 : 0;

  const addPartner = () => {
    const code = form.code.trim().toUpperCase();
    if (form.name.trim().length < 2 || !code) return onToast("نام همکار و کد لینک را کامل کنید");
    if (state.affiliates.some((a) => a.code === code)) return onToast("این کد لینک قبلاً ثبت شده است");
    const partner = {
      id: `af_${Date.now().toString(36)}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      code,
      rate: Math.min(50, Math.max(1, form.rate)),
      clicks: 0,
      orders: 0,
      balance: 0,
      paid: 0,
      status: "pending" as const,
    };
    patch("affiliates", [partner, ...state.affiliates]);
    setForm({ name: "", phone: "", code: "", rate: 10 });
    onToast(`همکار فروش «${partner.name}» ساخته شد`);
    onLog(`ثبت همکار فروش ${partner.name} با کد ${code}`, "همکاری در فروش");
  };

  const toggleStatus = (id: string, status: "active" | "suspended") => {
    patch("affiliates", state.affiliates.map((a) => (a.id === id ? { ...a, status } : a)));
    onToast(status === "active" ? "همکار فعال شد" : "همکار متوقف شد");
    onLog(`${status === "active" ? "فعال‌سازی" : "توقف"} همکار ${state.affiliates.find((a) => a.id === id)?.name ?? ""}`, "همکاری در فروش");
  };

  const settle = (id: string) => {
    const partner = state.affiliates.find((a) => a.id === id);
    if (!partner || partner.balance <= 0) return onToast("موجودی قابل پرداختی وجود ندارد");
    patch("affiliates", state.affiliates.map((a) => (a.id === id ? { ...a, paid: a.paid + a.balance, balance: 0 } : a)));
    onToast(`تسویه ${money(partner.balance)} تومان ثبت شد`);
    onLog(`تسویه پورسانت ${partner.name} به مبلغ ${money(partner.balance)} تومان`, "همکاری در فروش");
  };

  const remove = (id: string) => {
    const partner = state.affiliates.find((a) => a.id === id);
    patch("affiliates", state.affiliates.filter((a) => a.id !== id));
    onToast("همکار فروش حذف شد");
    onLog(`حذف همکار فروش ${partner?.name ?? ""}`, "همکاری در فروش");
  };

  const copyLink = async (code: string) => {
    const link = `${window.location.origin}${window.location.pathname}#/products?ref=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      onToast("لینک همکاری کپی شد");
    } catch {
      onToast(link);
    }
  };

  return (
    <div className="grid gap-5">
      <ModuleHeading
        title="همکاری در فروش"
        desc="لینک اختصاصی، کلیک و سفارش‌های هر همکار را کنترل کنید و پورسانت را تسویه کنید."
        action={
          <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3.5 py-1.5 text-[11px] font-bold text-brand-300">
            نرخ پایه پورسانت: {fa(10)}٪
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="همکاران فعال" value={fa(totals.partners)} sub={`${fa(state.affiliates.length)} همکار کل`} icon={<Handshake className="size-4" />} />
        <Kpi label="کلیک‌های لینک" value={fa(totals.clicks)} sub={`${fa(Math.round(conversion * 10) / 10)}٪ نرخ تبدیل`} icon={<Link2 className="size-4" />} />
        <Kpi label="سفارش‌های منسوب" value={fa(totals.orders)} sub="از طریق لینک همکاران" icon={<Wallet className="size-4" />} />
        <Kpi label="پورسانت قابل پرداخت" value={money(totals.balance)} sub={`تسویه‌شده: ${money(totals.paid)}`} icon={<Banknote className="size-4" />} />
      </div>

      <Card title="افزودن همکار فروش" desc="لینک اختصاصی با کد دلخواه ساخته می‌شود" icon={<UserPlus className="size-4.5" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="نام / برند همکار"><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً: کانال خودرویار" /></Field>
          <Field label="موبایل"><input className="input" dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0912..." /></Field>
          <Field label="کد لینک (انگلیسی)"><input className="input" dir="ltr" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} placeholder="PARTNER10" /></Field>
          <Field label="نرخ پورسانت (٪)"><input className="input" dir="ltr" inputMode="numeric" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) || 0 }))} /></Field>
          <button onClick={addPartner} className="btn btn-primary self-end px-4 py-2.5 text-xs">
            <Plus className="size-4" /> ثبت همکار
          </button>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <table className="w-full min-w-[880px] text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              {["همکار", "کد لینک", "نرخ", "کلیک", "سفارش", "موجودی پورسانت", "تسویه‌شده", "وضعیت", "عملیات"].map((h) => (
                <th key={h} className="px-3 py-3 text-start font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {state.affiliates.map((a) => (
              <tr key={a.id} className="transition hover:bg-white/[0.03]">
                <td className="px-3 py-3">
                  <b className="block text-xs">{a.name}</b>
                  <span className="font-mono text-[10px] tfaint" dir="ltr">{a.phone || "—"}</span>
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => copyLink(a.code)} className="inline-flex items-center gap-1.5 rounded-lg border bd px-2 py-1 font-mono text-[10px] font-bold transition hover:border-brand-500/50" title="کپی لینک">
                    {a.code} <Copy className="size-3" />
                  </button>
                </td>
                <td className="px-3 py-3 font-bold">{fa(a.rate)}٪</td>
                <td className="px-3 py-3">{fa(a.clicks)}</td>
                <td className="px-3 py-3 font-bold">{fa(a.orders)}</td>
                <td className={cn("px-3 py-3 font-black", a.balance > 0 ? "text-brand-300" : "tfaint")}>{money(a.balance)}</td>
                <td className="px-3 py-3 text-emerald-300/90">{money(a.paid)}</td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", statusTone(a.status))}>{STATUS_LABEL[a.status]}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    {a.status === "active" ? (
                      <button onClick={() => toggleStatus(a.id, "suspended")} className="rounded-lg border bd px-2 py-1.5 text-[10px] transition hover:border-rose-400/50 hover:text-rose-300">توقف</button>
                    ) : (
                      <button onClick={() => toggleStatus(a.id, "active")} className="rounded-lg border bd px-2 py-1.5 text-[10px] transition hover:border-emerald-400/50 hover:text-emerald-300">فعال‌سازی</button>
                    )}
                    <button onClick={() => settle(a.id)} disabled={a.balance <= 0} className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-2 py-1.5 text-[10px] font-bold text-brand-300 transition hover:bg-brand-500/20 disabled:opacity-35">
                      تسویه
                    </button>
                    <button onClick={() => remove(a.id)} className="grid size-7 place-items-center rounded-lg text-rose-400/80 transition hover:bg-rose-500/10" aria-label="حذف">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {state.affiliates.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-xs tdim">هنوز همکار فروشی ثبت نشده است.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------- 3. finance ----------------------------- */

const FINANCE_TYPE_LABEL = { income: "درآمد", expense: "هزینه", refund: "بازگشت وجه" } as const;
const FINANCE_TYPE_TONE = { income: "text-emerald-300", expense: "text-rose-300", refund: "text-amber-300" } as const;

export function FinancePanel({ state, patch, onToast, onLog }: PanelBase) {
  const totals = useMemo(() => financeTotals(state), [state]);
  const [form, setForm] = useState({ title: "", amount: "", type: "expense" as "income" | "expense" | "refund" });

  const addRecord = () => {
    const amount = Number(form.amount);
    if (form.title.trim().length < 3 || !amount || amount <= 0) return onToast("عنوان و مبلغ معتبر وارد کنید");
    const record = {
      id: `f_${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      title: form.title.trim(),
      type: form.type,
      amount,
      manual: true,
    };
    patch("finance", [record, ...state.finance]);
    setForm({ title: "", amount: "", type: "expense" });
    onToast(`سند «${record.title}» ثبت شد`);
    onLog(`ثبت سند مالی ${FINANCE_TYPE_LABEL[record.type]} به مبلغ ${money(record.amount)} تومان`, "مالی");
  };

  const removeRecord = (id: string) => {
    const record = state.finance.find((f) => f.id === id);
    patch("finance", state.finance.filter((f) => f.id !== id));
    onToast("سند حذف شد");
    onLog(`حذف سند مالی ${record?.title ?? ""}`, "مالی");
  };

  const margin = totals.revenue ? Math.round((totals.gross / totals.revenue) * 100) : 0;
  const rows = [...state.finance].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <div className="grid gap-5">
      <ModuleHeading
        title="مالی و گزارش سود"
        desc="از روی سفارش‌های پرداخت‌شده و بهای تمام‌شده محصولات محاسبه می‌شود؛ سند دستی هم می‌توانید ثبت کنید."
        action={<span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-[11px] font-bold text-emerald-300">حاشیه سود: {fa(margin)}٪</span>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="درآمد کل" value={money(totals.revenue)} sub="پرداخت‌شده + درآمد دستی" icon={<Wallet className="size-4" />} />
        <Kpi label="بهای تمام‌شده کالا" value={money(totals.costs)} sub="بر اساس قیمت خرید محصولات" icon={<Banknote className="size-4" />} />
        <Kpi label="هزینه‌های دستی" value={money(totals.expenses)} sub="تبلیغات، کارمزد و..." icon={<Activity className="size-4" />} />
        <Kpi label="بازگشت وجه" value={money(totals.refunds)} sub="سفارش‌های برگشتی" icon={<RotateCcw className="size-4" />} />
        <Kpi label="سود ناخالص" value={money(totals.gross)} sub={`تخفیف‌ها: ${money(totals.discounts)} · ارسال: ${money(totals.shipping)}`} icon={<TrendingIcon />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="دفتر رویدادهای مالی" desc="دستوری: مبلغ را وارد کنید؛ ردیف‌های سفارش‌ها خودکار ثبت شده‌اند" icon={<FileText className="size-4.5" />}>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_110px_auto]">
            <input className="input !py-2 text-xs" placeholder="عنوان سند، مثلاً: تبلیغ اینستاگرام" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input className="input !py-2 text-xs" dir="ltr" inputMode="numeric" placeholder="مبلغ (تومان)" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))} />
            <select className="input !py-2 text-xs" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "income" | "expense" | "refund" }))}>
              <option value="expense">هزینه</option>
              <option value="income">درآمد</option>
              <option value="refund">بازگشت وجه</option>
            </select>
            <button onClick={addRecord} className="btn btn-primary px-4 py-2.5 text-xs"><Plus className="size-4" /> ثبت</button>
          </div>

          <ul className="mt-4 grid gap-2">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border bd px-3.5 py-2.5" style={{ background: "var(--field)" }}>
                <span className={cn("min-w-[74px] rounded-full border border-current/20 px-2 py-0.5 text-center text-[10px] font-bold", FINANCE_TYPE_TONE[r.type])}>
                  {FINANCE_TYPE_LABEL[r.type]}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{r.title}</span>
                <span className="text-[10px] tfaint">{dateFa(r.at)}</span>
                <span className={cn("text-xs font-black", FINANCE_TYPE_TONE[r.type])}>{money(r.amount)}</span>
                {r.manual ? (
                  <button onClick={() => removeRecord(r.id)} className="grid size-7 place-items-center rounded-lg text-rose-400/80 transition hover:bg-rose-500/10" aria-label="حذف سند">
                    <Trash2 className="size-3.5" />
                  </button>
                ) : (
                  <span className="rounded-full border bd px-2 py-0.5 text-[9px] font-bold tfaint">سفارش</span>
                )}
              </li>
            ))}
            {rows.length === 0 && <li className="py-8 text-center text-xs tdim">هنوز سندی ثبت نشده است.</li>}
          </ul>
        </Card>

        <Card title="خلاصه سود و زیان" desc="محاسبه از سفارش‌های پرداخت‌شده‌ی فعلی" icon={<Wallet className="size-4.5" />}>
          <dl className="grid gap-2.5 text-xs">
            {[
              ["درآمد فروش آنلاین", money(state.orders.filter((o) => o.payment === "paid").reduce((s, o) => s + o.total, 0))],
              ["درآمد دستی", money(totals.extraIncome)],
              ["شامل مالیات/ارسال دریافتی", money(totals.shipping)],
              ["منهای بهای تمام‌شده", `−${money(totals.costs)}`],
              ["منهای هزینه‌های عملیاتی", `−${money(totals.expenses)}`],
              ["منهای بازگشت وجه", `−${money(totals.refunds)}`],
            ].map(([label, value], i) => (
              <div key={label} className={cn("flex items-center justify-between rounded-xl px-3 py-2.5", i === 5 && "border-t pt-3")} style={{ background: "var(--field)", ...(i === 5 ? { borderColor: "var(--line-strong)" } : {}) }}>
                <span className="tdim">{label}</span>
                <b>{value}</b>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between rounded-2xl border border-brand-500/35 bg-brand-500/10 px-4 py-3">
              <span className="text-xs font-black text-brand-300">سود ناخالص</span>
              <b className="text-base font-black text-brand-300">{money(totals.gross)} تومان</b>
            </div>
          </dl>
          <p className="mt-4 text-[10px] leading-5 tfaint">
            این برآورد برای تصمیم سریع است؛ برای گزارش مالی قطعی، بهای تمام‌شده و کارمزد درگاه‌ها را به‌روز نگه دارید.
          </p>
        </Card>
      </div>
    </div>
  );
}

function TrendingIcon() {
  return <TrendingUpInline />;
}

function TrendingUpInline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

/* --------------------------------- 4. audit log ---------------------------- */

export function AuditPanel({ state, patch, onToast, onLog }: PanelBase) {
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const modules = useMemo(() => [...new Set(state.audit.map((e) => e.module))], [state.audit]);
  const rows = useMemo(() => {
    const q = query.trim();
    return state.audit.filter((e) => (moduleFilter === "all" || e.module === moduleFilter) && (!q || `${e.action} ${e.actor} ${e.module}`.includes(q)));
  }, [state.audit, query, moduleFilter]);

  return (
    <div className="grid gap-5">
      <ModuleHeading
        title="لاگ فعالیت"
        desc="هر تغییر مهم پنل با کاربر و زمان ثبت می‌شود؛ برای سنجش شفافیت از این تاریخچه استفاده کنید."
        action={
          <div className="flex gap-2">
            <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3.5 py-1.5 text-[11px] font-bold text-brand-300">{fa(state.audit.length)} رویداد</span>
            <button
              onClick={() => {
                patch("audit", []);
                onToast("تاریخچه لاگ پاک شد");
              }}
              className="btn btn-ghost px-4 py-2.5 text-xs"
            >
              <Trash2 className="size-4" /> پاک‌سازی
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bd p-3" style={{ background: "var(--surface-1)" }}>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
          <input className="input pe-9 !py-2.5" placeholder="جستجو در عملیات‌ها و کاربران…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input !w-auto !py-2.5 text-xs" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="all">همه ماژول‌ها</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button
          onClick={() => {
            const entry = { id: `a_${Date.now().toString(36)}`, at: new Date().toISOString(), actor: "مدیر اصلی", module: "لاگ فعالیت", action: "ثبت رویداد دستی توسط مدیر" };
            patch("audit", [entry, ...state.audit]);
            onLog("رویداد دستی در لاگ ثبت شد", "لاگ فعالیت");
          }}
          className="btn btn-ghost px-4 py-2.5 text-xs"
        >
          <Plus className="size-4" /> ثبت رویداد دستی
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bd" style={{ background: "var(--surface-1)" }}>
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
              {["زمان", "کاربر", "ماژول", "عملیات"].map((h) => <th key={h} className="px-4 py-3 text-start font-bold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {rows.map((e) => (
              <tr key={e.id} className="transition hover:bg-white/[0.03]">
                <td className="whitespace-nowrap px-4 py-3 text-[10px] tfaint">{dateFa(e.at, true)}</td>
                <td className="px-4 py-3"><b className="text-xs">{e.actor}</b></td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-300">{e.module}</span>
                </td>
                <td className="px-4 py-3 text-[11px] tdim">{e.action}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-xs tdim">رویدادی با این فیلتر پیدا نشد.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] leading-5 tfaint">
        رویدادهای اصلی (سفارش، محصول، محتوا، مالی) خودکار ثبت می‌شوند. در نسخه متصل به دیتابیس، لاگ تغییرناپذیر و با هویت کارمند خواهد بود.
      </p>
    </div>
  );
}

/* ---------------------------------- 5. staff -------------------------------- */

const STAFF_MODULE_LABEL: Record<string, string> = {
  orders: "سفارش‌ها",
  products: "محصولات",
  customers: "مشتریان",
  coupons: "کدهای تخفیف",
  reviews: "نظرات",
  content: "محتوای سایت",
  finance: "مالی",
  affiliates: "همکاری در فروش",
};

export function StaffPanel({ state, patch, onToast, onLog }: PanelBase) {
  const [selectedId, setSelectedId] = useState(state.staff[0]?.id ?? "");
  const [form, setForm] = useState({ name: "", email: "", role: "پشتیبانی مشتریان" });
  const selected = state.staff.find((s) => s.id === selectedId) ?? state.staff[0];
  const activeCount = state.staff.filter((s) => s.active).length;

  const saveStaff = (next: StaffMember[]) => {
    patch("staff", next);
    if (selected) onLog(`ویرایش دسترسی ${selected.name}`, "کارکنان");
  };

  const togglePerm = (member: StaffMember, moduleId: string, key: "read" | "write") => {
    const current = member.perms[moduleId] ?? { read: false, write: false };
    const nextVal = !current[key];
    // write always implies read, mirroring the original panel's rule.
    const updated = { read: key === "write" && nextVal ? true : current.read, write: key === "write" ? nextVal : nextVal && current.write };
    saveStaff(state.staff.map((s) => (s.id === member.id ? { ...s, perms: { ...s.perms, [moduleId]: { read: updated.read || updated.write, write: updated.write } } } : s)));
  };

  const addMember = () => {
    const email = form.email.trim().toLowerCase();
    if (form.name.trim().length < 3 || !email.includes("@")) return onToast("نام کامل و ایمیل معتبر وارد کنید");
    if (state.staff.some((s) => s.email === email)) return onToast("این ایمیل قبلاً برای کارمند ثبت شده");
    const perms = Object.fromEntries(STAFF_MODULES.map((m) => [m, { read: m === "orders", write: false }]));
    const member: StaffMember = {
      id: `s_${Date.now().toString(36)}`,
      name: form.name.trim(),
      email,
      role: form.role,
      active: true,
      lastSeen: new Date().toISOString(),
      perms,
    };
    patch("staff", [...state.staff, member]);
    setSelectedId(member.id);
    setForm({ name: "", email: "", role: "پشتیبانی مشتریان" });
    onToast(`کارمند «${member.name}» ساخته شد`);
    onLog(`ساخت حساب کارمند ${member.name} با نقش ${member.role}`, "کارکنان");
  };

  const toggleActive = (member: StaffMember) => {
    saveStaff(state.staff.map((s) => (s.id === member.id ? { ...s, active: !s.active } : s)));
    onToast(member.active ? "حساب کارمند غیرفعال شد — همه نشست‌ها باطل می‌شوند" : "حساب کارمند فعال شد");
  };

  const removeMember = (member: StaffMember) => {
    patch("staff", state.staff.filter((s) => s.id !== member.id));
    if (selectedId === member.id) setSelectedId(state.staff.find((s) => s.id !== member.id)?.id ?? "");
    onToast("حساب کارمند حذف شد");
    onLog(`حذف حساب کارمند ${member.name}`, "کارکنان");
  };

  const resetPassword = (member: StaffMember) => {
    onToast(`لینک بازنشانی رمز برای ${member.email} ارسال شد`);
    onLog(`درخواست بازنشانی رمز کارمند ${member.name}`, "کارکنان");
  };

  return (
    <div className="grid gap-5">
      <ModuleHeading
        title="کارکنان و سطح دسترسی"
        desc="برای هر ماژول جداگانه خواندن/نوشتن تعیین کنید؛ غیرفعال‌سازی بلافاصله نشست‌های کارمند را باطل می‌کند."
        action={
          <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3.5 py-1.5 text-[11px] font-bold text-brand-300">
            {fa(activeCount)} فعال از {fa(state.staff.length)} کارمند
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        {/* member list + add */}
        <div className="grid content-start gap-4">
          <Card title="اعضای تیم" desc="برای دیدن مجوزها روی یک نام کلیک کنید" icon={<UserCog className="size-4.5" />}>
            <ul className="grid gap-2">
              {state.staff.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition",
                      selected?.id === s.id ? "border-brand-500/50 bg-brand-500/10" : "bd soft-h",
                    )}
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-black text-white", s.active ? "bg-gradient-to-br from-brand-400 to-brand-700" : "bg-zinc-600")}>
                      {s.name.trim().slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-xs">{s.name}</b>
                      <span className="block truncate text-[10px] tdim">{s.role} · {s.email}</span>
                    </span>
                    <span className={cn("size-2.5 shrink-0 rounded-full", s.active ? "bg-emerald-400" : "bg-rose-400")} title={s.active ? "فعال" : "غیرفعال"} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="افزودن کارمند" desc="دسترسی پیش‌فرض: مشاهده سفارش‌ها" icon={<UserPlus className="size-4.5" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نام و نام خانوادگی"><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً: الهام رستمی" /></Field>
              <Field label="ایمیل کاری"><input className="input" dir="ltr" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@50500.shop" /></Field>
              <Field label="نقش">
                <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  {["مدیر فروش", "کارشناس انبار", "پشتیبانی مشتریان", "کارشناس محتوا", "حسابدار"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <button onClick={addMember} className="btn btn-primary self-end px-4 py-2.5 text-xs"><UserPlus className="size-4" /> ساخت حساب</button>
            </div>
          </Card>
        </div>

        {/* permission matrix */}
        <Card
          title={selected ? `مجوزهای ${selected.name}` : "انتخاب کارمند"}
          desc={selected ? `${selected.role} · آخرین فعالیت: ${dateFa(selected.lastSeen, true)}` : "برای دیدن مجوزها، یک کارمند را انتخاب کنید"}
          icon={<UserCog className="size-4.5" />}
        >
          {selected && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", selected.active ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300")}>
                  {selected.active ? "حساب فعال" : "حساب غیرفعال"}
                </span>
                <button onClick={() => toggleActive(selected)} className={cn("rounded-lg border bd px-3 py-1.5 text-[11px] font-bold transition", selected.active ? "text-rose-400 hover:bg-rose-500/10" : "text-emerald-400 hover:bg-emerald-500/10")}>
                  {selected.active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                </button>
                <button onClick={() => resetPassword(selected)} className="rounded-lg border bd px-3 py-1.5 text-[11px] font-bold transition hover:border-brand-500/40">بازنشانی رمز</button>
                <button onClick={() => removeMember(selected)} className="grid size-8 place-items-center rounded-lg text-rose-400/80 transition hover:bg-rose-500/10" aria-label="حذف کارمند">
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border bd">
                <table className="w-full min-w-[420px] text-xs">
                  <thead>
                    <tr className="border-b bd text-[10px] tfaint" style={{ background: "var(--surface-2)" }}>
                      <th className="px-4 py-3 text-start font-bold">ماژول</th>
                      <th className="px-4 py-3 text-center font-bold">خواندن</th>
                      <th className="px-4 py-3 text-center font-bold">نوشتن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {STAFF_MODULES.map((m) => {
                      const perm = selected.perms[m] ?? { read: false, write: false };
                      return (
                        <tr key={m}>
                          <td className="px-4 py-3 text-[12px] font-bold">{STAFF_MODULE_LABEL[m]}</td>
                          {(["read", "write"] as const).map((key) => (
                            <td key={key} className="px-4 py-3 text-center">
                              <button
                                onClick={() => togglePerm(selected, m, key)}
                                disabled={key === "write" && perm.write && !perm.read}
                                className={cn("grid size-7 place-items-center rounded-lg border transition", perm[key] ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300" : "bd tfaint hover:border-brand-500/40")}
                                aria-label={`${STAFF_MODULE_LABEL[m]} — ${key}`}
                              >
                                {perm[key] ? <Check className="size-4" /> : <X className="size-3.5" />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-[11px] leading-6 text-amber-300">
                <b>قواعد مجوز:</b> «نوشتن» همیشه «خواندن» را نیز فعال می‌کند. دسترسی تغییریافته بلافاصله اعمال می‌شود و تا ثبت مجدد در دیتابیس همین‌جا معتبر است.
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------- 6. system panel --------------------------- */

export function SystemPanel({ state, patch, onToast, onLog }: PanelBase) {
  const site = useSiteContent();
  const fileRef = useRef<HTMLInputElement>(null);

  const backup = async () => {
    const media = await listMedia().catch(() => []);
    downloadJSON(`50500-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      version: 2,
      exportedAt: new Date().toISOString(),
      state,
      content: site.content,
      control: getControlState(),
      productOverrides: getProductOverrides(),
      media,
    });
    onToast("فایل پشتیبان کامل دانلود شد");
    onLog("دریافت پشتیبان کامل پنل، رسانه و محتوای سایت", "تنظیمات");
  };

  const restore = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as {
        state?: Partial<AdminState>;
        content?: Parameters<typeof site.replace>[0] & { content?: Parameters<typeof site.replace>[0] };
        control?: ControlState;
        productOverrides?: Record<string, ProductOverride>;
        media?: MediaAsset[];
      };
      if (!parsed.state && !parsed.content && !parsed.control) throw new Error("bad file");
      if (parsed.state) {
        const base = state;
        patch("orders", parsed.state.orders ?? base.orders);
        patch("products", parsed.state.products ?? base.products);
        patch("coupons", parsed.state.coupons ?? base.coupons);
        patch("reviews", parsed.state.reviews ?? base.reviews);
        patch("affiliates", parsed.state.affiliates ?? base.affiliates);
        patch("finance", parsed.state.finance ?? base.finance);
        patch("staff", parsed.state.staff ?? base.staff);
        patch("audit", parsed.state.audit ?? base.audit);
        patch("settings", { ...base.settings, ...(parsed.state.settings ?? {}) });
      }
      if (parsed.content) {
        const raw = parsed.content;
        site.replace(raw.content ?? raw);
      }
      if (parsed.control?.pages && parsed.control?.gateways && parsed.control?.providers && parsed.control?.agents) {
        saveControlState({ ...parsed.control, runs: parsed.control.runs ?? [] });
      }
      if (parsed.productOverrides) {
        clearProductOverrides();
        for (const [slug, ov] of Object.entries(parsed.productOverrides)) {
          setProductOverride(slug, ov);
        }
      }
      if (parsed.media) {
        for (const asset of parsed.media) {
          if (asset.id && asset.dataUrl) await saveMedia(asset);
        }
      }
      onToast("پشتیبان با موفقیت بازیابی شد");
      onLog("بازیابی پنل از فایل پشتیبان", "تنظیمات");
    } catch {
      onToast("فایل پشتیبان معتبر نیست یا بازیابی کامل نشد");
    }
  };

  return (
    <div className="grid gap-5">
      <Card title="ظاهر و حالت سایت" desc="تم پیش‌فرض برای بازدیدکنندگان تازه و حالت تعمیرات" icon={<Wrench className="size-4.5" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bd p-4">
            <p className="text-xs font-black">تم پیش‌فرض سایت</p>
            <p className="mt-1 text-[11px] leading-5 tfaint">تا زمانی که بازدیدکننده خودش عوض نکرده باشد.</p>
            <div className="mt-3 inline-flex gap-1 rounded-xl border bd p-1" style={{ background: "var(--field)" }}>
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { site.update({ defaultTheme: t }); onLog(`تغییر تم پیش‌فرض سایت به ${t === "dark" ? "تیره" : "روشن"}`, "تنظیمات"); }}
                  className={cn("rounded-lg px-4 py-2 text-xs font-bold transition", site.content.defaultTheme === t ? "bg-brand-500 text-white" : "tdim hover:text-[var(--txt)]")}
                >
                  {t === "dark" ? "تیره (پیش‌فرض)" : "روشن"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bd p-4">
            <p className="text-xs font-black">حالت تعمیرات سایت</p>
            <p className="mt-1 text-[11px] leading-5 tfaint">
              فروشگاه به بازدیدکنندگان پیام «در حال به‌روزرسانی» نشان می‌دهد؛ ورود مدیر و صفحات حساب باز می‌مانند.
            </p>
            <div className="mt-3">
              <Switch
                checked={site.content.maintenance}
                label={site.content.maintenance ? "تعمیرات فعال است" : "سایت برای عموم باز است"}
                onChange={(v) => { site.update({ maintenance: v }); onToast(v ? "حالت تعمیرات فعال شد" : "سایت دوباره برای عموم باز شد"); onLog(v ? "فعال‌سازی حالت تعمیرات سایت" : "غیرفعال‌سازی حالت تعمیرات سایت", "تنظیمات"); }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="پشتیبان‌گیری و بازیابی" desc="خروجی شامل همه سفارش‌ها، محصولات، محتوا و مجوزها است" icon={<Download className="size-4.5" />}>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => void backup()} className="btn btn-primary px-5 py-2.5 text-xs">
            <Download className="size-4" /> دانلود فایل پشتیبان (JSON)
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn btn-ghost px-5 py-2.5 text-xs">
            <RotateCcw className="size-4" /> بازیابی از پشتیبان
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void restore(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-3 text-[10px] leading-5 tfaint">
          قبل از هر تغییر بزرگ (مثلاً پاک‌سازی محصولات یا بازنشانی دسته‌جمعی) حتماً پشتیبان بگیرید. فایل پشتیبان شامل اطلاعات پنل و محتوای سایت است نه رمزها.
        </p>
      </Card>
    </div>
  );
}
