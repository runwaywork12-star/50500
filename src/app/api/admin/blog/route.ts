import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { blogPosts, type BlogContentBlock } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { BLOG_POSTS } from "@/lib/blog-seeds";
export const dynamic = "force-dynamic";
const bad = (error: string, status=400) => Response.json({ error }, { status });
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0,max) : "";
function parseBlocks(value: unknown): BlogContentBlock[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const out: BlogContentBlock[] = [];
  for (const block of value) {
    if (!block || typeof block !== "object") return null;
    const row = block as Record<string,unknown>;
    if ((row.type === "p" || row.type === "h2") && typeof row.text === "string") out.push({ type: row.type, text: row.text.trim().slice(0,8000) });
    else if (row.type === "ul" && Array.isArray(row.items) && row.items.length <= 50 && row.items.every((x) => typeof x === "string")) out.push({ type: "ul", items: row.items.map((x) => String(x).trim().slice(0,500)).filter(Boolean) });
    else return null;
  }
  return out;
}
async function seed() {
  await db.insert(blogPosts).values(BLOG_POSTS.map((p) => ({ slug:p.slug,title:p.title,excerpt:p.excerpt,cover:p.cover,date:p.date,readTime:p.readTime,tag:p.tag,blocks:p.blocks as BlogContentBlock[],status:"published",seoTitle:p.title,seoDescription:p.excerpt }))).onConflictDoNothing({target:blogPosts.slug});
}
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز",401);
  await ensureDb(); await seed();
  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt),asc(blogPosts.id));
  return Response.json(rows);
}
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز",401);
  await ensureDb();
  const body = (await req.json().catch(()=>null)) as Record<string,unknown>|null;
  if (!body) return bad("درخواست نامعتبر است");
  const slug=clean(body.slug,100).toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  const title=clean(body.title,180), excerpt=clean(body.excerpt,600), cover=clean(body.cover,1000)||"/api/site-image/mat", tag=clean(body.tag,60)||"مقاله";
  const readTime=Math.max(1,Math.min(60,Math.floor(Number(body.readTime)||4)));
  const blocks=parseBlocks(body.blocks);
  const status=body.status === "draft" ? "draft" : "published";
  if (slug.length<3 || title.length<3 || !blocks || blocks.length===0) return bad("شناسه، عنوان و محتوای معتبر مقاله الزامی است");
  try {
    const [row]=await db.insert(blogPosts).values({slug,title,excerpt,cover,tag,readTime,date:clean(body.date,80)||new Date().toLocaleDateString("fa-IR"),blocks,status,seoTitle:clean(body.seoTitle,180)||title,seoDescription:clean(body.seoDescription,300)||excerpt}).returning();
    return Response.json({ok:true,post:row});
  } catch { return bad("این نشانی مقاله قبلاً استفاده شده است",409); }
}
export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز",401);
  await ensureDb();
  const url=new URL(req.url), slug=clean(url.searchParams.get("slug"),100);
  const body=(await req.json().catch(()=>null)) as Record<string,unknown>|null;
  if (!slug||!body) return bad("شناسه مقاله یا اطلاعات ویرایش معتبر نیست");
  const patch: Partial<typeof blogPosts.$inferInsert> = { updatedAt:new Date() };
  if (body.title!==undefined) patch.title=clean(body.title,180);
  if (body.excerpt!==undefined) patch.excerpt=clean(body.excerpt,600);
  if (body.cover!==undefined) patch.cover=clean(body.cover,1000);
  if (body.tag!==undefined) patch.tag=clean(body.tag,60);
  if (body.date!==undefined) patch.date=clean(body.date,80);
  if (body.readTime!==undefined) patch.readTime=Math.max(1,Math.min(60,Math.floor(Number(body.readTime)||4)));
  if (body.status!==undefined) patch.status=body.status==="draft"?"draft":"published";
  if (body.blocks!==undefined) { const blocks=parseBlocks(body.blocks); if (!blocks) return bad("ساختار متن مقاله معتبر نیست"); patch.blocks=blocks; }
  if (body.seoTitle!==undefined) patch.seoTitle=clean(body.seoTitle,180);
  if (body.seoDescription!==undefined) patch.seoDescription=clean(body.seoDescription,300);
  await db.update(blogPosts).set(patch).where(eq(blogPosts.slug,slug));
  return Response.json({ok:true});
}
export async function DELETE(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز",401);
  await ensureDb();
  const slug=clean(new URL(req.url).searchParams.get("slug"),100);
  if (!slug) return bad("شناسه مقاله نامعتبر است");
  await db.update(blogPosts).set({status:"draft",updatedAt:new Date()}).where(eq(blogPosts.slug,slug));
  return Response.json({ok:true});
}
