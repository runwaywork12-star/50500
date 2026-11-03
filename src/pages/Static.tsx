import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
 ArrowLeft,
 Award,
 BadgeCheck,
 Clock,
 Factory,
 Mail,
 MapPin,
 Phone,
 Ruler,
 Send,
 ShieldCheck,
 Users,
} from "lucide-react";
import { PageHero } from "@/components/ui";
import { BLOG_POSTS, SITE, TRUST } from "@/data/content";
import { modelCount } from "@/lib/catalog";
import { fa } from "@/lib/format";
import { img } from "@/lib/images";

export function About() {
 const stats = [
  { icon: Ruler, value: `+${fa(modelCount())}`, label: "مدل خودرو با قالب اختصاصی" },
  { icon: Users, value: "+۱۲۰۰۰", label: "مشتری راضی در سراسر ایران" },
  { icon: ShieldCheck, value: "۱۲ ماه", label: "گارانتی تعویض بی‌قیدوشرط" },
  { icon: Award, value: " pioneered", label: "اولین تولیدکننده کفپوش گلدوزی ۵ بعدی" },
 ];
 return (
  <>
   <PageHero
    eyebrow="درباره 50500"
    title={<>تولیدکننده تخصصی <span className="text-gradient">کفپوش چرمی گلدوزی</span> خودرو</>}
    desc="از سال ۱۳۹۵ در کارگاه 50500، کفپوش هر خودرو را با اسکن سه‌بعدی قالب، به‌صورت اختصاصی می‌دوزیم و گلدوزی می‌کنیم."
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
     <div>
      <img src={img("images/showcase/card-front-mat.jpg")} alt="کارگاه 50500" className="w-full rounded-[2rem] border bd object-cover" />
     </div>
     <div>
      <h2 className="text-2xl font-black leading-10 sm:text-3xl">داستان ما از یک کارگاه کوچک شروع شد</h2>
      <div className="mt-5 grid gap-4 text-sm leading-8 tdim">
       <p>
        بنیان‌گذاران 50500 با این با این باور کهد اختصاصی باشد. امروز با دستگاه اسکن سه‌بعدی، قالب بیش از {fa(modelCount())} مدل خودرو را در آرشیو داریم.
       </p>
       <p>
        همه محصولات در کارگاه خودمان دوخته می‌شوند: رویه چرمی، فوم ۹ میلی‌متری، پارچه جودون و گلدوزی دستی با نخ‌های رنگی — با هولوگرام اصالت و ۱۲ ماه گارانتی.
       </p>
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
   <PageHero eyebrow="تماس با ما" title="در کنار شما هستیم" desc="سؤالی درباره انتخاب کفپوش، رنگ‌ها یا پیگیری سفارش دارید؟ پیام بدهید؛ همان روز پاسخ می‌دهیم." />
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
     <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] border bd" style={{ background: "var(--muted-surface)" }}>
      <img src={img("images/hero-mat.webp")} alt="فروشگاه 50500" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 end-0 start-0 p-8">
       <p className="flex items-center gap-2 text-sm font-black text-white"><Factory className="size-5 text-brand-400" /> showroom و دفتر فروش</p>
       <p className="mt-2 max-w-md text-sm leading-7 text-white/80">{SITE.address} — {SITE.hours}</p>
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
   <PageHero eyebrow="مجله 50500" title="مقالات آموزشی" desc="راهنمای انتخاب، مقایسه و نگهداری از کفپوش و روکش‌های چرمی خودرو" />
   <div className="container-x grid gap-5 py-12 md:grid-cols-2 lg:grid-cols-3 lg:py-16">
    {BLOG_POSTS.map((p) => (
     <Link key={p.slug} to={`/blog/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border bd transition hover:-translate-y-1 hover:border-brand-500/40" style={{ background: "var(--surface-1)" }}>
      <span className="relative block h-48 overflow-hidden" style={{ background: "var(--muted-surface)" }}>
       <img src={p.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </span>
      <span className="flex flex-1 flex-col p-6">
       <span className="text-[11px] font-bold tfaint">{p.date} · مطالعه {p.readTime}</span>
       <b className="mt-2 text-base font-black leading-7">{p.title}</b>
       <span className="mt-2 line-clamp-3 text-xs leading-6 tdim">{p.excerpt}</span>
       <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-300 transition-all group-hover:gap-3">
        ادامه مطلب <ArrowLeft className="size-3.5" />
       </span>
      </span>
     </Link>
    ))}
   </div>
  </>
 );
}

export function BlogPost() {
 const { slug } = useParams();
 const post = BLOG_POSTS.find((p) => p.slug === slug);
 if (!post) {
  return (
   <>
    <PageHero eyebrow="مجله" title="مقاله یافت نشد" />
    <div className="container-x py-16 text-center">
     <Link to="/blog" className="btn btn-primary px-6 py-3 text-sm">بازگشت به مجله <ArrowLeft className="size-4" /></Link>
    </div>
   </>
  );
 }
 return (
  <>
   <PageHero eyebrow="مجله 50500" title={post.title} desc={`${post.date} · مطالعه ${post.readTime}`} />
   <article className="container-x max-w-3xl py-12">
    <img src={post.image} alt="" className="w-full rounded-[2rem] border bd object-cover" style={{ maxHeight: 380 }} />
    <div className="mt-8 grid gap-5 text-sm leading-9 tdim sm:text-[15px]">
     {post.body.map((p, i) => (
      <p key={i}>{p}</p>
     ))}
    </div>
    <Link to="/blog" className="btn btn-ghost mt-10 px-6 py-3 text-sm"><ArrowLeft className="size-4" /> همه مقالات</Link>
   </article>
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
