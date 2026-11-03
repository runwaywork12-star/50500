"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Save } from "lucide-react";

type Dict = Record<string, string>;
type Field = { key: string; label: string; hint?: string; type?: "text" | "textarea" | "select" };
type Group = { id: string; title: string; description: string; fields: Field[] };

const GROUPS: Group[] = [
  { id: "header", title: "هدر و پیام‌های بالای سایت", description: "پیام ارسال، کد تخفیف، شماره تماس و عنوان گزینه‌های منو.", fields: [
    { key: "header.shipping_enabled", label: "نمایش پیام ارسال", type: "select" },
    { key: "header.shipping_text", label: "متن ارسال" },
    { key: "header.promo_enabled", label: "نمایش پیام تخفیف", type: "select" },
    { key: "header.promo_code", label: "کد تخفیف هدر" },
    { key: "header.promo_text", label: "متن تخفیف هدر" },
    { key: "header.nav_home", label: "عنوان منوی خانه" },
    { key: "header.nav_shop", label: "عنوان منوی فروشگاه" },
    { key: "header.nav_discount", label: "عنوان منوی پیشنهاد ویژه" },
    { key: "header.nav_track", label: "عنوان منوی پیگیری سفارش" },
    { key: "header.nav_blog", label: "عنوان منوی مجله" },
    { key: "header.nav_about", label: "عنوان منوی درباره ما" },
    { key: "header.nav_contact", label: "عنوان منوی تماس با ما" },
  ]},
  { id: "home", title: "صفحه اصلی و پیشنهاد ویژه", description: "پیام‌های ویترین اصلی و باکس تبلیغاتی صفحه خانه.", fields: [
    { key: "hero.eyebrow", label: "برچسب بالای تیتر" }, { key: "hero.title_line1", label: "خط اول تیتر" },
    { key: "hero.title_highlight", label: "عبارت برجسته تیتر" }, { key: "hero.title_line2", label: "خط دوم تیتر" },
    { key: "hero.description", label: "توضیحات هیرو", type: "textarea" }, { key: "hero.primary_label", label: "متن دکمه اصلی" },
    { key: "hero.primary_href", label: "لینک دکمه اصلی" }, { key: "hero.secondary_label", label: "متن دکمه دوم" }, { key: "hero.secondary_href", label: "لینک دکمه دوم" }, { key: "hero.helper", label: "متن راهنما" },
    { key: "hero.feature1_title", label: "ویژگی اول — عنوان" }, { key: "hero.feature1_desc", label: "ویژگی اول — توضیح" },
    { key: "hero.feature2_title", label: "ویژگی دوم — عنوان" }, { key: "hero.feature2_desc", label: "ویژگی دوم — توضیح" },
    { key: "hero.feature3_title", label: "ویژگی سوم — عنوان" }, { key: "hero.feature3_desc", label: "ویژگی سوم — توضیح" },
    { key: "hero.feature4_title", label: "ویژگی چهارم — عنوان" }, { key: "hero.feature4_desc", label: "ویژگی چهارم — توضیح" },
    { key: "hero.finder_brand_placeholder", label: "متن انتخاب برند" }, { key: "hero.finder_model_placeholder", label: "متن انتخاب مدل" }, { key: "hero.finder_model_first_prompt", label: "راهنمای مدل پیش از انتخاب برند" }, { key: "hero.image_alt", label: "متن جایگزین تصویر" },
    { key: "hero.finder_title", label: "عنوان انتخاب خودرو" }, { key: "hero.finder_desc", label: "توضیح انتخاب خودرو" },
    { key: "hero.finder_button", label: "متن دکمه انتخاب خودرو" },
    { key: "home.promo.title", label: "عنوان باکس تخفیف" }, { key: "home.promo.highlight", label: "عبارت برجسته باکس تخفیف" },
    { key: "home.promo.description", label: "توضیحات باکس تخفیف", type: "textarea" },
    { key: "home.promo.code", label: "کد تخفیف صفحه اصلی" }, { key: "home.promo.button", label: "متن دکمه باکس تخفیف" },
    { key: "home.trust1.title", label: "مزیت اول — عنوان" }, { key: "home.trust1.description", label: "مزیت اول — توضیح" },
    { key: "home.trust2.title", label: "مزیت دوم — عنوان" }, { key: "home.trust2.description", label: "مزیت دوم — توضیح" },
    { key: "home.trust3.title", label: "مزیت سوم — عنوان" }, { key: "home.trust3.description", label: "مزیت سوم — توضیح" },
    { key: "home.trust4.title", label: "مزیت چهارم — عنوان" }, { key: "home.trust4.description", label: "مزیت چهارم — توضیح" },
  ]},
  { id: "about", title: "صفحه درباره ما", description: "عنوان و متن معرفی صفحه درباره ما.", fields: [
    { key: "pages.about.eyebrow", label: "برچسب بالای عنوان" }, { key: "pages.about.title", label: "عنوان صفحه" },
    { key: "pages.about.description", label: "متن معرفی صفحه", type: "textarea" }, { key: "pages.about.story_title", label: "عنوان بخش داستان" },
    { key: "pages.about.story_description", label: "متن بخش داستان", type: "textarea" },
    ...Array.from({length:4},(_,i)=>({key:`pages.about.value${i+1}.title`,label:`عنوان مزیت ${i+1}`})),
    ...Array.from({length:4},(_,i)=>({key:`pages.about.value${i+1}.description`,label:`توضیح مزیت ${i+1}`,type:"textarea" as const})),
    ...Array.from({length:4},(_,i)=>({key:`pages.about.timeline${i+1}.year`,label:`سال رویداد ${i+1}`})),
    ...Array.from({length:4},(_,i)=>({key:`pages.about.timeline${i+1}.title`,label:`عنوان رویداد ${i+1}`})),
    ...Array.from({length:4},(_,i)=>({key:`pages.about.timeline${i+1}.description`,label:`توضیح رویداد ${i+1}`,type:"textarea" as const})),
  ]},
  { id: "contact", title: "صفحه تماس و اطلاعات تماس", description: "عنوان و متن صفحه تماس، شماره‌ها و نشانی‌های واقعی فروشگاه.", fields: [
    { key: "pages.contact.eyebrow", label: "برچسب بالای عنوان" }, { key: "pages.contact.title", label: "عنوان صفحه" },
    { key: "pages.contact.description", label: "متن معرفی صفحه", type: "textarea" }, { key: "contact.phone", label: "تلفن" },
    { key: "contact.phone_href", label: "لینک تلفن" }, { key: "contact.mobile", label: "موبایل" },
    { key: "contact.email", label: "ایمیل" }, { key: "contact.address", label: "نشانی", type: "textarea" },
    { key: "contact.hours", label: "ساعات کاری" }, { key: "contact.instagram", label: "لینک اینستاگرام" },
    { key: "contact.telegram", label: "لینک تلگرام" }, { key: "contact.whatsapp", label: "لینک واتساپ" },
  ]},
  { id: "catalog", title: "صفحه فروشگاه و محصولات", description: "متن‌های ثابت ابتدای فروشگاه و پیام حالت بدون نتیجه.", fields: [
    { key: "pages.products.heading", label: "عنوان پیش‌فرض فروشگاه" }, { key: "pages.products.description", label: "توضیح فروشگاه", type: "textarea" },
    { key: "pages.products.empty_title", label: "عنوان نبود محصول" }, { key: "pages.products.empty_description", label: "توضیح نبود محصول", type: "textarea" },
    { key: "pages.track.eyebrow", label: "پیگیری — برچسب" }, { key: "pages.track.title", label: "پیگیری — عنوان" }, { key: "pages.track.description", label: "پیگیری — توضیح", type: "textarea" },
    { key: "pages.track.code_placeholder", label: "پیگیری — راهنمای کد" }, { key: "pages.track.phone_placeholder", label: "پیگیری — راهنمای موبایل" }, { key: "pages.track.submit", label: "پیگیری — متن دکمه" }, { key: "pages.track.empty", label: "پیگیری — پیام پیش‌فرض" }, { key: "pages.track.not_found", label: "پیگیری — پیام یافت نشدن" }, { key: "pages.track.not_found_desc", label: "پیگیری — توضیح خطا" },
    { key: "pages.cart.title", label: "سبد خرید — عنوان" }, { key: "pages.cart.description", label: "سبد خرید — توضیح", type: "textarea" },
    { key: "pages.checkout.title", label: "تکمیل سفارش — عنوان" }, { key: "pages.checkout.description", label: "تکمیل سفارش — توضیح", type: "textarea" },
    { key: "pages.order.title_success", label: "سفارش — عنوان موفق" }, { key: "pages.order.title_pending", label: "سفارش — عنوان در انتظار پرداخت" }, { key: "pages.order.title_paid", label: "سفارش — عنوان پرداخت موفق" }, { key: "pages.order.title_failed", label: "سفارش — عنوان پرداخت ناموفق" }, { key: "pages.order.title_refund", label: "سفارش — عنوان بررسی بازپرداخت" },
    { key: "pages.order.desc_success", label: "سفارش — توضیح موفق", type: "textarea" }, { key: "pages.order.desc_failed", label: "سفارش — توضیح ناموفق", type: "textarea" }, { key: "pages.order.desc_refund", label: "سفارش — توضیح بازپرداخت", type: "textarea" }, { key: "pages.order.code_label", label: "سفارش — برچسب کد رهگیری" }, { key: "pages.order.track_button", label: "سفارش — دکمه پیگیری" }, { key: "pages.order.continue_button", label: "سفارش — دکمه ادامه خرید" },
    { key: "pages.pay.title", label: "پرداخت — عنوان" }, { key: "pages.pay.description", label: "پرداخت — توضیح", type: "textarea" },
  ]},
  { id: "account", title: "حساب کاربری مشتری", description: "عنوان‌ها و پیام‌های اصلی صفحه ورود، ثبت‌نام و داشبورد مشتری.", fields: [
    { key: "account.brand_label", label: "برچسب برند حساب" }, { key: "account.brand_title", label: "عنوان پنل ورود", type: "textarea" }, { key: "account.brand_desc", label: "توضیح پنل ورود", type: "textarea" },
    { key: "account.benefit_orders", label: "مزیت اول" }, { key: "account.benefit_security", label: "مزیت دوم" }, { key: "account.benefit_vehicle", label: "مزیت سوم" },
    { key: "account.login_title", label: "عنوان ورود" }, { key: "account.login_desc", label: "توضیح ورود", type: "textarea" }, { key: "account.register_title", label: "عنوان ثبت‌نام" }, { key: "account.register_desc", label: "توضیح ثبت‌نام", type: "textarea" },
    { key: "account.dashboard_label", label: "برچسب داشبورد" }, { key: "account.dashboard_desc", label: "توضیح داشبورد", type: "textarea" }, { key: "account.orders_title", label: "عنوان سفارش‌ها" }, { key: "account.quick_title", label: "عنوان دسترسی سریع" }, { key: "account.details_title", label: "عنوان اطلاعات حساب" }, { key: "account.help_title", label: "عنوان راهنمای خرید" },
  ]},
  { id: "blog", title: "صفحه مجله و بلاگ", description: "عنوان و توضیح صفحه فهرست مقالات.", fields: [
    { key: "pages.blog.eyebrow", label: "برچسب بالای عنوان" }, { key: "pages.blog.title", label: "عنوان صفحه" },
    { key: "pages.blog.description", label: "توضیح صفحه", type: "textarea" },
  ]},
  { id: "footer", title: "فوتر و پایین سایت", description: "متن معرفی، عنوان ستون‌ها و متن کپی‌رایت.", fields: [
    { key: "footer.about", label: "متن معرفی فروشگاه", type: "textarea" }, { key: "footer.quick_title", label: "عنوان ستون دسترسی سریع" },
    { key: "footer.products_title", label: "عنوان ستون محصولات" }, { key: "footer.contact_title", label: "عنوان ستون ارتباط" },
    { key: "footer.copyright", label: "متن کپی‌رایت" }, { key: "footer.bottom_note", label: "متن پایانی" },
  ]},
  { id: "appearance", title: "فونت و ظاهر نوشتار", description: "فونت و مقیاس متن در بخش عمومی فروشگاه.", fields: [
    { key: "appearance.font_family", label: "فونت سایت", type: "select" }, { key: "appearance.font_scale", label: "اندازه پایه متن", type: "select" },
  ]},
  { id: "seo", title: "سئو و متادیتا", description: "عنوان و توضیح پیش‌فرض موتورهای جست‌وجو.", fields: [
    { key: "seo.title", label: "عنوان پیش‌فرض سئو" }, { key: "seo.description", label: "توضیحات متا", type: "textarea" },
    { key: "seo.keywords", label: "کلمات کلیدی", type: "textarea" },
  ]},
];

async function put(body: Dict) {
  const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ذخیره تنظیمات انجام نشد");
}

export function SiteContentManager({ initial }: { initial: Dict }) {
  const [values, setValues] = useState<Dict>(initial);
  const [active, setActive] = useState(GROUPS[0].id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const group = useMemo(() => GROUPS.find((g) => g.id === active) ?? GROUPS[0], [active]);
  const save = async () => {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const patch = Object.fromEntries(group.fields.map((f) => [f.key, values[f.key] ?? ""]));
      await put(patch); setMessage("تغییرات این بخش ذخیره شد.");
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "خطا در ذخیره"); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-5 xl:grid-cols-[220px_1fr]">
    <nav className="surface flex gap-2 overflow-x-auto rounded-2xl p-2 xl:grid xl:content-start xl:overflow-visible">
      {GROUPS.map((g) => <button key={g.id} onClick={() => { setActive(g.id); setMessage(""); }} className={`shrink-0 rounded-xl px-3 py-3 text-start text-sm font-bold transition ${active === g.id ? "bg-brand-500 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}>{g.title}</button>)}
    </nav>
    <section className="surface rounded-3xl p-5 sm:p-7">
      <div className="mb-6"><h2 className="text-xl font-black">{group.title}</h2><p className="mt-2 text-sm leading-7 text-white/55">{group.description}</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        {group.fields.map((field) => <label key={field.key} className={`grid gap-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
          <span className="text-sm font-semibold">{field.label}</span>
          {field.type === "textarea" ? <textarea className="input min-h-24 resize-y" value={values[field.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} /> : field.type === "select" && field.key.endsWith("_enabled") ? <select className="input" value={values[field.key] ?? "false"} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}><option value="true">فعال</option><option value="false">غیرفعال</option></select> : field.key === "appearance.font_family" ? <select className="input" value={values[field.key] ?? "shabnam"} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}><option value="shabnam">شبنم</option><option value="tahoma">Tahoma</option><option value="system">فونت پیش‌فرض سیستم</option></select> : field.key === "appearance.font_scale" ? <select className="input" value={values[field.key] ?? "normal"} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}><option value="small">کوچک</option><option value="normal">استاندارد</option><option value="large">بزرگ</option></select> : <input className="input" value={values[field.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} />}
        </label>)}
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <p aria-live="polite" className={`text-sm ${failed ? "text-rose-300" : "text-emerald-300"}`}>{message}</p>
        <button onClick={save} disabled={busy} className="btn btn-primary px-5 py-3">{busy ? <LoaderCircle className="size-4 animate-spin" /> : message && !failed ? <Check className="size-4" /> : <Save className="size-4" />} ذخیره این بخش</button>
      </div>
    </section>
  </div>;
}

export function SettingsHistory(){
  const [rows,setRows]=useState<{id:number;settingKey:string;previousValue:string;nextValue:string;changedAt:string}[]>([]);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{setBusy(true);fetch("/api/admin/settings/history",{cache:"no-store"}).then(r=>r.ok?r.json():[]).then(d=>setRows(Array.isArray(d)?d:[])).finally(()=>setBusy(false));},[]);
  return <section className="surface rounded-3xl p-5"><div className="mb-3"><h2 className="font-black">تاریخچه تغییرات محتوا</h2><p className="mt-1 text-xs text-white/50">۲۰۰ تغییر آخر تنظیمات قابل‌ویرایش برای پیگیری تغییرات نگهداری می‌شود.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-xs"><thead className="text-white/45"><tr><th className="p-2 text-start">زمان</th><th className="p-2 text-start">کلید تنظیم</th><th className="p-2 text-start">مقدار قبلی</th><th className="p-2 text-start">مقدار جدید</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-white/5"><td className="p-2">{new Date(r.changedAt).toLocaleString("fa-IR")}</td><td className="p-2 font-mono">{r.settingKey}</td><td className="max-w-[220px] p-2 text-white/45"><span className="line-clamp-2">{r.previousValue}</span></td><td className="max-w-[220px] p-2"><span className="line-clamp-2">{r.nextValue}</span></td></tr>)}</tbody></table>{busy&&!rows.length&&<p className="p-5 text-center text-white/45">در حال بارگذاری…</p>}{!busy&&!rows.length&&<p className="p-5 text-center text-white/45">هنوز تغییری ثبت نشده است.</p>}</div></section>;
}
