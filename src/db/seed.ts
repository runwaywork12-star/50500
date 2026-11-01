import { db } from "./index";
import { brands, carModels, categories, coupons, orderItems, orders, products, reviews } from "./schema";
import { ACCESSORIES, CATEGORY_DEFS, DEMO_CUSTOMERS, DEMO_ORDER_CODES, FEATURED, REVIEW_POOL, SEED_BRANDS } from "./seed-data";
import { LEATHER_COLORS, OPTION_LABELS, THREAD_COLORS } from "@/lib/options";

function rand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const round100k = (n: number) => Math.round(n / 100000) * 100000;
const pick = <T,>(list: T[], seed: string): T => list[Math.floor(rand(seed) * list.length)] ?? list[0];

export async function seedDatabase() {
  await db.transaction(async (tx) => {
    const catRows = await tx
      .insert(categories)
      .values(
        CATEGORY_DEFS.map((c, i) => ({
          slug: c.slug,
          name: c.name,
          shortName: c.shortName,
          description: c.description,
          image: c.image,
          optionsType: c.optionsType,
          sortOrder: i,
        })),
      )
      .returning();
    const catId = new Map(catRows.map((c) => [c.slug, c.id]));
    const rows: (typeof products.$inferInsert)[] = [];

    for (const [bi, b] of SEED_BRANDS.entries()) {
      const [brandRow] = await tx
        .insert(brands)
        .values({ slug: b.slug, name: b.name, nameEn: b.nameEn, sortOrder: bi })
        .returning();
      const modelRows = await tx
        .insert(carModels)
        .values(
          b.models.map(([ms, mn], mi) => ({
            brandId: brandRow.id,
            slug: `${b.slug}-${ms}`,
            name: mn,
            fullName: b.prefix ? `${b.name} ${mn}` : mn,
            sortOrder: mi,
          })),
        )
        .returning();

      modelRows.forEach((m, mi) => {
        const pop = b.models[mi]?.[2] ?? 5;
        for (const def of CATEGORY_DEFS) {
          if (!def.perModel) continue;
          const slug = `${def.slugPrefix}-${m.slug}`;
          const r = rand(slug);
          const price = def.prices[b.tier - 1];
          rows.push({
            slug,
            title: def.title(m.fullName),
            categoryId: catId.get(def.slug)!,
            brandId: brandRow.id,
            modelId: m.id,
            price,
            comparePrice: r < 0.34 ? round100k(price * (1.12 + r * 0.45)) : null,
            stock: 15 + Math.floor(rand(slug + "st") * 120),
            images: (() => {
              const k = rows.length % def.images.length;
              return [...def.images.slice(k), ...def.images.slice(0, k)];
            })(),
            description: def.body(m.fullName),
            specs: def.specs,
            rating: Math.round((4.5 + rand(slug + "rt") * 0.5) * 10) / 10,
            ratingCount: Math.floor(8 + rand(slug + "rc") * 34 * pop),
            salesCount: Math.floor(pop * 150 + rand(slug + "sc") * 380),
            deliveryDays: def.delivery,
            isFeatured: FEATURED.has(slug),
          });
        }
      });
    }

    const accessoryRows: (typeof products.$inferInsert)[] = ACCESSORIES.map((a) => ({
      slug: a.slug,
      title: a.title,
      categoryId: catId.get("accessories")!,
      brandId: null,
      modelId: null,
      price: a.price,
      comparePrice: a.comparePrice,
      stock: a.stock,
      images: [a.image],
      description: a.body,
      specs: a.specs,
      rating: a.rating,
      ratingCount: a.ratingCount,
      salesCount: a.salesCount,
      deliveryDays: a.delivery,
      isFeatured: a.featured,
    }));
    rows.push(...accessoryRows);

    const inserted: { id: number; slug: string; title: string; price: number; images: string[] }[] = [];
    for (let i = 0; i < rows.length; i += 80) {
      const chunk = await tx
        .insert(products)
        .values(rows.slice(i, i + 80))
        .returning({ id: products.id, slug: products.slug, title: products.title, price: products.price, images: products.images });
      inserted.push(...chunk);
    }

    const now = Date.now();
    const featured = inserted.filter((p) => FEATURED.has(p.slug));
    const reviewRows: (typeof reviews.$inferInsert)[] = [];
    let k = 0;
    for (const p of featured) {
      for (let j = 0; j < 3; j++) {
        const rv = REVIEW_POOL[k % REVIEW_POOL.length];
        k++;
        reviewRows.push({
          productId: p.id,
          name: rv.name,
          city: rv.city,
          rating: rv.rating,
          comment: rv.comment,
          isApproved: true,
          createdAt: new Date(now - (k * 31 + 5) * 3600_000),
        });
      }
    }
    if (featured[0]) {
      reviewRows.push(
        { productId: featured[0].id, name: "رامین ک.", city: "کرج", rating: 5, comment: "امروز تحویل گرفتم، فوق‌العاده است. برای ماشین دومم هم می‌خواهم سفارش بدهم؛ تخفیف خرید مجدد دارید؟", isApproved: false },
        { productId: featured[1]?.id ?? featured[0].id, name: "شیوا م.", city: "همدان", rating: 4, comment: "کیفیت عالی، ارسال هم سریع بود. ممنون از تیم ۵۰۵۰۰.", isApproved: false },
      );
    }
    if (reviewRows.length) await tx.insert(reviews).values(reviewRows);

    await tx
      .insert(coupons)
      .values([
        { code: "50500", percent: 10, maxDiscount: 1500000, minOrder: 0 },
        { code: "WELCOME", percent: 5, maxDiscount: 500000, minOrder: 0 },
        { code: "VIP20", percent: 20, maxDiscount: 4000000, minOrder: 15000000 },
      ])
      .onConflictDoNothing({ target: coupons.code });

    const pool = inserted.length ? inserted : [];
    for (const [i, c] of DEMO_CUSTOMERS.entries()) {
      if (!pool.length) break;
      const p1 = pick(pool, c.name);
      const items = [{ p: p1, qty: 1 }];
      if (i % 3 === 0) {
        const p2 = pick(pool.filter((p) => p.id !== p1.id), c.name + "2");
        if (p2) items.push({ p: p2, qty: 1 });
      }
      const subtotal = items.reduce((s, it) => s + it.p.price * it.qty, 0);
      const shippingCost = c.shipping === "post" && subtotal < 5000000 ? 120000 : 0;
      const createdAt = new Date(now - c.hoursAgo * 3600_000);
      const [o] = await tx
        .insert(orders)
        .values({
          code: DEMO_ORDER_CODES[i],
          customerName: c.name,
          phone: c.phone,
          province: c.province,
          city: c.city,
          address: c.address,
          shippingMethod: c.shipping,
          paymentMethod: c.payment === "cod" ? "cod" : "online",
          paymentStatus: c.payment,
          status: c.status,
          subtotal,
          discount: 0,
          shippingCost,
          total: subtotal + shippingCost,
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(
        items.map((it, n) => {
          const leather = pick(LEATHER_COLORS, `${c.name}-l${n}`);
          const thread = pick(THREAD_COLORS, `${c.name}-t${n}`);
          return {
            orderId: o.id,
            productId: it.p.id,
            title: it.p.title,
            image: it.p.images[0] ?? "",
            unitPrice: it.p.price,
            quantity: it.qty,
            options: [
              { key: "leather", label: OPTION_LABELS.leather, value: leather.name, hex: leather.hex },
              { key: "thread", label: OPTION_LABELS.thread, value: thread.name, hex: thread.hex },
            ],
          };
        }),
      );
    }
  });
}
