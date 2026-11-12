import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Ruler, Palette, ShieldCheck, Package } from "lucide-react";
import { Breadcrumbs, PageHero } from "@/components/ui";
import { BLOG_POSTS } from "@/data/content";
import { useSiteContent } from "@/lib/site-content";
import { fa } from "@/lib/format";
import { img } from "@/lib/images";

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
  const blogCover = content.imageSlots["blog.cover"]?.src ?? img("images/workshop/sewing-machine.jpg");
  const posts = mergedPosts(content.articles);
  const [featured, ...rest] = posts;
  const restGrid = rest.length ? rest : posts;

  return (
    <>
      <PageHero eyebrow={blog.eyebrow ?? "مجله 50500"} title={blog.title || "راهنمای کفپوش اختصاصی"} desc={blog.desc || "از انتخاب قالب تا مراقبت دوام؛ فقط درباره کفپوش چرمی گلدوزی خودرو"} />

      <div className="container-x py-10 lg:py-14">
        {/* featured article */}
        {featured && (
          <section className="grid gap-0 overflow-hidden rounded-[1.6rem] border bd lg:grid-cols-2" style={{ background: "var(--surface-1)" }}>
            <Link to={`/blog/${featured.slug}`} className="group relative block aspect-[16/9] overflow-hidden lg:aspect-auto lg:min-h-[320px]">
              <img src={featured.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
              <span className="glass absolute start-3 top-3 rounded-full px-2.5 py-1 text-[10.5px] font-bold">پیشنهاد امروز</span>
            </Link>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-500/12 px-3 py-1 text-[11px] font-black text-brand-300">
                {(() => { const I = topicIcon(featured.tag); return <I className="size-3.5" />; })()}
                {featured.tag}
              </span>
              <h2 className="text-xl font-black leading-8 sm:text-2xlimd:leading-[2.1rem] sm:text-[1.6rem]">{featured.title}</h2>
              <p className="mt-2 text-sm leading-7 tdim">{featured.excerpt}</p>
              <p className="mt-4 text-[11px] tfaint">{featured.date} · مطالعه {featured.readTime}</p>
              <Link to={`/blog/${featured.slug}`} className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-black text-brand-300 transition-all hover:gap-3">
                ادامه مطالعه <ArrowLeft className="size-4" />
              </Link>
            </div>
          </section>
        )}

        {/* cover strip */}
        <div className="relative mt-8 overflow-hidden rounded-[1.6rem] border bd" style={{ background: "var(--muted-surface)" }}>
          <img src={blogCover} alt="کارگاه 50500 در حال دوخت" className="h-40 w-full object-cover sm:h-52" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-center p-5 sm:p-8">
            <p className="max-w-md text-sm font-black leading-7 text-white sm:text-base">
              هر هفته یک راهنما جدید؛ فقط روی کفپوش چرمی گلدوزی خودرو تمرکز می‌کنیم.
            </p>
          </div>
        </div>

        {/* grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restGrid.map((p, i) => {
            const I = topicIcon(p.tag);
            return (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border bd transition hover:-translate-y-1 hover:border-brand-500/45" style={{ background: "var(--surface-1)" }}>
                <span className="relative block aspect-[16/9] overflow-hidden" style={{ background: "var(--muted-surface)" }}>
                  <img src={p.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <span className="glass absolute start-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold">{p.tag}</span>
                  <span className="absolute bottom-3 end-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    {fa(i + 1)} دقیقه مطالعه
                  </span>
                </span>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <p className="text-[10px] font-bold tfaint">{p.date} · {p.readTime}</p>
                  <b className="mt-1.5 line-clamp-2 text-sm font-black leading-6 transition-colors group-hover:text-brand-300">{p.title}</b>
                  <span className="mt-2 line-clamp-2 text-[11px] leading-5.5 tdim">{p.excerpt}</span>
                  <span className="mt-auto flex items-center justify-between pt-3 text-[11px] font-bold text-brand-300">
                    <span className="flex items-center gap-1.5">
                      <I className="size-3.5" /> {p.tag}
                    </span>
                    <span className="inline-flex items-center gap-1 transition-all group-hover:gap-2.5">
                      بخوان <ArrowRight className="size-3.5" />
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-[11px] tfaint">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          فقط راهنمای واقعی درباره کفپوش چرمی گلدوزی — بدون محتوای نامرتبط.
        </p>
      </div>
    </>
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
        <img src={post.image} alt="" className="mt-7 w-full rounded-[2rem] border bd object-cover" style={{ maxHeight: 420 }} />
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
