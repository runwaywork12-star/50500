import { ThemeLink as Link } from "@/components/ThemeLink";
import { BadgeCheck, Clock, Mail, MapPin, MessageCircle, Phone, Send, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { InstagramIcon } from "@/components/ui";


export function Footer({
  groups,
  more,
  comingSoon,
  settings = {},
}: {
  groups: { id: string; name: string }[];
  more: { slug: string; name: string }[];
  comingSoon: { slug: string; name: string }[];
  settings?: Record<string, string>;
}) {
  const links = [
    { href: "/products", label: settings["header.nav_shop"] || "فروشگاه" },
    { href: "/products?discounted=1&sort=discount", label: settings["header.nav_discount"] || "پیشنهاد ویژه" },
    { href: "/track", label: settings["header.nav_track"] || "پیگیری سفارش" },
    { href: "/blog", label: settings["header.nav_blog"] || "مجله ۵۰۵۰۰" },
    { href: "/about", label: settings["header.nav_about"] || "درباره ما" },
    { href: "/contact", label: settings["header.nav_contact"] || "تماس با ما" },
  ];
  const phone = settings["contact.phone"] || "۰۲۱-۹۱۰۵۰۵۰۰";
  const phoneHref = settings["contact.phone_href"] || "tel:+982191050500";
  const email = settings["contact.email"] || "info@store50500.ir";
  const address = settings["contact.address"] || "";
  const hours = settings["contact.hours"] || "";
  return (
    <footer className="relative mt-24 overflow-hidden border-t bd bg-ink-900">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px]" />
      <div className="container-x relative grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.4fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-8 tdim">
            {settings["footer.about"] || "فروشگاه ۵۰۵۰۰؛ محصولات تخصصی خودرو با مشخصات شفاف و امکان انتخاب متناسب با خودروی شما."}
          </p>
          <div className="mt-6 flex gap-2">
            {[
              { icon: <InstagramIcon className="size-5" />, label: "اینستاگرام", href: settings["contact.instagram"] },
              { icon: <Send className="size-5" />, label: "تلگرام", href: settings["contact.telegram"] },
              { icon: <MessageCircle className="size-5" />, label: "واتساپ", href: settings["contact.whatsapp"] },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href || "#"}
                aria-label={s.label}
                target={s.href ? "_blank" : undefined}
                rel={s.href ? "noreferrer" : undefined}
                className="grid size-11 place-items-center rounded-xl border bd soft tdim transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:text-brand-300"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-black">{settings["footer.quick_title"] || "دسترسی سریع"}</h3>
          <ul className="grid gap-3 text-sm tdim">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-brand-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-black">{settings["footer.products_title"] || "محصولات و خودروها"}</h3>
          <ul className="grid gap-3 text-sm tdim">
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/products?group=${g.id}`} className="transition-colors hover:text-brand-300">
                  کفپوش {g.name}
                </Link>
              </li>
            ))}
            {more.map((c) => (
              <li key={c.slug}>
                <Link href={`/products?category=${c.slug}`} className="transition-colors hover:text-brand-300">
                  {c.name}
                </Link>
              </li>
            ))}
            {comingSoon.map((c) => (
              <li key={c.slug} className="flex items-center gap-2 tdim">
                {c.name}
                <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-300">به‌زودی</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-black">{settings["footer.contact_title"] || "ارتباط با ما"}</h3>
          <ul className="grid gap-4 text-sm tdim">
            <li className="flex items-center gap-3">
              <Phone className="size-4 shrink-0 text-brand-400" />
              <a href={phoneHref} className="hover:text-white">
                {phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="size-4 shrink-0 text-brand-400" />
              <span dir="ltr">{email}</span>
            </li>
            <li className="flex items-start gap-3 leading-7">
              <MapPin className="mt-1 size-4 shrink-0 text-brand-400" />
              {address}
            </li>
            <li className="flex items-center gap-3">
              <Clock className="size-4 shrink-0 text-brand-400" />
              {hours}
            </li>
          </ul>
          <div className="mt-6 flex gap-3">
            <div className="grid flex-1 place-items-center gap-1 rounded-2xl border bd soft p-3 text-center text-[11px] tdim">
              <ShieldCheck className="size-7 text-emerald-400" /> نماد اعتماد الکترونیکی
            </div>
            <div className="grid flex-1 place-items-center gap-1 rounded-2xl border bd soft p-3 text-center text-[11px] tdim">
              <BadgeCheck className="size-7 text-sky-400" /> ضمانت اصالت کالا
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" dir="ltr" className="pointer-events-none -mb-2 select-none overflow-hidden text-center sm:-mb-10">
        <p dir="ltr" className="font-english outline-text select-none text-[clamp(4.5rem,14vw,13rem)] font-black leading-[0.85] tracking-tighter">50500</p>
      </div>
      <div className="relative border-t bd bg-ink-900/80 backdrop-blur">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 pb-24 text-xs tdim sm:flex-row lg:pb-5">
          <p>
            © {new Date().getFullYear()} — {settings["footer.copyright"] || "تمامی حقوق برای فروشگاه ۵۰۵۰۰ محفوظ است."}
          </p>
          <p>{settings["footer.bottom_note"] || "ساخته‌شده با عشق به خودرو 🧡"}</p>
        </div>
      </div>
    </footer>
  );
}
