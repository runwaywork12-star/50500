/**
 * Build step: export the storefront catalog (generated from the same source the
 * frontend uses) into JSON the server seeds PostgreSQL with. Prices on the server
 * always come from the database — never from the browser.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { getProducts } from "@/lib/catalog";
import { COUPONS, LEATHER_COLORS, SHIPPING_METHODS, THREAD_COLORS } from "@/data/content";

const products = getProducts(true).map((p) => ({
  slug: p.slug,
  title: p.title,
  category: p.category,
  price: p.price,
  comparePrice: p.comparePrice,
  stock: p.stock,
}));

const catalog = {
  products,
  coupons: Object.fromEntries(Object.entries(COUPONS).map(([code, c]) => [code.toUpperCase(), { percent: c.percent, label: c.label }])),
  shipping: SHIPPING_METHODS.map((m) => ({ id: m.id, name: m.name, cost: m.cost, freeOver: m.freeOver })),
  leather: LEATHER_COLORS.map((c) => c.id),
  thread: THREAD_COLORS.map((c) => c.id),
};

mkdirSync("server/generated", { recursive: true });
writeFileSync("server/generated/catalog.json", JSON.stringify(catalog));
console.log(`catalog exported: ${products.length} products, ${Object.keys(catalog.coupons).length} coupons`);
