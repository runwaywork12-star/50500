import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { products } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Returns current data for cart products so stale carts can be refreshed. */
export async function POST(req: Request) {
  await ensureDb();
  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? Array.from(new Set(body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))).slice(0, 50)
    : [];
  if (!ids.length) return Response.json({ items: [] });
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      price: products.price,
      comparePrice: products.comparePrice,
      images: products.images,
      stock: products.stock,
    })
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.isActive, true)));
  return Response.json({
    items: rows.map(({ images, ...r }) => ({ ...r, image: images[0] ?? "" })),
  });
}
