import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ruler, Palette, ShieldCheck, Package } from "lucide-react";
import { Breadcrumbs, PageHero } from "@/components/ui";
import { BLOG_POSTS } from "@/data/content";
import { useSiteContent } from "@/lib/site-content";
import { fa } from "@/lib/format";

const TOPIC_ICON = {
  "راهنما": Ruler,
  "نگهداری": ShieldCheck,
  "طراحی": Palette,
};

function topicIcon(tag: string) {
  return TOPIC_ICON[tag as keyof typeof TOPIC_ICON] ?? Package;
}

function mergedPosts(articles: Record<string, { title?: string; excerpt?: string; body?: string[] }>): typeof BLOG_POSTS {
  return BLOG_POSTS.map((p) => {
    const o = articles[p.slug];
    return o ? { ...p, title: o.title ?? p.title, excerpt: o.excerpt ?? p.excerpt, body: o.body ?? p.body } : p;
  });
}

export function Blog() {
  const { content } = useSiteContent();
  const blog = content.pageContent.blog ?? {};
  const posts = mergedPosts(content.articles);
  const [featured, ...rest] = posts;

  return (
    <section className="container-x pb-12 pt-7 sm:pt-9 lg:pb-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b bd pb-5 sm:mb-8 sm:pb-6">
        <div>
          <p className="text-[11px] font-black tracking-[.16em] text-brand-400">{blog.eyebrow ?? "مجله 50500"}</p>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">{blog.title || "راهنمای کفپوش اختصاصی"}</h1>
          <p className="mt-2 max-w-2xl text-xs leading-6 tdim sm:text-sm">{blog.desc || "از انتخاب قالب تا مراقبت دوام؛ فقط درباره کفپوش چرمی گلدوزی خودرو"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-e-2 border-brand-500 pe-3">
          <span className="text-2xl font-black text-brand-300">{fa(posts.length)}</span>
          <span className="text-[11px] font-bold leading-5 tdim">
            راهنمای تخصصی
            <br />
            برای انتخاب بهتر
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 xl:gap-5">
        {featured && (
          <Link
            to={`/blog/${featured.slug}`}
            aria-label={`مطالعه مقاله: ${featured.title}`}
            className="blog-featured group relative isolate flex min-h-[360px] flex-col justify-end overflow-hidden rounded-[1.6rem] border bd sm:col-span-2 lg:col-span-1 xl:col-span-6 xl:min-h-[455px]"
          >
            <img src={featured.image} alt={featured.title} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.04]" />
            <span className="blog-photo-shade absolute inset-0" />
            <span className="glass absolute start-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-bold text-white">انتخاب سردبیر</span>
            <div className="blog-featured-copy relative mt-auto p-5 sm:p-7">
              <span className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-black text-brand-300">
                {(() => { const I = topicIcon(featured.tag); return <I className="size-3.5" />; })()}
                {featured.tag}
              </span>
              <h2 className="max-w-2xl text-xl font-black leading-8 text-white sm:text-2xl sm:leading-9">{featured.title}</h2>
              <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-6 text-white/75 sm:text-sm">{featured.excerpt}</p>
              <div className="photo-divider mt-4 flex items-center justify-between gap-3 border-t pt-3 text-[11px] text-white/65">
                <span>
                  {featured.date} <span className="mx-1.5 text-white/35">/</span> مطالعه {featured.readTime}
                </span>
                <span className="inline-flex items-center gap-1.5 font-black text-brand-300 transition-all group-hover:gap-3">
                  ادامه مطالعه <ArrowLeft className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {rest.map((p) => {
          const I = topicIcon(p.tag);
          return (
            <Link
              key={p.slug}
              to={`/blog/${p.slug}`}
              className="group flex min-h-[330px] flex-col overflow-hidden rounded-[1.6rem] border bd transition duration-300 hover:-translate-y-1 hover:border-brand-500/45 sm:min-h-[360px] lg:min-h-[440px] xl:col-span-3"
              style={{ background: "var(--surface-1)" }}
            >
              <span className="relative block min-h-[150px] flex-1 overflow-hidden" style={{ background: "var(--muted-surface)" }}>
                <img src={p.image} alt={p.title} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
                <span className="blog-photo-shade-soft absolute inset-0" />
                <span className="glass absolute start-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold text-white">{p.tag}</span>
              </span>
              <span className="flex flex-1 flex-col p-4 sm:p-5">
                <span className="text-[10px] font-bold tfaint">
                  {p.date} <span className="mx-1">/</span> {p.readTime}
                </span>
                <b className="mt-2 line-clamp-3 text-sm font-black leading-7 transition-colors group-hover:text-brand-300">{p.title}</b>
                <span className="mt-2 line-clamp-3 text-[11px] leading-6 tdim">{p.excerpt}</span>
                <span className="mt-auto flex items-center justify-between gap-2 border-t bd pt-3 text-[11px] font-bold text-brand-300">
                  <span className="inline-flex items-center gap-1.5">
                    <I className="size-3.5" /> {p.tag}
                  </span>
                  <span className="inline-flex items-center gap-1.5 transition-all group-hover:gap-2.5">
                    مطالعه <ArrowLeft className="size-3.5" />
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 flex items-center gap-2 text-[11px] tfaint">
        <ShieldCheck className="size-3.5 shrink-0 text-emerald-400" />
        راهنمای خرید و نگهداری کفپوش، مستقیم از تجربهٔ کارگاه 50500.
      </p>
    </section>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const { content } = useSiteContent();
  const basePost = BLOG_POSTS.find((p) => p.slug === slug);
  const post = basePost
    ? { ...basePost, title: content.articles[basePost.slug]?.title ?? basePost.title, excerpt: content.articles[basePost.slug]?.excerpt ?? basePost.excerpt, body: content.articles[basePost.slug]?.body ?? basePost.body }
    : undefined;
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
      <div className="container-x py-6">
        <Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/blog", label: "مجله" }, { label: post.title }]} />
      </div>
      <article className="container-x max-w-3xl py-2">
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/12 px-3 py-1 text-[11px] font-black text-brand-300">
            {(() => { const I = topicIcon(post.tag); return <I className="size-3.5" />; })()}
            {post.tag}
          </span>
          <span className="text-[11px] tfaint">{post.date} · مطالعه {post.readTime}</span>
        </div>
        <h1 className="text-2xl font-black leading-9 sm:text-[1.9rem] sm:leading-[2.2rem]">{post.title}</h1>
        <p className="mt-3 text-sm leading-8 tdim">{post.excerpt}</p>
        <img src={post.image} alt="" loading="lazy" decoding="async" className="mt-7 w-full rounded-[2rem] border bd object-cover" style={{ maxHeight: 420 }} />
        <div className="mt-8 grid gap-5 text-sm leading-9 tdim sm:text-[15px]">
          {post.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link to="/products" className="btn btn-primary shine w-full py-3.5 text-sm">
            دیدن کفپوش‌ها <ArrowLeft className="size-4" />
          </Link>
          <Link to="/blog" className="btn btn-ghost w-full py-3.5 text-sm">
            بقیه راهنمای کتاب
          </Link>
        </div>
      </article>
    </>
  );
}
