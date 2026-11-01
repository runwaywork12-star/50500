import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { blogPosts, type BlogContentBlock } from "@/db/schema";
import { BLOG_POSTS as SEED_POSTS, type BlogPost } from "./blog-seeds";

export type { BlogPost, BlogBlock } from "./blog-seeds";

async function ensureSeedPosts() {
  await ensureDb();
  if (!SEED_POSTS.length) return;
  await db.insert(blogPosts).values(SEED_POSTS.map((post) => ({
    slug: post.slug, title: post.title, excerpt: post.excerpt, cover: post.cover, date: post.date,
    readTime: post.readTime, tag: post.tag, blocks: post.blocks as BlogContentBlock[], status: "published",
    seoTitle: post.title, seoDescription: post.excerpt,
  }))).onConflictDoNothing({ target: blogPosts.slug });
}

function toPost(row: typeof blogPosts.$inferSelect): BlogPost {
  return { slug: row.slug, title: row.title, excerpt: row.excerpt, cover: row.cover, date: row.date,
    readTime: row.readTime, tag: row.tag, blocks: row.blocks as BlogPost["blocks"] };
}

export async function getBlogPosts(includeDrafts = false): Promise<BlogPost[]> {
  await ensureSeedPosts();
  const rows = await db.select().from(blogPosts)
    .where(includeDrafts ? undefined : eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.updatedAt), asc(blogPosts.id));
  return rows.map(toPost);
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  await ensureSeedPosts();
  const [row] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  if (!row || row.status !== "published") return undefined;
  return toPost(row);
}
