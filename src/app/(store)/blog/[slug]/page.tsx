import type { Metadata } from "next";
import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/ui";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { fa } from "@/lib/format";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  return { title: post?.title ?? "مقاله یافت نشد", description: post?.excerpt };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [post, allPosts] = await Promise.all([getBlogPost(slug), getBlogPosts()]);
  if (!post) notFound();
  const others = allPosts.filter((p) => p.slug !== post.slug).slice(0, 4);

  return (
    <article className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/blog", label: "مجله" }, { label: post.title }]} />
        <span className="chip chip-active mt-6">{post.tag}</span>
        <h1 className="mt-4 text-3xl font-black leading-[1.6] sm:text-4xl">{post.title}</h1>
        <p className="mt-4 flex items-center gap-2 text-sm tdim">
          <Clock className="size-4" /> {post.date} · {fa(post.readTime)} دقیقه مطالعه
        </p>
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[2rem] border bd">
          <Image src={post.cover} alt={post.title} fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
        </div>
        <div className="prose-fa mt-10">
          {post.blocks.map((b, i) =>
            b.type === "h2" ? (
              <h2 key={i}>{b.text}</h2>
            ) : b.type === "ul" ? (
              <ul key={i}>
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{b.text}</p>
            ),
          )}
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {others.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="surface group flex items-center gap-4 rounded-2xl p-4 transition hover:border-brand-500/30">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                <Image src={p.cover} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <span className="line-clamp-2 flex-1 text-sm font-bold leading-7 group-hover:text-brand-300">{p.title}</span>
              <ArrowLeft className="size-4 shrink-0 tdim" />
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
