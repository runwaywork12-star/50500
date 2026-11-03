import type { Metadata } from "next";
import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { Clock } from "lucide-react";
import { PageHero } from "@/components/ui";
import { getBlogPosts } from "@/lib/blog";
import { getSettings } from "@/lib/settings";
import { fa } from "@/lib/format";

export const metadata: Metadata = { title: "مجله ۵۰۵۰۰" };

export default async function BlogPage() {
  const [posts, settings] = await Promise.all([getBlogPosts(), getSettings()]);
  const [first, ...rest] = posts;
  return (
    <>
      <PageHero eyebrow={settings["pages.blog.eyebrow"]} title={settings["pages.blog.title"]} desc={settings["pages.blog.description"]} />
      <div className="container-x grid gap-6 py-12">
        {first && (
          <Link href={`/blog/${first.slug}`} className="surface group grid overflow-hidden rounded-[2rem] lg:grid-cols-2">
            <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[340px]">
              <Image src={first.cover} alt={first.title} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-10">
              <span className="chip chip-active self-start">{first.tag}</span>
              <h2 className="mt-4 text-2xl font-black leading-snug transition-colors group-hover:text-brand-300 sm:text-3xl">{first.title}</h2>
              <p className="mt-4 text-sm leading-8 tdim">{first.excerpt}</p>
              <p className="mt-6 flex items-center gap-2 text-xs tdim">
                <Clock className="size-4" /> {first.date} · {fa(first.readTime)} دقیقه مطالعه
              </p>
            </div>
          </Link>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="surface group overflow-hidden rounded-3xl">
              <div className="relative aspect-[16/9]">
                <Image src={p.cover} alt={p.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
                <span className="glass absolute start-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold">{p.tag}</span>
              </div>
              <div className="p-6">
                <h2 className="text-lg font-black leading-8 transition-colors group-hover:text-brand-300">{p.title}</h2>
                <p className="mt-2 text-sm leading-7 tdim">{p.excerpt}</p>
                <p className="mt-4 text-xs tdim">
                  {p.date} · {fa(p.readTime)} دقیقه مطالعه
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
