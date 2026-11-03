import { rateLimit, requestClientKey } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { products, reviews } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = rateLimit(`reviews:${requestClientKey(req)}`, 5, 600000);
  if (!limit.allowed) return Response.json({ error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  await ensureDb();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productId = Number(body?.productId);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const city = typeof body?.city === "string" ? body.city.trim().slice(0, 40) : "";
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 1000) : "";
  const rating = Math.round(Number(body?.rating));

  if (!Number.isInteger(productId) || productId <= 0) return Response.json({ error: "محصول نامعتبر است" }, { status: 400 });
  if (name.length < 2) return Response.json({ error: "نام خود را وارد کنید" }, { status: 400 });
  if (comment.length < 10) return Response.json({ error: "متن نظر باید حداقل ۱۰ کاراکتر باشد" }, { status: 400 });
  if (!(rating >= 1 && rating <= 5)) return Response.json({ error: "امتیاز نامعتبر است" }, { status: 400 });

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return Response.json({ error: "محصول پیدا نشد" }, { status: 404 });

  await db.insert(reviews).values({ productId, name, city, rating, comment, isApproved: false });
  return Response.json({ ok: true });
}
