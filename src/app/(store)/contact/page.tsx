import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { ContactForm } from "@/components/store/ContactForm";
import { InstagramIcon, PageHero } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "تماس با ما" };

export default async function ContactPage() {
  const settings = await getSettings();
  const cards = [
    { icon: Phone, t: "تلفن پشتیبانی", v: settings["contact.phone"], href: settings["contact.phone_href"] },
    { icon: MessageCircle, t: "واتساپ و تلگرام", v: settings["contact.mobile"], href: settings["contact.whatsapp"] },
    { icon: Mail, t: "ایمیل", v: settings["contact.email"] },
    { icon: Clock, t: "ساعات پاسخگویی", v: settings["contact.hours"] },
  ];
  return (
    <>
      <PageHero eyebrow={settings["pages.contact.eyebrow"]} title={settings["pages.contact.title"]} desc={settings["pages.contact.description"]} />
      <div className="container-x grid gap-6 py-12 lg:grid-cols-[1fr_1.3fr]">
        <div className="grid content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((c) => (
              <a key={c.t} href={c.href ?? "#"} className="surface group rounded-3xl p-5 transition hover:border-brand-500/30">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-400 transition group-hover:bg-brand-500 group-hover:text-[#fff]">
                  <c.icon className="size-5" />
                </span>
                <p className="mt-4 text-xs tdim">{c.t}</p>
                <p className="mt-1 font-bold" dir={c.t === "ایمیل" ? "ltr" : undefined}>
                  {c.v}
                </p>
              </a>
            ))}
          </div>
          <div className="surface relative overflow-hidden rounded-3xl p-6">
            <div className="grid-bg absolute inset-0 opacity-50" />
            <div className="relative flex items-start gap-3">
              <MapPin className="mt-1 size-6 shrink-0 text-brand-400" />
              <div>
                <p className="font-black">دفتر مرکزی و نمایشگاه</p>
                <p className="mt-2 text-sm leading-7 tdim">{settings["contact.address"]}</p>
              </div>
            </div>
            <div className="relative mt-6 grid h-40 place-items-center rounded-2xl border border-dashed bd bg-ink-900/60">
              <div className="text-center">
                <span className="relative mx-auto flex size-4">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-75" />
                  <span className="relative inline-flex size-4 rounded-full bg-brand-500" />
                </span>
                <p className="mt-3 text-xs tdim">نمایشگاه ۵۰۵۰۰ — تهران</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { icon: <InstagramIcon className="size-5" />, l: "اینستاگرام", href: settings["contact.instagram"] },
              { icon: <Send className="size-5" />, l: "تلگرام", href: settings["contact.telegram"] },
              { icon: <MessageCircle className="size-5" />, l: "واتساپ", href: settings["contact.whatsapp"] },
            ].map((s) => (
              <a key={s.l} href={s.href || "#"} target={s.href ? "_blank" : undefined} rel={s.href ? "noreferrer" : undefined} className="btn btn-ghost flex-1 py-3 text-sm">
                {s.icon} {s.l}
              </a>
            ))}
          </div>
        </div>
        <div className="surface rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-black">ارسال پیام</h2>
          <p className="mt-2 text-sm tdim">فرم زیر را پر کنید تا کارشناسان ما با شما تماس بگیرند.</p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </>
  );
}
