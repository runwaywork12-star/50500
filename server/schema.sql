-- 50500 production schema. Idempotent: safe to run on every boot.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS app_meta (
  key   text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  slug          text PRIMARY KEY,
  title         text NOT NULL,
  category      text NOT NULL CHECK (category IN ('embroidered-leather','accessories')),
  price         bigint NOT NULL CHECK (price >= 0),
  compare_price bigint CHECK (compare_price IS NULL OR compare_price >= 0),
  cost          bigint NOT NULL DEFAULT 0,
  stock         integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image         text,
  body          text NOT NULL DEFAULT '',
  brand_slug    text,
  brand_name    text,
  model_slug    text,
  model_name    text,
  active        boolean NOT NULL DEFAULT true,
  custom        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_active_idx   ON products (active, category);
CREATE INDEX IF NOT EXISTS products_brand_idx    ON products (brand_slug, model_slug);
CREATE INDEX IF NOT EXISTS products_title_trgm   ON products USING gin (title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS sub_items (
  id         text PRIMARY KEY,
  parent     text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  title      text NOT NULL,
  descr      text NOT NULL DEFAULT '',
  price      bigint NOT NULL CHECK (price >= 0),
  stock      integer NOT NULL DEFAULT 0,
  position   integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sub_items_parent_idx ON sub_items (parent, position);

CREATE TABLE IF NOT EXISTS customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         citext UNIQUE,
  phone         text NOT NULL UNIQUE,
  password_hash text,
  totp_secret   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  code            text PRIMARY KEY,
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   text NOT NULL,
  phone           text NOT NULL,
  province        text NOT NULL DEFAULT '',
  city            text NOT NULL DEFAULT '',
  address         text NOT NULL DEFAULT '',
  postal_code     text NOT NULL DEFAULT '',
  notes           text NOT NULL DEFAULT '',
  shipping_method text NOT NULL DEFAULT 'post',
  payment_method  text NOT NULL DEFAULT 'online',
  payment_status  text NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending','paid','cod','refunded','paid_review')),
  status          text NOT NULL DEFAULT 'pending',
  subtotal        bigint NOT NULL,
  discount        bigint NOT NULL DEFAULT 0,
  shipping        bigint NOT NULL DEFAULT 0,
  total           bigint NOT NULL,
  coupon          text,
  tracking        text,
  internal_note   text,
  access_token    text NOT NULL,
  idempotency_key text UNIQUE,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_phone_idx   ON orders (phone);
CREATE INDEX IF NOT EXISTS orders_status_idx  ON orders (status, payment_status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_stale_idx   ON orders (expires_at) WHERE payment_status = 'pending';

CREATE TABLE IF NOT EXISTS order_items (
  id        bigserial PRIMARY KEY,
  order_code text NOT NULL REFERENCES orders(code) ON DELETE CASCADE,
  slug      text NOT NULL,
  title     text NOT NULL,
  qty       integer NOT NULL CHECK (qty > 0),
  unit_price bigint NOT NULL,
  unit_cost  bigint NOT NULL DEFAULT 0,
  image     text,
  leather   text,
  thread    text
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_code);

-- Every gateway attempt is immutable evidence. Never trust the browser redirect.
CREATE TABLE IF NOT EXISTS payments (
  id            bigserial PRIMARY KEY,
  order_code    text NOT NULL REFERENCES orders(code) ON DELETE CASCADE,
  gateway       text NOT NULL,
  authority     text,
  amount        bigint NOT NULL,
  currency      text NOT NULL DEFAULT 'IRT',
  state         text NOT NULL DEFAULT 'started'
                CHECK (state IN ('started','verified','settled','failed','refunded','needs_review')),
  ref_id        text,
  sale_reference text,
  card_pan      text,
  raw           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  verified_at   timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_ref_unique ON payments (gateway, ref_id) WHERE ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_code, created_at DESC);

CREATE TABLE IF NOT EXISTS media (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  mime       text NOT NULL,
  size       integer NOT NULL,
  width      integer NOT NULL DEFAULT 0,
  height     integer NOT NULL DEFAULT 0,
  alt        text NOT NULL DEFAULT '',
  folder     text NOT NULL DEFAULT 'عمومی',
  tags       text[] NOT NULL DEFAULT '{}',
  storage    text NOT NULL DEFAULT 'local',
  object_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL,
  at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'staff',
  password_hash text NOT NULL,
  totp_secret   text,
  permissions   jsonb NOT NULL DEFAULT '{}'::jsonb,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Sessions store only a SHA-256 hash of the token, never the token itself.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('admin','staff','customer')),
  subject    text NOT NULL,
  csrf       text NOT NULL,
  ip         inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_subject_idx ON sessions (kind, subject);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx  ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id      bigserial PRIMARY KEY,
  actor   text NOT NULL,
  module  text NOT NULL,
  action  text NOT NULL,
  ip      inet,
  meta    jsonb NOT NULL DEFAULT '{}'::jsonb,
  at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_at_idx ON audit_log (at DESC);

CREATE TABLE IF NOT EXISTS coupons (
  code       text PRIMARY KEY,
  label      text NOT NULL DEFAULT '',
  percent    integer NOT NULL CHECK (percent BETWEEN 1 AND 90),
  min_amount bigint NOT NULL DEFAULT 0,
  max_uses   integer,
  uses       integer NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL,
  name       text NOT NULL,
  rating     integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_slug_idx ON reviews (slug, status);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_touch ON products;
CREATE TRIGGER products_touch BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS orders_touch ON orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
