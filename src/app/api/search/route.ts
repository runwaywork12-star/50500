import { searchProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) return Response.json({ items: [], total: 0 });
  const { items, total } = await searchProducts({ q, sort: "popular" }, 8);
  return Response.json({
    items: items.map(({ id, slug, title, price, image, categoryName }) => ({ id, slug, title, price, image, categoryName })),
    total,
  });
}
