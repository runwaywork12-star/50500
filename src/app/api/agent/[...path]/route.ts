import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { brands, carModels, categories, orderItems, orders, products } from "@/db/schema";
import { AGENT_SCOPES, auditApi, hasScope, verifyAgentRequest, type AgentToken } from "@/lib/agent-auth";
import { runAiJob, type AiTask } from "@/lib/ai";
import { getVisitorStats } from "@/lib/analytics";
import { getAdminStats } from "@/lib/admin-queries";
import { getSettings, setSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ path?: string[] }> };

const json = (data: unknown, status = 200) => Response.json(data, { status });
const bad = (error: string, status = 400) => Response.json({ error }, { status });

function openApiSpec(baseUrl: string) {
  const bearer = { AgentToken: [] };
  return {
    openapi: "3.1.0",
    info: { title: "Store 50500 Agent API", version: "1.0.0", description: "Manage the 50500 car-mat store: catalog, orders, content, stats and AI. Auth: `Authorization: Bearer <token>`." },
    servers: [{ url: `${baseUrl}/api/agent` }],
    components: {
      securitySchemes: { AgentToken: { type: "http", scheme: "bearer", description: "API token created in the admin panel" } },
    },
    security: [bearer],
    paths: {
      "/health": { get: { summary: "Health check (no auth)", responses: { "200": { description: "ok" } } } },
      "/v1/products": {
        get: {
          summary: "List products", security: [bearer],
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "brand", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "perPage", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { "200": { description: "paginated products" } },
        },
        post: {
          summary: "Create product (scope catalog:write)", security: [bearer],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "created" } },
        },
      },
      "/v1/products/{id}": {
        get: { summary: "Product detail", security: [bearer], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "product" } } },
        patch: { summary: "Update product (scope catalog:write)", security: [bearer], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "updated" } } },
      },
      "/v1/brands": { get: { summary: "Brands + models (scope catalog:read)", security: [bearer], responses: { "200": { description: "brands" } } } },
      "/v1/orders": {
        get: { summary: "List orders", security: [bearer], parameters: [{ name: "status", in: "query", schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer", default: 1 } }], responses: { "200": { description: "orders" } } },
      },
      "/v1/orders/{code}": {
        get: { summary: "Order detail", security: [bearer], parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "order" } } },
        patch: { summary: "Update order status (scope orders:write)", security: [bearer], parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "updated" } } },
      },
      "/v1/settings": {
        get: { summary: "Read site settings (scope content:read)", security: [bearer], responses: { "200": { description: "settings" } } },
        put: { summary: "Update site settings (scope content:write)", security: [bearer], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "saved" } } },
      },
      "/v1/stats": {
        get: { summary: "Sales + visitor stats (scope stats:read)", security: [bearer], responses: { "200": { description: "stats" } } },
      },
      "/v1/ai": {
        post: { summary: "Run AI job: keywords|description|meta|blog (scope content:write)", security: [bearer], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "result" } } },
      },
    },
  };
}

async function productsList(search: URLSearchParams) {
  const q = (search.get("q") || "").slice(0, 80);
  const category = search.get("category") || "";
  const brand = search.get("brand") || "";
  const page = Math.max(1, Number(search.get("page")) || 1);
  const perPage = Math.min(50, Math.max(1, Number(search.get("perPage")) || 20));
  const conds = [];
  if (q) conds.push(or(ilike(products.title, `%${q}%`), ilike(products.slug, `%${q}%`)));
  if (category) conds.push(eq(categories.slug, category));
  if (brand) conds.push(eq(brands.slug, brand));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, count] = await Promise.all([
    db.select({
      id: products.id, slug: products.slug, title: products.title, price: products.price,
      comparePrice: products.comparePrice, stock: products.stock, images: products.images,
      rating: products.rating, salesCount: products.salesCount, isFeatured: products.isFeatured,
      isActive: products.isActive, categoryName: categories.shortName, brandName: brands.name,
    })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(where).orderBy(desc(products.id)).limit(perPage).offset((page - 1) * perPage),
    db.select({ c: sql<number>`count(*)::int` }).from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id)).where(where),
  ]);
  return { items: rows, page, perPage, total: count[0]?.c ?? 0 };
}

async function productDetail(idOrSlug: string) {
  const id = Number(idOrSlug);
  const cond = Number.isInteger(id) && id > 0 ? eq(products.id, id) : eq(products.slug, idOrSlug.slice(0, 200));
  const [p] = await db.select().from(products).where(cond).limit(1);
  return p ?? null;
}

async function handle(req: Request, segments: string[]) {
  const started = Date.now();
  const fullPath = `/api/agent/${segments.join("/")}`;
  if (segments.length === 1 && segments[0] === "health") return json({ ok: true, service: "store50500-agent", time: new Date().toISOString() });
  if (segments.length === 1 && segments[0] === "openapi.json") {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return json(openApiSpec(`${proto}://${host}`));
  }

  const auth = await verifyAgentRequest(req);
  if ("error" in auth) {
    auditApi(null, req.method, fullPath, auth.status, started);
    return bad(auth.error, auth.status);
  }
  const token: AgentToken = auth.token;
  const need = (scope: string) => {
    if (!hasScope(token, scope)) return bad(`این توکن دسترسی «${scope}» ندارد`, 403);
    return null;
  };
  const done = (res: Response) => {
    auditApi(token.id, req.method, fullPath, res.status, started);
    return res;
  };

  const [v1, resource, identifier] = segments;
  if (v1 !== "v1") return done(bad("نسخه نامعتبر است (فقط v1)", 404));

  if (resource === "products") {
    if (req.method === "GET" && !identifier) {
      const denied = need("catalog:read");
      if (denied) return done(denied);
      return done(json(await productsList(new URL(req.url).searchParams)));
    }
    if (req.method === "GET" && identifier) {
      const denied = need("catalog:read");
      if (denied) return done(denied);
      const p = await productDetail(identifier);
      if (!p) return done(bad("محصول پیدا نشد", 404));
      return done(json(p));
    }
    if (req.method === "POST" && !identifier) {
      const denied = need("catalog:write");
      if (denied) return done(denied);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
      const price = Math.floor(Number(body.price));
      if (title.length < 3) return done(bad("title الزامی است"));
      if (!(price > 0)) return done(bad("price نامعتبر است"));
      let categoryId = Number(body.categoryId) || 0;
      if (!categoryId && typeof body.categorySlug === "string") {
        const [c] = await db.select().from(categories).where(eq(categories.slug, body.categorySlug)).limit(1);
        if (c) categoryId = c.id;
      }
      if (!categoryId) return done(bad("categoryId یا categorySlug الزامی است"));
      const [created] = await db.insert(products).values({
        slug: `agent-${Date.now().toString(36)}`,
        title, categoryId, price, comparePrice: null,
        stock: Math.max(0, Math.floor(Number(body.stock ?? 100))),
        images: Array.isArray(body.images) ? body.images.filter((x): x is string => typeof x === "string").slice(0, 8) : [],
        description: typeof body.description === "string" ? body.description.slice(0, 8000) : "",
        specs: [], isFeatured: body.isFeatured === true,
      }).returning();
      return done(json(created));
    }
    if (req.method === "PATCH" && identifier) {
      const denied = need("catalog:write");
      if (denied) return done(denied);
      const p = await productDetail(identifier);
      if (!p) return done(bad("محصول پیدا نشد", 404));
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const patch: Partial<typeof products.$inferInsert> = {};
      if (body.price !== undefined) {
        const n = Math.floor(Number(body.price));
        if (!(n > 0)) return done(bad("price نامعتبر است"));
        patch.price = n;
      }
      if (body.comparePrice !== undefined) {
        const n = body.comparePrice === null ? null : Math.floor(Number(body.comparePrice));
        patch.comparePrice = n && n > 0 ? n : null;
      }
      if (body.stock !== undefined) {
        const n = Math.floor(Number(body.stock));
        if (!(n >= 0)) return done(bad("stock نامعتبر است"));
        patch.stock = n;
      }
      if (body.costPrice !== undefined) {
        const n = Math.floor(Number(body.costPrice));
        if (!(n >= 0)) return done(bad("costPrice نامعتبر است"));
        patch.costPrice = n;
      }
      if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
      if (typeof body.isFeatured === "boolean") patch.isFeatured = body.isFeatured;
      if (typeof body.title === "string" && body.title.trim().length >= 3) patch.title = body.title.trim().slice(0, 200);
      if (typeof body.description === "string") patch.description = body.description.slice(0, 8000);
      if (Object.keys(patch).length) await db.update(products).set(patch).where(eq(products.id, p.id));
      return done(json(await productDetail(String(p.id))));
    }
    return done(bad("متد پشتیبانی نمی‌شود", 405));
  }

  if (resource === "brands" && req.method === "GET") {
    const denied = need("catalog:read");
    if (denied) return done(denied);
    const [bRows, mRows] = await Promise.all([
      db.select().from(brands).orderBy(brands.sortOrder),
      db.select().from(carModels).orderBy(carModels.sortOrder),
    ]);
    return done(json(bRows.map((b) => ({ ...b, models: mRows.filter((m) => m.brandId === b.id) }))));
  }

  if (resource === "orders") {
    if (req.method === "GET" && !identifier) {
      const denied = need("orders:read");
      if (denied) return done(denied);
      const search = new URL(req.url).searchParams;
      const status = search.get("status") || "";
      const page = Math.max(1, Number(search.get("page")) || 1);
      const perPage = 20;
      const where = status ? eq(orders.status, status) : undefined;
      const [rows, count] = await Promise.all([
        db.select().from(orders).where(where).orderBy(desc(orders.id)).limit(perPage).offset((page - 1) * perPage),
        db.select({ c: sql<number>`count(*)::int` }).from(orders).where(where),
      ]);
      return done(json({ items: rows, page, perPage, total: count[0]?.c ?? 0 }));
    }
    if (identifier) {
      const [order] = await db.select().from(orders).where(eq(orders.code, identifier.slice(0, 20))).limit(1);
      if (!order) return done(bad("سفارش پیدا نشد", 404));
      if (req.method === "GET") {
        const denied = need("orders:read");
        if (denied) return done(denied);
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return done(json({ ...order, items }));
      }
      if (req.method === "PATCH") {
        const denied = need("orders:write");
        if (denied) return done(denied);
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const patch: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
        const statuses = ["pending", "confirmed", "producing", "shipped", "delivered", "cancelled"];
        const payStatuses = ["pending", "paid", "failed", "cod"];
        if (typeof body.status === "string" && statuses.includes(body.status)) patch.status = body.status;
        // Payment status is controlled only by verified gateways or the real admin panel.
        await db.update(orders).set(patch).where(eq(orders.id, order.id));
        const [updated] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
        return done(json(updated));
      }
      return done(bad("متد پشتیبانی نمی‌شود", 405));
    }
  }

  if (resource === "settings" && segments.length === 2) {
    if (req.method === "GET") {
      const denied = need("content:read");
      if (denied) return done(denied);
      const settings = await getSettings();
      const safeSettings = Object.fromEntries(Object.entries(settings).filter(([key]) => !key.startsWith("payments.")));
      return done(json(safeSettings));
    }
    if (req.method === "PUT") {
      const denied = need("content:write");
      if (denied) return done(denied);
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body !== "object") return done(bad("بدنه نامعتبر است"));
      // Agent content scopes cannot alter payment credentials, card details, or gateway toggles.
      const safeBody = Object.fromEntries(Object.entries(body).filter(([key]) => !key.startsWith("payments.")));
      try {
        await setSettings(safeBody as Record<string, string>);
        return done(json({ ok: true }));
      } catch (e) {
        return done(bad(e instanceof Error ? e.message : "خطا در ذخیره تنظیمات"));
      }
    }
    return done(bad("متد پشتیبانی نمی‌شود", 405));
  }

  if (resource === "stats" && req.method === "GET" && segments.length === 2) {
    const denied = need("stats:read");
    if (denied) return done(denied);
    const stats = await getAdminStats();
    const visitors = await getVisitorStats(7);
    return done(json({
      revenue: stats.revenue, orderCount: stats.orderCount, todayCount: stats.todayCount,
      pendingCount: stats.pendingCount, productCount: stats.productCount,
      visitsWeek: visitors.visits, uniquesWeek: visitors.uniques,
      topPages: visitors.topPages.slice(0, 5), referrers: visitors.referrers.slice(0, 5),
    }));
  }

  if (resource === "ai" && req.method === "POST" && segments.length === 2) {
    const denied = need("content:write");
    if (denied) return done(denied);
    const body = (await req.json().catch(() => ({}))) as { task?: string; input?: string };
    if (!["keywords", "description", "meta", "blog"].includes(body.task || "")) return done(bad("task باید یکی از keywords|description|meta|blog باشد"));
    try {
      return done(json(await runAiJob(body.task as AiTask, body.input || "")));
    } catch (e) {
      return done(bad(e instanceof Error ? e.message : "خطای هوش مصنوعی"));
    }
  }

  return done(bad("مسیر نامعتبر است", 404));
}

const _scopes = AGENT_SCOPES;

export async function GET(req: Request, ctx: Ctx) {
  await ensureDb();
  return handle(req, (await ctx.params).path ?? []);
}
export async function POST(req: Request, ctx: Ctx) {
  await ensureDb();
  return handle(req, (await ctx.params).path ?? []);
}
export async function PATCH(req: Request, ctx: Ctx) {
  await ensureDb();
  return handle(req, (await ctx.params).path ?? []);
}
export async function PUT(req: Request, ctx: Ctx) {
  await ensureDb();
  return handle(req, (await ctx.params).path ?? []);
}
export async function DELETE(req: Request, ctx: Ctx) {
  await ensureDb();
  return handle(req, (await ctx.params).path ?? []);
}
