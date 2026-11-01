import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { brands, carModels, categories, orderItems, orders, products, reviews } from "@/db/schema";
import { fa, normalizeFa, toEnDigits } from "./format";
import { CAR_GROUPS, carGroupById, type CarGroup } from "./options";

export type ProductCardData = {
  id: number;
  slug: string;
  title: string;
  price: number;
  comparePrice: number | null;
  image: string;
  rating: number;
  ratingCount: number;
  salesCount: number;
  categoryName: string;
  categorySlug: string;
  optionsType: string;
  brandName: string | null;
  stock: number;
};

const cardFields = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  price: products.price,
  comparePrice: products.comparePrice,
  images: products.images,
  rating: products.rating,
  ratingCount: products.ratingCount,
  salesCount: products.salesCount,
  categoryName: categories.shortName,
  categorySlug: categories.slug,
  optionsType: categories.optionsType,
  brandName: brands.name,
  stock: products.stock,
};

type CardRow = Omit<ProductCardData, "image"> & { images: string[] };

function toCard({ images, ...rest }: CardRow): ProductCardData {
  return { ...rest, image: images?.[0] ?? "/api/site-image/mat" };
}

function cardQuery() {
  return db
    .select(cardFields)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(carModels, eq(products.modelId, carModels.id));
}

export const getCategories = cache(async () => {
  await ensureDb();
  const [rows, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db
      .select({ id: products.categoryId, count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.isActive, true))
      .groupBy(products.categoryId),
  ]);
  const map = new Map(counts.map((c) => [c.id, c.count]));
  return rows.map((c) => ({ ...c, count: map.get(c.id) ?? 0 }));
});

export type CategoryData = Awaited<ReturnType<typeof getCategories>>[number];

export type BrandModel = { id: number; slug: string; name: string; fullName: string };
export type BrandWithModels = {
  id: number;
  slug: string;
  name: string;
  nameEn: string;
  productCount: number;
  models: BrandModel[];
};

export const getBrandsWithModels = cache(async (): Promise<BrandWithModels[]> => {
  await ensureDb();
  const [brandRows, modelRows, counts] = await Promise.all([
    db.select().from(brands).orderBy(asc(brands.sortOrder)),
    db
      .select({
        id: carModels.id,
        brandId: carModels.brandId,
        slug: carModels.slug,
        name: carModels.name,
        fullName: carModels.fullName,
      })
      .from(carModels)
      .orderBy(asc(carModels.sortOrder)),
    db
      .select({ brandId: products.brandId, count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.isActive, true))
      .groupBy(products.brandId),
  ]);
  const countMap = new Map(counts.map((c) => [c.brandId, c.count]));
  return brandRows.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    nameEn: b.nameEn,
    productCount: countMap.get(b.id) ?? 0,
    models: modelRows
      .filter((m) => m.brandId === b.id)
      .map(({ id, slug, name, fullName }) => ({ id, slug, name, fullName })),
  }));
});

export type CarGroupSummary = CarGroup & { brandNames: string[]; modelCount: number; productCount: number };

export function carGroupsFrom(list: BrandWithModels[]): CarGroupSummary[] {
  return CAR_GROUPS.map((g) => {
    const members = list.filter((b) => g.brands.includes(b.slug));
    return {
      ...g,
      brandNames: members.map((b) => b.name),
      modelCount: members.reduce((s, b) => s + b.models.length, 0),
      productCount: members.reduce((s, b) => s + b.productCount, 0),
    };
  });
}

export type ProductFilters = {
  q?: string;
  category?: string;
  group?: string;
  brand?: string;
  model?: string;
  min?: number;
  max?: number;
  sort?: string;
  page?: number;
  discounted?: boolean;
};

function searchCondition(q: string): SQL | undefined {
  const tokens = normalizeFa(q)
    .replace(/[%_\\]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 6);
  if (!tokens.length) return undefined;
  return and(
    ...tokens.map((token) => {
      const variants = Array.from(new Set([token, fa(token), toEnDigits(token)]));
      return or(
        ...variants.flatMap((v) => {
          const like = `%${v}%`;
          return [
            ilike(products.title, like),
            ilike(products.slug, like),
            ilike(categories.name, like),
            ilike(brands.name, like),
            ilike(brands.nameEn, like),
          ];
        }),
      );
    }),
  );
}

const SORTS: Record<string, SQL[]> = {
  popular: [desc(products.salesCount), desc(products.id)],
  newest: [desc(products.createdAt), desc(products.id)],
  cheap: [asc(products.price), asc(products.id)],
  expensive: [desc(products.price), desc(products.id)],
  rating: [desc(products.rating), desc(products.ratingCount)],
  discount: [sql`coalesce(${products.comparePrice} - ${products.price}, 0) desc`, desc(products.salesCount)],
};

export async function searchProducts(f: ProductFilters, perPage = 24) {
  await ensureDb();
  const conds: (SQL | undefined)[] = [eq(products.isActive, true)];
  if (f.category) conds.push(eq(categories.slug, f.category));
  const group = carGroupById(f.group);
  if (group) conds.push(inArray(brands.slug, group.brands));
  if (f.brand) conds.push(eq(brands.slug, f.brand));
  if (f.model) conds.push(eq(carModels.slug, f.model));
  if (f.min) conds.push(gte(products.price, f.min));
  if (f.max) conds.push(lte(products.price, f.max));
  if (f.discounted) conds.push(isNotNull(products.comparePrice));
  if (f.q) conds.push(searchCondition(f.q));
  const where = and(...conds);
  const page = Math.max(1, f.page ?? 1);
  const order = SORTS[f.sort ?? "popular"] ?? SORTS.popular;

  const [rows, totalRows] = await Promise.all([
    cardQuery()
      .where(where)
      .orderBy(...order)
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.modelId, carModels.id))
      .where(where),
  ]);
  const total = totalRows[0]?.count ?? 0;
  return { items: rows.map(toCard), total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getProductBySlug(slug: string) {
  await ensureDb();
  const [row] = await db
    .select({ product: products, category: categories, brand: brands, model: carModels })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(carModels, eq(products.modelId, carModels.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function getRelatedProducts(p: { id: number; brandId: number | null; categoryId: number }) {
  await ensureDb();
  const sameBrand = p.brandId
    ? await cardQuery()
        .where(and(eq(products.brandId, p.brandId), ne(products.id, p.id), eq(products.isActive, true)))
        .orderBy(desc(products.salesCount))
        .limit(4)
    : [];
  const exclude = [p.id, ...sameBrand.map((r) => r.id)];
  const sameCategory = await cardQuery()
    .where(and(eq(products.categoryId, p.categoryId), notInArray(products.id, exclude), eq(products.isActive, true)))
    .orderBy(desc(products.salesCount))
    .limit(8 - sameBrand.length);
  return [...sameBrand, ...sameCategory].map(toCard);
}

export async function getFeatured(limit = 10) {
  await ensureDb();
  const rows = await cardQuery()
    .where(and(eq(products.isFeatured, true), eq(products.isActive, true)))
    .orderBy(desc(products.salesCount))
    .limit(limit);
  return rows.map(toCard);
}

export async function getBestSellers(limit = 8) {
  await ensureDb();
  const rows = await cardQuery().where(eq(products.isActive, true)).orderBy(desc(products.salesCount)).limit(limit);
  return rows.map(toCard);
}

export async function getDiscounted(limit = 8) {
  await ensureDb();
  const rows = await cardQuery()
    .where(and(eq(products.isActive, true), isNotNull(products.comparePrice)))
    .orderBy(sql`(${products.comparePrice} - ${products.price})::float / ${products.comparePrice} desc`, desc(products.salesCount))
    .limit(limit);
  return rows.map(toCard);
}

export async function getTestimonials(limit = 8) {
  await ensureDb();
  const rows = await db
    .select({
      id: reviews.id,
      name: reviews.name,
      city: reviews.city,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      productTitle: products.title,
      productSlug: products.slug,
    })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .where(and(eq(reviews.isApproved, true), gte(reviews.rating, 4)))
    .orderBy(desc(reviews.createdAt))
    .limit(60);
  const seen = new Set<string>();
  return rows
    .filter((r) => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      return true;
    })
    .slice(0, limit);
}

export type Testimonial = Awaited<ReturnType<typeof getTestimonials>>[number];

export async function getApprovedReviews(productId: number) {
  await ensureDb();
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(30);
}

export async function getOrderByCode(code: string) {
  await ensureDb();
  const [order] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { order, items };
}

export type OrderWithItems = NonNullable<Awaited<ReturnType<typeof getOrderByCode>>>;
