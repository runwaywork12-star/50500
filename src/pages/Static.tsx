import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
 ArrowLeft,
 Award,
 BadgeCheck,
 Clock,
 Mail,
 MapPin,
 Phone,
 Ruler,
 Send,
 ShieldCheck,
 Users,
} from "lucide-react";
import { PageHero } from "@/components/ui";
import { useSiteContent } from "@/lib/site-content";
import { SITE, TRUST } from "@/data/content";
import { modelCount } from "@/lib/catalog";
import { fa } from "@/lib/format";
import { img } from "@/lib/images";

export function About() {
 const { content } = useSiteContent();
 const about = content.pageContent.about ?? {};
 const aboutCover = content.imageSlots["about.cover"]?.src ?? img("images/showcase/card-front-mat.jpg");
 const stats = [
  { icon: Ruler, value: `+${fa(modelCount())}`, label: "مدل خودرو با قالب اختصاصی" },
  { icon: Users, value: "+۱۲۰۰۰", label: "مشتری راضی در سراسر ایران" },
  { icon: ShieldCheck, value: "۱۲ ماه", label: "گارانتی تعویض بی‌قیدوشرط" },
  { icon: Award, value: "پیشگام", label: "اولین تولیدکننده کفپوش گلدوزی پنج‌بعدی" },
 ];
 return (
  <>
   <PageHero
    eyebrow="درباره 50500"
    title={<>تولیدکننده تخصصی <span className="text-gradient">کفپوش چرمی گلدوزی</span> خودرو</>}
     desc={about.intro || "از سال ۱۳۹۰ در کارگاه 50500، کفپوش هر خودرو را با اسکن سه‌بعدی قالب، به‌صورت اختصاصی می‌دوزیم و گلدوزی می‌کنیم."}
    />
   <div className="container-x py-12 lg:py-16">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
     {stats.map((s) => (
      <div key={s.label} className="rounded-3xl border bd p-6 text-center" style={{ background: "var(--surface-1)" }}>
       <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
        <s.icon className="size-6" />
       </span>
       <p className="mt-4 text-2xl font-black">{s.value}</p>
       <p className="mt-1 text-xs leading-6 tdim">{s.label}</p>
      </div>
     ))}
    </div>

     <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
      <div className="relative order-2 lg:order-1">
       <img src={aboutCover} alt="کارگاه 50500" loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-[2rem] border bd object-cover lg:aspect-[5/4] lg:max-h-[430px]" />
       <div className="absolute bottom-4 end-4 rounded-2xl border border-white/15 bg-black/45 px-4 py-2.5 backdrop-blur">
        <p className="text-[11px] font-black text-white">کارگاه اختصاصی 50500</p>
        <p className="mt-0.5 text-[10px] text-white/70">تهران، جاده مخصوص</p>
       </div>
      </div>
      <div className="order-1 lg:order-2">
       <h2 className="text-2xl font-black leading-10 sm:text-3xl">داستان ما از یک کارگاه کوچک شروع شد</h2>
      <div className="mt-5 grid gap-4 text-sm leading-8 tdim">
       <p>{about.story1 || "بنیان‌گذاران 50500 با این باور که کفپوش باید کاملاً اختصاصی باشد کار را شروع کردند. امروز با دستگاه اسکن سه‌بعدی، قالب بیش از " + fa(modelCount()) + " مدل خودرو را در آرشیو داریم."}</p>
       <p>{about.story2 || "همه محصولات در کارگاه خودمان دوخته می‌شوند: رویه چرمی، فوم ۹ میلی‌متری، پارچه جودون و گلدوزی دستی با نخ‌های رنگی — با هولوگرام اصالت و ۱۲ ماه گارانتی."}</p>
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
       {TRUST.map((t) => (
        <li key={t.title} className="flex items-center gap-3 rounded-2xl border bd p-3.5" style={{ background: "var(--surface-1)" }}>
         <t.icon className="size-5 shrink-0 text-brand-400" />
         <span>
          <b className="block text-xs">{t.title}</b>
          <span className="text-[11px] tfaint">{t.desc}</span>
         </span>
        </li>
       ))}
      </ul>
      <Link to="/products" className="btn btn-primary shine mt-7 px-7 py-3.5 text-sm">
       مشاهده محصولات <ArrowLeft className="size-5" />
      </Link>
     </div>
    </div>
   </div>
  </>
 );
}

export function Contact() {
 const { content } = useSiteContent();
 const contactPage = content.pageContent.contact ?? {};
 const contactCover = content.imageSlots["contact.cover"]?.src ?? img("images/hero-mat.webp");
 const [form, setForm] = useState({ name: "", phone: "", subject: "", body: "" });
 const [sent, setSent] = useState(false);
 const submit = (e: FormEvent) => {
  e.preventDefault();
  if (form.name.trim().length < 2 || form.body.trim().length < 5) return;
  setSent(true);
 };
 const cards = [
  { icon: Phone, title: "تلفن پشتیبانی", value: SITE.phone, href: SITE.phoneHref },
  { icon: Mail, title: "ایمیل", value: SITE.email, href: `mailto:${SITE.email}` },
  { icon: MapPin, title: "نشانی دفتر فروش", value: SITE.address, href: undefined },
  { icon: Clock, title: "ساعت کاری", value: SITE.hours, href: undefined },
 ];
 return (
  <>
   <PageHero eyebrow="تماس با ما" title={contactPage.title || "در کنار شما هستیم"} desc={contactPage.desc || "سؤالی درباره انتخاب کفپوش، رنگ‌ها یا پیگیری سفارش دارید؟ پیام بدهید؛ همان روز پاسخ می‌دهیم."} />
   <div className="container-x py-12 lg:py-16">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
     {cards.map((c) => (
      <div key={c.title} className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
       <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
        <c.icon className="size-6" />
       </span>
       <p className="mt-4 text-xs font-bold tfaint">{c.title}</p>
       {c.href ? (
        <a href={c.href} className="mt-1 block text-sm font-black hover:text-brand-300" dir={c.title === "ایمیل" || c.title === "تلفن پشتیبانی" ? "ltr" : "rtl"}>{c.value}</a>
       ) : (
        <p className="mt-1 text-sm font-black leading-6">{c.value}</p>
       )}
      </div>
     ))}
    </div>

    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
     <div className="rounded-[2rem] border bd p-8" style={{ background: "var(--surface-1)" }}>
      <h2 className="text-xl font-black">فرم تماس</h2>
      {sent ? (
       <div className="mt-6 grid place-items-center gap-3 rounded-2xl bg-emerald-500/10 p-8 text-center">
        <BadgeCheck className="size-10 text-emerald-400" />
        <p className="font-black">پیام شما دریافت شد!</p>
        <p className="text-sm tdim">همکاران ما به‌زودی با شما تماس می‌گیرند.</p>
        <button onClick={() => { setSent(false); setForm({ name: "", phone: "", subject: "", body: "" }); }} className="btn btn-ghost mt-2 px-5 py-2.5 text-sm">ارسال پیام دیگر</button>
       </div>
      ) : (
       <form onSubmit={submit} className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
         <input className="input" required minLength={2} placeholder="نام شما" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
         <input className="input" dir="ltr" inputMode="tel" placeholder="09121234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <input className="input" placeholder="موضوع پیام" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <textarea className="input min-h-36 resize-y" required minLength={5} placeholder="پیام خود را بنویسید..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <button type="submit" className="btn btn-primary shine w-full py-3.5 text-sm sm:w-auto sm:px-8">
         <Send className="size-4" /> ارسال پیام
        </button>
       </form>
      )}
     </div>
     <div className="contact-showroom relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-[2rem] border bd lg:min-h-0" style={{ background: "var(--muted-surface)" }}>
      <img src={contactCover} alt="دفتر فروش 50500" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <div className="contact-showroom-shade absolute inset-0" />
      <div className="relative m-4 rounded-[1.4rem] border bd p-5 sm:m-5" style={{ background: "var(--surface-1)" }}>
       <p className="flex items-center gap-2 text-sm font-black"><MapPin className="size-5 text-brand-500" /> شوروم و دفتر فروش</p>
       <p className="mt-2 text-xs leading-7 tdim sm:text-sm">{SITE.address} — {SITE.hours}</p>
      </div>
     </div>
    </div>
   </div>
  </>
 );
}

export function Blog() {
 return (
  <>
   <div className="container-x py-6 text-center text-xs tdim">درحال انتقال به مجله 50500…</div>
   <Link to="/" style={{ display: "none" }} aria-hidden="true" />
  </>
 );
}
export function NotFound() {
 return (
  <>
   <PageHero eyebrow="خطای ۴۰۴" title="صفحه مورد نظر یافت نشد" desc="ممکن است آدرس را اشتباه وارد کرده باشید." />
   <div className="container-x grid place-items-center gap-4 py-24 text-center">
    <p className="text-7xl font-black text-gradient">۴۰۴</p>
    <Link to="/" className="btn btn-primary px-7 py-3.5 text-sm">بازگشت به صفحه اصلی <ArrowLeft className="size-4" /></Link>
   </div>
  </>
 );
}
