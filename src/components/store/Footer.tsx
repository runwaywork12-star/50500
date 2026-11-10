import { ThemeLink as Link } from "@/components/ThemeLink";
import { BadgeCheck, Clock, Mail, MapPin, MessageCircle, Phone, Send, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { InstagramIcon } from "@/components/ui";
import { CAR_GROUPS } from "@/data/content";
import { useSiteContent } from "@/lib/site-content";
import { useAuth } from "@/lib/auth.tsx";

export function Footer() {
  const { content } = useSiteContent();
  const { user } = useAuth();
  const links = [
    { href: "/products", label: "فروشگاه" },
    { href: "/products?discounted=1&sort=discount", label: "پیشنهاد ویژه" },
    { href: "/track", label: "پیگیری سفارش" },
    { href: "/blog", label: "مجله 50500" },
    { href: user ? "/account" : "/login", label: user ? `حساب ${user.name.split(" ")[0]}` : "حساب کاربری" },
    { href: "/about", label: "درباره ما" },
    { href: "/contact", label: "تماس با ما" },
  ];
  const phone = content.contact.phone;
  const phoneHref = content.contact.phoneHref;
  const email = content.contact.email;
  const address = content.contact.address;
  const hours = content.contact.hours;

  return (
    <footer className="relative mt-24 overflow-hidden border-t bd bg-ink-900">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px]" />
      <div className="container-x relative grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.4fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-8 tdim">
            {content.footer.about}
          </p>
          <div className="mt-6 flex gap-2">
            {[
              { icon: <InstagramIcon className="size-5" />, label: "اینستاگرام", href: "https://instagram.com" },
              { icon: <Send className="size-5" />, label: "تلگرام", href: "https://telegram.org" },
              { icon: <MessageCircle className="size-5" />, label: "واتساپ", href: "https://whatsapp.com" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noreferrer"
                className="grid size-11 place-items-center rounded-xl border bd soft tdim transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:text-brand-300"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-black">"دسترسی سریع"</h3>
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
          <h3 className="mb-5 text-sm font-black">"محصولات و خودروها"</h3>
          <ul className="grid gap-3 text-sm tdim">
            {CAR_GROUPS.map((g) => (
              <li key={g.id}>
                <Link href={`/products?group=${g.id}`} className="transition-colors hover:text-brand-300">
                  کفپوش {g.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/products?category=accessories" className="transition-colors hover:text-brand-300">
                همه لوازم جانبی خودرو
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-black">"ارتباط با ما"</h3>
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
            © {new Date().getFullYear()} — {content.footer.copyright}
          </p>
          <p className="flex items-center gap-3">{content.footer.note}<Link href="/admin" className="rounded-lg border bd px-2.5 py-1 text-[10px] font-bold transition hover:border-brand-500/50 hover:text-brand-300">پنل مدیریت</Link></p>
        </div>
      </div>
    </footer>
  );
}
