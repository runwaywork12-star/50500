import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type ProductSpec = { label: string; value: string };
export type OrderItemOption = { key: string; label: string; value: string; hex?: string };

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const carModels = pgTable(
  "car_models",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("car_models_brand_idx").on(t.brandId)],
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  description: text("description").notNull().default(""),
  image: text("image").notNull(),
  optionsType: text("options_type").notNull().default("none"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brandId: integer("brand_id").references(() => brands.id, { onDelete: "set null" }),
    modelId: integer("model_id").references(() => carModels.id, { onDelete: "set null" }),
    price: integer("price").notNull(),
    comparePrice: integer("compare_price"),
    costPrice: integer("cost_price").notNull().default(0),
    stock: integer("stock").notNull().default(100),
    images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    description: text("description").notNull().default(""),
    specs: jsonb("specs").$type<ProductSpec[]>().notNull().default(sql`'[]'::jsonb`),
    rating: real("rating").notNull().default(4.8),
    ratingCount: integer("rating_count").notNull().default(0),
    salesCount: integer("sales_count").notNull().default(0),
    deliveryDays: text("delivery_days").notNull().default(""),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_brand_idx").on(t.brandId),
    index("products_model_idx").on(t.modelId),
  ],
);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  postalCode: text("postal_code").notNull().default(""),
  notes: text("notes").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  trackingNumber: text("tracking_number").notNull().default(""),
  shippingMethod: text("shipping_method").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  status: text("status").notNull().default("pending"),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  shippingCost: integer("shipping_cost").notNull().default(0),
  total: integer("total").notNull(),
  couponCode: text("coupon_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    image: text("image").notNull().default(""),
    unitPrice: integer("unit_price").notNull(),
    // Snapshot of product cost at checkout; avoids rewriting historic margin when product cost changes.
    unitCost: integer("unit_cost").notNull().default(0),
    quantity: integer("quantity").notNull(),
    options: jsonb("options").$type<OrderItemOption[]>().notNull().default(sql`'[]'::jsonb`),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    city: text("city").notNull().default(""),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    isApproved: boolean("is_approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_product_idx").on(t.productId)],
);

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  percent: integer("percent").notNull(),
  maxDiscount: integer("max_discount"),
  minOrder: integer("min_order").notNull().default(0),
  maxUses: integer("max_uses"),
  usageCount: integer("usage_count").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
});


export type BlogContentBlock =
  | { type: "p" | "h2"; text: string }
  | { type: "ul"; items: string[] };

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    cover: text("cover").notNull().default("/api/site-image/mat"),
    date: text("date").notNull().default(""),
    readTime: integer("read_time").notNull().default(4),
    tag: text("tag").notNull().default("مقاله"),
    blocks: jsonb("blocks").$type<BlogContentBlock[]>().notNull().default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("published"),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blog_posts_status_idx").on(t.status), index("blog_posts_updated_idx").on(t.updatedAt)],
);

export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Site-wide editable content: texts, images, hero slides, gateways, contact info. */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** API tokens for AI agents (ChatGPT / Claude) and integrations. */
export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Audit log of agent/integration API calls. */
export const apiAudit = pgTable(
  "api_audit",
  {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").references(() => apiTokens.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("api_audit_created_idx").on(t.createdAt), index("api_audit_token_idx").on(t.tokenId)],
);

/** Lightweight first-party visitor analytics (page views). */
export const pageViews = pgTable(
  "page_views",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    path: text("path").notNull(),
    referrer: text("referrer").notNull().default(""),
    utmSource: text("utm_source").notNull().default(""),
    utmMedium: text("utm_medium").notNull().default(""),
    utmCampaign: text("utm_campaign").notNull().default(""),
    device: text("device").notNull().default(""),
    browser: text("browser").notNull().default(""),
    os: text("os").notNull().default(""),
    country: text("country").notNull().default(""),
    language: text("language").notNull().default(""),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("page_views_created_idx").on(t.createdAt), index("page_views_path_idx").on(t.path)],
);

/** Online payment attempts through any gateway. */
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderCode: text("order_code").notNull(),
    gateway: text("gateway").notNull(),
    amount: integer("amount").notNull(),
    authority: text("authority").notNull().default(""),
    refId: text("ref_id").notNull().default(""),
    cardPan: text("card_pan").notNull().default(""),
    status: text("status").notNull().default("pending"),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_status_idx").on(t.status)],
);

/** History of AI assistant jobs (keywords, descriptions, meta, drafts). */
export const aiJobs = pgTable("ai_jobs", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  input: text("input").notNull().default(""),
  output: text("output").notNull().default(""),
  provider: text("provider").notNull().default("offline"),
  status: text("status").notNull().default("done"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Manual income/expense ledger. Order revenue stays derived from verified orders to avoid double entry. */
export const financeEntries = pgTable(
  "finance_entries",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(), // income | expense
    category: text("category").notNull(),
    title: text("title").notNull(),
    amount: integer("amount").notNull(),
    reference: text("reference").notNull().default(""),
    note: text("note").notNull().default(""),
    happenedAt: timestamp("happened_at", { withTimezone: true }).notNull().defaultNow(),
    isVoided: boolean("is_voided").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
  },
  (t) => [index("finance_entries_happened_idx").on(t.happenedAt), index("finance_entries_type_idx").on(t.type)],
);

/** Tracks edits to public site settings for accountability and recovery. */
export const siteSettingHistory = pgTable(
  "site_setting_history",
  {
    id: serial("id").primaryKey(),
    settingKey: text("setting_key").notNull(),
    previousValue: text("previous_value").notNull().default(""),
    nextValue: text("next_value").notNull().default(""),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("site_setting_history_key_idx").on(t.settingKey), index("site_setting_history_changed_idx").on(t.changedAt)],
);
