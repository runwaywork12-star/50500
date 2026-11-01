import { searchProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(48, Math.max(1, Number(sp.get("limit")) || 24));
  const { items, total, pages } = await searchProducts(
    {
      q: sp.get("q") ?? undefined,
      category: sp.get("category") ?? undefined,
      brand: sp.get("brand") ?? undefined,
      model: sp.get("model") ?? undefined,
      sort: sp.get("sort") ?? "popular",
      page: Number(sp.get("page")) || 1,
    },
    limit,
  );
  return Response.json({ items, total, pages });
}
