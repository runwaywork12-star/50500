import postgres from "postgres";
import { config } from "./config";
import catalog from "./generated/catalog.json";
import { hashPassword } from "./security";

export type Catalog = typeof catalog;
export const CATALOG: Catalog = catalog;
export const SEED_PRODUCTS = new Map(catalog.products.map((p) => [p.slug, p]));

export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
});

const SCHEMA = /* sql */ `
create table if not exists users (
  id bigserial primary key,
  name text not null check (length(name) between 2 and 80),
  email text not null,
  phone text not null check (phone ~ '^09[0-9]{9}$'),
  password_hash text not null,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_key on users (lower(email));
create unique index if not exists users_phone_key on users (phone);

create table if not exists admins (
  id bigserial primary key,
  email text not null,
  name text not null,
  password_hash text not null,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  totp_secret_enc text,
  totp_pending_enc text,
  totp_enabled boolean not null default false,
  totp_last_counter bigint not null default -1,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists admins_email_key on admins (lower(email));

create table if not exists sessions (
  id_hash text primary key,
  kind text not null check (kind in ('user', 'admin')),
  subject_id bigint not null,
  expires_at timestamptz not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists sessions_subject_idx on sessions (kind, subject_id);
create index if not exists sessions_expiry_idx on sessions (expires_at);

create table if not exists products (
  slug text primary key,
  title text not null,
  category text not null,
  price int not null check (price >= 0),
  compare_price int check (compare_price is null or compare_price >= 0),
  stock int not null check (stock >= 0),
  active boolean not null default true,
  image text,
  cost int not null default 0 check (cost >= 0),
  updated_at timestamptz not null default now()
);
alter table products add column if not exists body text not null default '';
alter table products add column if not exists brand_name text;
alter table products add column if not exists custom boolean not null default false;
alter table products add column if not exists created_at timestamptz not null default now();


create table if not exists orders (
  id bigserial primary key,
  code text not null unique,
  access_hash text not null,
  user_id bigint references users(id) on delete set null,
  customer jsonb not null,
  phone text not null,
  items jsonb not null,
  subtotal int not null check (subtotal >= 0),
  discount int not null check (discount >= 0),
  shipping int not null check (shipping >= 0),
  total int not null check (total >= 0),
  coupon text,
  shipping_method text not null,
  payment_method text not null check (payment_method in ('online', 'cod', 'card')),
  status text not null default 'pending',
  payment_status text not null default 'pending',
  tracking text,
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_phone_idx on orders (phone);
create index if not exists orders_expiry_idx on orders (expires_at) where payment_status = 'pending';

create table if not exists payments (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  gateway text not null,
  amount int not null check (amount > 0),
  status text not null default 'initiated' check (status in ('initiated', 'paid', 'failed')),
  token_hash text not null unique,
  authority text,
  ref_id text,
  card_pan text,
  raw jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists payments_order_idx on payments (order_id);
-- A bank reference can settle exactly one payment (blocks receipt replay, e.g. SEP RefNum reuse).
create unique index if not exists payments_ref_key on payments (gateway, ref_id) where ref_id is not null;

create table if not exists order_events (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  admin_id bigint,
  kind text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists order_events_idx on order_events (order_id, created_at desc);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by bigint
);

create table if not exists vault (
  key text primary key,
  value_enc text not null,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists media (
  id text primary key,
  name text not null,
  mime text not null,
  size int not null,
  width int not null,
  height int not null,
  alt text not null default '',
  folder text not null default 'عمومی',
  tags jsonb not null default '[]'::jsonb,
  data bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coupons (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,24}$'),
  label text not null default '',
  percent int not null check (percent between 1 and 90),
  min_amount int not null default 0 check (min_amount >= 0),
  max_uses int check (max_uses is null or max_uses >= 1),
  uses int not null default 0 check (uses >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id bigserial primary key,
  slug text not null references products(slug) on delete cascade,
  user_id bigint references users(id) on delete set null,
  name text not null check (length(name) between 2 and 60),
  rating int not null check (rating between 1 and 5),
  comment text not null check (length(comment) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists reviews_slug_idx on reviews (slug, status, created_at desc);
create index if not exists reviews_status_idx on reviews (status, created_at desc);

create table if not exists audit_log (
  id bigserial primary key,
  admin_id bigint,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on audit_log (created_at desc);
`;

export async function migrate() {
  await sql.unsafe(SCHEMA);
  // Seed the catalog once; existing prices/stock edited by the admin are never overwritten.
  const rows = catalog.products.map((p) => ({ slug: p.slug, title: p.title, category: p.category, price: p.price, compare_price: p.comparePrice, stock: p.stock }));
  for (let i = 0; i < rows.length; i += 200) {
    await sql`insert into products ${sql(rows.slice(i, i + 200), "slug", "title", "category", "price", "compare_price", "stock")} on conflict (slug) do nothing`;
  }
  for (const [code, c] of Object.entries(catalog.coupons)) {
    await sql`insert into coupons (code, label, percent) values (${code}, ${c.label}, ${c.percent}) on conflict (code) do nothing`;
  }
  const [{ count }] = await sql<{ count: string }[]>`select count(*)::text as count from admins`;
  if (count === "0") {
    if (config.adminEmail && config.adminPassword) {
      await sql`insert into admins (email, name, password_hash, role) values (${config.adminEmail}, 'مدیر اصلی', ${await hashPassword(config.adminPassword)}, 'owner')`;
      console.log(`✓ owner account created for ${config.adminEmail}`);
    } else {
      console.warn("⚠ No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the owner account.");
    }
  }
}

export async function audit(adminId: number | null, action: string, meta: Record<string, unknown> = {}, ip?: string) {
  await sql`insert into audit_log (admin_id, action, meta, ip) values (${adminId}, ${action}, ${sql.json(meta as never)}, ${ip ?? null})`;
}

/** Cancels unpaid online/card orders past their payment window and returns their stock. */
export async function expireUnpaidOrders() {
  await sql.begin(async (tx) => {
    const expired = await tx<{ id: string; items: { slug: string; qty: number }[] }[]>`
      select id, items from orders
      where payment_status = 'pending' and status = 'pending' and expires_at is not null and expires_at < now()
      for update skip locked`;
    for (const order of expired) {
      for (const item of order.items) await tx`update products set stock = stock + ${item.qty} where slug = ${item.slug}`;
      await tx`update orders set status = 'cancelled', payment_status = 'cancelled', updated_at = now() where id = ${order.id}`;
    }
    await tx`delete from sessions where expires_at < now()`;
  });
}
