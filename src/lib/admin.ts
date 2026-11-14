import { getProducts, type Product } from "./catalog";
import { SITE } from "@/data/content";
import { leatherById, threadById } from "@/lib/options";

/* ------------------------------------------------------------------ *
 * A small, self-contained demo store for the admin panel.
 * Everything lives in localStorage so changes survive a refresh.
 * ------------------------------------------------------------------ */

const KEY = "50500_admin_v1";

export type AdminOrderItem = { slug: string; title: string; qty: number; price: number; image: string; leather?: string; thread?: string };

export type AdminOrder = {
  code: string;
  customer: string;
  phone: string;
  province: string;
  city: string;
  address?: string;
  postalCode?: string;
  notes?: string;
  shippingMethod?: string;
  items: AdminOrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: string;
  payment: "paid" | "pending" | "cod" | "refunded";
  createdAt: string;
  tracking?: string;
  note?: string;
};

export const SHIPPING_LABEL: Record<string, string> = { post: "پست پیشتاز", tipax: "تیپاکس (پس‌کرایه)", pickup: "تحویل حضوری" };

export function shippingLabel(id?: string): string {
  return id ? SHIPPING_LABEL[id] ?? id : "—";
}

export type AdminProduct = {
  slug: string;
  title: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  category: "embroidered-leather" | "accessories";
  brandName?: string;
  brandSlug?: string;
  modelSlug?: string;
  modelName?: string;
  image: string;
  active: boolean;
  cost: number;
  body?: string;
  custom?: boolean;
  createdAt?: string;
};

export type AdminCoupon = {
  code: string;
  percent: number;
  minAmount: number;
  maxUses: number;
  uses: number;
  active: boolean;
};

export type AdminReview = {
  id: string;
  name: string;
  product: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  date: string;
};

export type AdminSettings = {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  freeShipping: number;
  cod: boolean;
  cardToCard: boolean;
  announcement: string;
  maintenance: boolean;
};

export type AuditEntry = { id: string; at: string; actor: string; module: string; action: string };

export type AffiliatePartner = {
  id: string;
  name: string;
  phone: string;
  code: string;
  rate: number; // commission %
  clicks: number;
  orders: number;
  balance: number; // unpaid commission
  paid: number;
  status: "active" | "pending" | "suspended";
};

export type FinanceRecord = {
  id: string;
  at: string;
  title: string;
  type: "income" | "expense" | "refund";
  amount: number;
  manual: boolean;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastSeen: string;
  perms: Record<string, { read: boolean; write: boolean }>;
};

export const STAFF_MODULES = ["orders", "products", "customers", "coupons", "reviews", "content", "finance", "affiliates"] as const;

export type AdminState = {
  orders: AdminOrder[];
  products: AdminProduct[];
  coupons: AdminCoupon[];
  reviews: AdminReview[];
  settings: AdminSettings;
  audit: AuditEntry[];
  affiliates: AffiliatePartner[];
  finance: FinanceRecord[];
  staff: StaffMember[];
};

export const ORDER_STATUS = [
  { id: "pending", name: "در انتظار تایید", tone: "amber" },
  { id: "confirmed", name: "تایید شده", tone: "blue" },
  { id: "producing", name: "در حال تولید", tone: "violet" },
  { id: "shipped", name: "ارسال شده", tone: "cyan" },
  { id: "delivered", name: "تحویل شده", tone: "green" },
  { id: "cancelled", name: "لغو شده", tone: "rose" },
] as const;

const CUSTOMERS = [
  ["حسین مرادی", "09121234567", "تهران", "تهران", "سعادت‌آباد، بزرگراه آزادگان، بلوار نواب، کوچه ۱۲، پلاک ۸", "14735621"],
  ["سارا عباسی", "09351112233", "اصفهان", "اصفهان", "میدان نقش، بلوار زکریای رازی، کوچه ۴، پلاک ۲۱", "81934567"],
  ["کامران شریفی", "09137778899", "فارس", "شیراز", "کوچک، بلوار چمران، نبش کوچه ۱۷، ساختمان آفتاب", "71745239"],
  ["مینا رستمی", "09194445566", "البرز", "کرج", "شهرک غرب، بلوار امیرکبیر، کوچه ۹، پلاک ۳", "31756890"],
  ["بهزاد نیک‌نام", "09151239876", "خراسان رضوی", "مشهد", "ولیعصر، خیابان احمدآباد، کوچه باغ، پلاک ۱۴", "91736521"],
  ["لیلا قاسمی", "09112223344", "گیلان", "رشت", "بلوار جمهوری، کوچه ۲۸، ساختمان پارس", "41965321"],
  ["پیمان اکبری", "09143334455", "آذربایجان شرقی", "تبریز", "خیابان مصلی، نبش کوچه طالقانی، پلاک ۶", "54789632"],
  ["نازنین طاهری", "09125556677", "تهران", "تهران", "وحدت، بلوار آیت‌الله سعیدی، کوچه ۳، پلاک ۱۱", "13768945"],
  ["آرش فرهادی", "09381230000", "قم", "قم", "بلوار ارم، کوچه ۱۵، ساختمان گلبرگ", "37186549"],
  ["رها کاظمی", "09127778811", "تهران", "تهران", "پیروزی، بلوار کشاورز، کوچه ۲۲، پلاک ۴", "15869743"],
  ["سینا مرادی", "09128889900", "یزد", "یزد", "خیابان ولی‌عصر، کوچه ۴۰، پلاک ۷", "89375612"],
  ["نگار صادقی", "09122223344", "فارس", "شیراز", "سعادت‌آباد، بلوار شهید باهنر، کوچه ۵، پلاک ۹", "71938465"],
] as const;

const STATUSES = ["delivered", "delivered", "shipped", "shipped", "producing", "producing", "confirmed", "pending", "pending", "delivered", "cancelled", "delivered"];
const PAYMENTS: AdminOrder["payment"][] = ["paid", "paid", "paid", "cod", "paid", "paid", "paid", "cod", "pending", "paid", "refunded", "paid"];

function d(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString();
}

function seed(): AdminState {
  const catalog = getProducts(true);
  const mats = catalog.filter((p) => p.category === "embroidered-leather");
  const accessories = catalog.filter((p) => p.category === "accessories").length
    ? catalog.filter((p) => p.category === "accessories")
    : mats;

  const orders: AdminOrder[] = CUSTOMERS.map(([name, phone, province, city, address, postalCode], i) => {
    const mat = mats[(i * 7 + 3) % mats.length];
    const acc = accessories[(i * 3) % accessories.length];
    const useMat = i % 3 !== 2;
    const items: AdminOrderItem[] = useMat
      ? [{ slug: mat.slug, title: mat.title, qty: 1, price: mat.price, image: mat.image, leather: "black", thread: i % 2 ? "white" : "red" }]
      : [{ slug: acc.slug, title: acc.title, qty: 1 + (i % 2), price: acc.price, image: acc.image }];
    if (i % 4 === 0) items.push({ slug: acc.slug, title: acc.title, qty: 1, price: acc.price, image: acc.image });
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = subtotal >= 5000000 ? 0 : 120000;
    const discount = i % 5 === 0 ? Math.round(subtotal * 0.1) : 0;
    return {
      code: String(40001234 + i * 7919),
      customer: name,
      phone,
      province,
      city,
      address,
      postalCode,
      notes: i % 6 === 1 ? "تماس تلفنی قبل از ارسال" : i % 6 === 3 ? "گلدوزی لوگو با رنگ سفید" : undefined,
      shippingMethod: i % 3 === 0 ? "post" : i % 3 === 1 ? "tipax" : "pickup",
      items,
      subtotal,
      shipping,
      discount,
      total: subtotal + shipping - discount,
      status: STATUSES[i],
      payment: PAYMENTS[i],
      createdAt: d(i * 2 + 1),
      tracking: i % 3 === 1 ? `TIPAX-${9000000 + i * 137}` : undefined,
    };
  });

  const products: AdminProduct[] = catalog.map((p: Product) => ({
    slug: p.slug,
    title: p.title,
    price: p.price,
    comparePrice: p.comparePrice,
    stock: p.stock,
    category: p.category,
    brandName: p.brandName,
    image: p.image,
    active: p.stock > 0,
    cost: Math.round(p.price * 0.62),
  }));

  const coupons: AdminCoupon[] = [
    { code: "50500", percent: 10, minAmount: 1000000, maxUses: 500, uses: 128, active: true },
    { code: "WELCOME", percent: 15, minAmount: 2000000, maxUses: 200, uses: 41, active: true },
    { code: "YALDA", percent: 20, minAmount: 5000000, maxUses: 100, uses: 100, active: false },
  ];

  const reviews: AdminReview[] = [
    { id: "r1", name: "سحر جعفری", product: mats[0].title, rating: 5, comment: "کیفیت دوخت فوق‌العاده بود و دقیقاً اندازه ماشین شد.", status: "approved", date: d(12) },
    { id: "r2", name: "مرتضی کشاورز", product: mats[4].title, rating: 5, comment: "کاملاً فیت است و هیچ مانعی برای پدال‌ها ایجاد نمی‌کند.", status: "pending", date: d(3) },
    { id: "r3", name: "الهام مددی", product: mats[9].title, rating: 4, comment: "بسته‌بندی شیک بود، ارسال یک روز دیرتر رسید.", status: "pending", date: d(2) },
    { id: "r4", name: "کیارش نادری", product: accessories[0].title, rating: 3, comment: "برای قیمتش خوبه ولی انتظار چرم ضخیم‌تری داشتم.", status: "pending", date: d(1) },
    { id: "r5", name: "زهرا حسینی", product: mats[6].title, rating: 5, comment: "گلدوزی لوگو خیلی تمیز انجام شده.", status: "approved", date: d(20) },
  ];

  const audit: AuditEntry[] = [
    { id: "a3", at: d(1), actor: "مدیر اصلی", module: "سفارش‌ها", action: "تأیید واریز کارت‌به‌کارت سفارش 40017072" },
    { id: "a2", at: d(2), actor: "نگین احمدی", module: "محصولات", action: "به‌روزرسانی قیمت کفپوش پژو ۲۰۶" },
    { id: "a1", at: d(3), actor: "مدیر اصلی", module: "محتوای سایت", action: "ویرایش متن نوار اعلان صفحه اصلی" },
  ];

  const affiliates: AffiliatePartner[] = [
    { id: "af1", name: "امیر رضایی", phone: "09121110022", code: "AMIR10", rate: 12, clicks: 1840, orders: 37, balance: 4820000, paid: 3000000, status: "active" },
    { id: "af2", name: "فروشگاه تیونینگ سعادت‌آباد", phone: "09193334455", code: "TUNING", rate: 8, clicks: 940, orders: 14, balance: 1150000, paid: 1150000, status: "active" },
    { id: "af3", name: "کانال خودرویار", phone: "09355566777", code: "KHODRO", rate: 10, clicks: 410, orders: 5, balance: 0, paid: 0, status: "pending" },
    { id: "af4", name: "لوازم‌جانبی ۲۴", phone: "09188899900", code: "SHOP24", rate: 6, clicks: 260, orders: 2, balance: 0, paid: 250000, status: "suspended" },
  ];

  const finance: FinanceRecord[] = [
    { id: "f1", at: d(4), title: "کمپین تبلیغات اینستاگرام", type: "expense", amount: 2800000, manual: true },
    { id: "f2", at: d(6), title: "کارمزد درگاه پرداخت", type: "expense", amount: 640000, manual: true },
    { id: "f3", at: d(9), title: "بازگشت وجه سفارش 40056667", type: "refund", amount: 1450000, manual: false },
    { id: "f4", at: d(12), title: "فروش حضوری دفتر مرکزی", type: "income", amount: 3900000, manual: true },
  ];

  const perm = (read: boolean, write: boolean) => ({ read, write });
  const staff: StaffMember[] = [
    { id: "s1", name: "نگین احمدی", email: "negin@50500.shop", role: "مدیر فروش", active: true, lastSeen: d(0), perms: { orders: perm(true, true), products: perm(true, true), customers: perm(true, false), coupons: perm(true, true), reviews: perm(true, true), content: perm(false, false), finance: perm(true, false), affiliates: perm(false, false) } },
    { id: "s2", name: "سعید کریمی", email: "saeed@50500.shop", role: "کارشناس انبار", active: true, lastSeen: d(1), perms: { orders: perm(true, false), products: perm(true, true), customers: perm(false, false), coupons: perm(false, false), reviews: perm(false, false), content: perm(false, false), finance: perm(false, false), affiliates: perm(false, false) } },
    { id: "s3", name: "مریم نوروزی", email: "maryam@50500.shop", role: "پشتیبانی مشتریان", active: false, lastSeen: d(9), perms: { orders: perm(true, true), products: perm(true, false), customers: perm(true, true), coupons: perm(true, false), reviews: perm(true, true), content: perm(false, false), finance: perm(false, false), affiliates: perm(false, false) } },
  ];

  const settings: AdminSettings = {
    storeName: "50500.shop",
    phone: "۰۲۱-۹۱۰50500",
    email: "info@50500.shop",
    address: "تهران، بزرگراه جلال آل‌احمد، دفتر فروش 50500",
    freeShipping: 5000000,
    cod: true,
    cardToCard: false,
    announcement: "ارسال رایگان برای خریدهای بالای ۵ میلیون تومان",
    maintenance: false,
  };

  return { orders, products, coupons, reviews, settings, audit, affiliates, finance, staff };
}

export const DEFAULT_STATE: AdminState = seed();

const PW_KEY = "50500_admin_pw_v1";
const DEFAULT_ADMIN_PASSWORDS = new Set(["Admin@50500", "50500admin", "admin50500"]);
export const DEFAULT_ADMIN_EMAIL = "ceo@50500.shop";

/** SHA-256 (Web Crypto, secure contexts) with a synchronous FNV-1a fallback
    so login still works in insecure previews (file:// without subtle crypto). */
async function digest(text: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through to the fallback */
  }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv-${(h >>> 0).toString(16)}`;
}

/** Verifies a password against the stored digest. Legacy builds stored the
    plaintext directly; on the first successful login it is migrated to a hash. */
export async function verifyAdminPassword(plain: string): Promise<boolean> {
  let stored: string | null = null;
  try {
    const raw = localStorage.getItem(PW_KEY);
    stored = typeof raw === "string" && raw.trim() ? raw : null;
  } catch {
    stored = null;
  }
  if (!stored) return DEFAULT_ADMIN_PASSWORDS.has(plain.trim());
  const prefix = stored.startsWith("sha256:") ? "sha256:" : stored.startsWith("fnv-") ? "fnv-" : null;
  if (prefix) return (await digest(plain)) === stored.slice(prefix.length);
  // Legacy plaintext entry from an older build: verify, then upgrade to a hash.
  if (plain === stored) {
    await setAdminPassword(plain);
    return true;
  }
  return false;
}

/** Stores only the digest of the password — never the password itself. */
export async function setAdminPassword(next: string): Promise<void> {
  try {
    localStorage.setItem(PW_KEY, `sha256:${await digest(next.trim())}`);
  } catch {
    /* storage unavailable */
  }
}

export function loadAdmin(): AdminState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    const base = seed();
    const merged = {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      audit: parsed.audit ?? base.audit,
      affiliates: parsed.affiliates ?? base.affiliates,
      finance: parsed.finance ?? base.finance,
      staff: parsed.staff ?? base.staff,
    };
    const fix = (v: string) => String(v ?? "")
      .replace(/info@store50500\.ir/gi, "info@50500.shop")
      .replace(/فروشگاه ۵۰۵۰۰/gi, "50500.shop")
      .replace(/فروشگاه 50500/gi, "50500.shop");
    return {
      ...merged,
      settings: {
        ...merged.settings,
        storeName: merged.settings.storeName === "فروشگاه 50500" || !merged.settings.storeName ? "50500.shop" : fix(merged.settings.storeName),
        email: fix(merged.settings.email),
      },
    };
  } catch {
    return seed();
  }
}

export function saveAdmin(state: AdminState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable: keep working in memory */
  }
}

export function resetAdmin() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function money(n: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

export function dateFa(iso: string, withTime = false) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Asia/Tehran",
  }).format(new Date(iso));
}

export function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Deterministic 30-day revenue series built from the seeded orders + baseline traffic. */
export function revenueSeries(orders: AdminOrder[], days: number) {
  const out: { label: string; revenue: number; orders: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o) => dayKey(o.createdAt) === key && o.payment === "paid");
    const base = 3_200_000 + ((i * 7919) % 11) * 640_000;
    out.push({
      label: new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" }).format(date),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0) + base,
      orders: dayOrders.length + 2 + ((i * 3) % 5),
    });
  }
  return out;
}

export type CustomerRow = {
  name: string;
  phone: string;
  city: string;
  orders: number;
  paid: number;
  ltv: number;
  last: string;
  segment: "وفادار" | "پرمصرف" | "جدید" | "در خطر";
};

export function customerRows(orders: AdminOrder[]): CustomerRow[] {
  const map = new Map<string, CustomerRow>();
  for (const o of orders) {
    const existing = map.get(o.phone);
    if (existing) {
      existing.orders += 1;
      existing.paid += o.payment === "paid" ? 1 : 0;
      existing.ltv += o.total;
      if (new Date(o.createdAt) > new Date(existing.last)) existing.last = o.createdAt;
    } else {
      map.set(o.phone, { name: o.customer, phone: o.phone, city: o.city, orders: 1, paid: o.payment === "paid" ? 1 : 0, ltv: o.total, last: o.createdAt, segment: "جدید" });
    }
  }
  const rows = [...map.values()].sort((a, b) => b.ltv - a.ltv);
  for (const row of rows) {
    const daysAgo = (Date.now() - new Date(row.last).getTime()) / 86_400_000;
    row.segment = row.orders >= 3 ? "وفادار" : row.ltv >= 9_000_000 ? "پرمصرف" : daysAgo > 20 ? "در خطر" : "جدید";
  }
  return rows;
}


export function auditId() {
  return `a_${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}

export function makeAuditEntry(action: string, module: string, actor = "مدیر اصلی"): AuditEntry {
  return { id: auditId(), at: new Date().toISOString(), actor, module, action };
}

export function financeTotals(state: AdminState) {
  const paid = state.orders.filter((o) => o.payment === "paid");
  const manual = state.finance;
  const costs = paid.reduce((sum, order) => {
    return sum + order.items.reduce((inner, it) => {
      const product = state.products.find((p) => p.slug === it.slug);
      return inner + (product?.cost ?? 0) * it.qty;
    }, 0);
  }, 0);
  const discounts = state.orders.reduce((s, o) => s + o.discount, 0);
  const shipping = state.orders.reduce((s, o) => s + o.shipping, 0);
  const expenses = manual.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const refunds = manual.filter((r) => r.type === "refund").reduce((s, r) => s + r.amount, 0);
  const extraIncome = manual.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const revenue = paid.reduce((s, o) => s + o.total, 0) + extraIncome;
  const gross = revenue - costs - expenses - refunds;
  return { revenue, costs, expenses, refunds, discounts, shipping, extraIncome, gross };
}

export function downloadAdminBackup(state: AdminState, content: unknown) {
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), state, content }, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `50500-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ------------------------------------------------------------------ *
 * Live customer orders: merge storefront orders (50500_orders_v1)
 * with the demo dataset so the panel always shows full customer data.
 * ------------------------------------------------------------------ */

type StoredOrder = {
  code: string;
  items: { slug: string; title: string; qty: number; price: number; image: string; leather?: string; thread?: string }[];
  customer: { name: string; phone: string; province: string; city: string; address: string; postalCode: string; notes: string };
  shippingMethod: string;
  payment: string;
  paymentStatus: "paid" | "pending" | "cod";
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
};

export function mergeLiveOrders(orders: AdminOrder[]): AdminOrder[] {
  let live: AdminOrder[] = [];
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("50500_orders_v1") : null;
    if (raw) {
      const list = JSON.parse(raw) as StoredOrder[];
      live = list.map((o) => ({
        code: o.code,
        customer: o.customer.name,
        phone: o.customer.phone,
        province: o.customer.province,
        city: o.customer.city,
        address: o.customer.address,
        postalCode: o.customer.postalCode,
        notes: o.customer.notes || undefined,
        shippingMethod: o.shippingMethod,
        items: o.items.map((it) => ({ slug: it.slug, title: it.title, qty: it.qty, price: it.price, image: it.image, leather: it.leather, thread: it.thread })),
        subtotal: o.subtotal,
        shipping: o.shipping,
        discount: o.discount,
        total: o.total,
        status: o.status,
        payment: o.paymentStatus === "paid" ? "paid" : o.paymentStatus === "cod" ? "cod" : "pending",
        createdAt: o.createdAt,
      }));
    }
  } catch { /* malformed storage — ignore */ }
  const seen = new Set<string>();
  return [...live, ...orders].filter((o) => (seen.has(o.code) ? false : (seen.add(o.code), true)));
}

/** Patches a storefront (50500_orders_v1) order directly when the admin updates it. */
export function patchStoredOrder(code: string, patch: { status?: string; payment?: AdminOrder["payment"]; tracking?: string; note?: string }): boolean {
  try {
    const raw = localStorage.getItem("50500_orders_v1");
    if (!raw) return false;
    const list = JSON.parse(raw) as (StoredOrder & { tracking?: string })[];
    const idx = list.findIndex((o) => o.code === code);
    if (idx === -1) return false;
    const o = list[idx];
    if (patch.payment === "paid") {
      o.paymentStatus = "paid";
      o.status = patch.status ?? (o.status === "pending" ? "confirmed" : o.status);
    } else if (patch.status) {
      o.status = patch.status;
    }
    if (patch.tracking !== undefined) o.tracking = patch.tracking || undefined;
    list[idx] = o;
    localStorage.setItem("50500_orders_v1", JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Excel/CSV export and invoice & shipping-label printing
 * ------------------------------------------------------------------ */

function esc(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export function ordersToCSV(orders: AdminOrder[]): string {
  const head = ["code", "customer", "phone", "province", "city", "address", "postalCode", "items", "subtotal", "discount", "shipping", "total", "status", "payment", "shippingMethod", "notes", "createdAt"];
  const rows = orders.map((o) =>
    [
      o.code, o.customer, o.phone, o.province, o.city, o.address ?? "", o.postalCode ?? "",
      o.items.map((i) => `${i.title} ×${i.qty}${i.leather ? ` (چرم ${i.leather})` : ""}${i.thread ? ` (گلدوزی ${i.thread})` : ""}`).join(" | "),
      o.subtotal, o.discount, o.shipping, o.total,
      o.status, o.payment, SHIPPING_LABEL[o.shippingMethod ?? ""] ?? o.shippingMethod ?? "", o.notes ?? "", o.createdAt,
    ].map(esc).join(","),
  );
  return "\uFEFF" + [head.join(","), ...rows].join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ------------------------------------------------------------------ *
 * Printing: every value is HTML-escaped (customer names/notes are user
 * input). Both documents share the 50500 brand header and print on A5:
 * the sales invoice (فاکتور فروش) and the shipping label (برچسب ارسال).
 * ------------------------------------------------------------------ */

function htmlEsc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

const PAYMENT_TEXT: Record<AdminOrder["payment"], string> = {
  paid: "پرداخت شده",
  pending: "در انتظار پرداخت",
  cod: "پرداخت در محل",
  refunded: "بازگشت وجه",
};

const statusName = (id: string) => ORDER_STATUS.find((s) => s.id === id)?.name ?? id;

/** Deterministic SVG barcode for order / tracking codes (decorative). */
function barcodeSvg(code: string, height = 42): string {
  const bars: string[] = [];
  let x = 0;
  for (const ch of String(code)) {
    const n = ch.charCodeAt(0);
    for (let k = 0; k < 3; k++) {
      const w = 1 + ((n >> (k * 2)) % 3);
      const g = 1 + ((n >> k) % 2);
      bars.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#15171c"/>`);
      x += w + g;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${height}" preserveAspectRatio="none" style="width:100%;height:${height}px;display:block" aria-hidden="true">${bars.join("")}</svg>`;
}

function printDoc(title: string, pageCss: string, body: string) {
  const win = window.open("", "_blank", "width=760,height=980");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${htmlEsc(title)}</title><style>${pageCss}</style></head><body>${body}<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script></body></html>`);
  win.document.close();
}

const BASE_CSS = `
*{box-sizing:border-box}
body{font-family:Tahoma,Vazirmatn,Arial,sans-serif;color:#15171c;margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.muted{color:#6b7280}
.band{display:flex;justify-content:space-between;align-items:center;gap:12px;background:linear-gradient(135deg,#15171c,#262d3a);color:#fff;border-radius:10px;padding:9px 12px}
.band .name{font-size:21px;font-weight:900;letter-spacing:.01em;line-height:1.2}
.band .name span{color:#ff8f45}
.band .tag{font-size:8.5px;color:#cbd5e1;margin-top:2px}
.band .left{text-align:left}
.band .doc{font-size:13px;font-weight:900}
.band .meta{font-size:9px;color:#e2e8f0;margin-top:2px}
.band .meta b{color:#ffb27a}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.chip{border:1px solid #e5e7eb;border-radius:7px;padding:3px 8px;font-size:9.5px;background:#fafafa}
.chip b{color:#15171c}
.chip.ok{border-color:#86efac;background:#ecfdf3;color:#166534}
.chip.warn{border-color:#fcd34d;background:#fffbeb;color:#92400e}
.chip.brand{border-color:#ffb27a;background:#fff3ea;color:#b8450a}
.bc{margin-top:10px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;background:#fafafa}
.bc .cap{font-size:8.5px;color:#6b7280;text-align:center}
.bc .code{font-family:ui-monospace,Consolas,monospace;letter-spacing:.18em;font-size:10px;text-align:center;margin-top:2px}
.foot{margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:6px;font-size:8.8px;color:#6b7280;display:flex;justify-content:space-between;gap:8px}
.signrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.signbox{border:1px dashed #cbd5e1;border-radius:8px;min-height:36px;display:flex;align-items:flex-end;justify-content:center;padding:4px;font-size:9px;color:#6b7280;background:#fff}
`;

const INVOICE_CSS = `${BASE_CSS}
@page{size:A5 portrait;margin:9mm}
.inv{font-size:10.5px;line-height:1.7}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
.card{border:1px solid #e5e7eb;border-radius:9px;padding:6px 9px;min-height:74px}
.card h3{margin:0 0 3px;font-size:9.5px;font-weight:900;color:#c2410c;letter-spacing:.03em}
.card p{margin:0;font-size:10px}
table{width:100%;border-collapse:collapse;margin-top:9px}
th{background:#15171c;color:#fff;font-size:9.5px;font-weight:700;padding:5px 6px;text-align:right}
th.c,td.c{text-align:center;white-space:nowrap}
td{border-bottom:1px solid #eef0f3;padding:5px 6px;vertical-align:top;font-size:10px}
td .sub{color:#6b7280;font-size:8.8px;margin-top:1px}
.totals{margin-top:10px;margin-inline-start:auto;width:70%;border:1px solid #e5e7eb;border-radius:10px;padding:7px 11px;background:#fafafa;font-size:10px}
.totals div{display:flex;justify-content:space-between;padding:2px 0}
.totals .grand{border-top:2px solid #15171c;margin-top:4px;padding-top:5px;font-size:12.5px;font-weight:900}
.totals .grand b{color:#c2410c}
`;

const LABEL_CSS = `${BASE_CSS}
@page{size:A5 portrait;margin:9mm}
.lbl{font-size:10.5px;line-height:1.7}
.recipient{margin-top:9px;border:1.5px solid #15171c;border-radius:10px;padding:8px 10px;background:#fff}
.recipient .rname{font-size:15px;font-weight:900}
.recipient .rphone{font-size:13px;font-weight:900;color:#c2410c;margin-top:2px}
.recipient .raddr{font-size:10px;color:#374151;margin-top:4px;line-height:1.9}
.meta-row{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}
.meta-row .cell{border:1px solid #e5e7eb;border-radius:8px;padding:5px 8px;background:#fafafa;font-size:9.5px}
.meta-row .cell .k{color:#6b7280;font-size:8.5px}
.meta-row .cell .v{font-weight:800;margin-top:1px}
.items-list{margin-top:8px;border:1px solid #e5e7eb;border-radius:10px;padding:6px 11px;background:#fafafa;font-size:9.5px}
.items-list .row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed #eef0f3}
.items-list .row:last-child{border-bottom:0}
.sender{margin-top:8px;border:1px solid #e5e7eb;border-radius:9px;padding:6px 9px;font-size:9.5px;background:#fff}
.sender h4{margin:0 0 3px;font-size:9.5px;font-weight:900;color:#c2410c;letter-spacing:.03em}
.sender p{margin:0;font-size:9.5px}
`;

export function printInvoice(o: AdminOrder) {
  const date = new Date(o.createdAt).toLocaleDateString("fa-IR");
  const rows = o.items
    .map((it) => {
      const options = [it.leather ? `چرم ${leatherById(it.leather).name}` : "", it.thread ? `گلدوزی ${threadById(it.thread).name}` : ""].filter(Boolean).join(" · ");
      return `<tr><td>${htmlEsc(it.title)}${options ? `<div class="sub">${htmlEsc(options)}</div>` : ""}</td><td class="c">${htmlEsc(it.qty)}</td><td class="c">${htmlEsc(money(it.price))}</td><td class="c">${htmlEsc(money(it.price * it.qty))}</td></tr>`;
    })
    .join("");
  const address = [o.province, o.city, o.address].filter(Boolean).join("، ");
  const body = `<div class="inv">
  <div class="band">
    <div><div class="name">50500<span>.shop</span></div><div class="tag">کفپوش چرمی گلدوزی پنج‌بعدی اختصاصی خودرو</div></div>
    <div class="left"><div class="doc">فاکتور فروش</div><div class="meta">شماره سفارش: <b dir="ltr">${htmlEsc(o.code)}</b></div><div class="meta">تاریخ: ${htmlEsc(date)}</div></div>
  </div>
  <div class="chips">
    <span class="chip brand">وضعیت: <b>${htmlEsc(statusName(o.status))}</b></span>
    <span class="chip ${o.payment === "paid" ? "ok" : o.payment === "pending" ? "warn" : ""}">پرداخت: <b>${htmlEsc(PAYMENT_TEXT[o.payment] ?? o.payment)}</b></span>
    <span class="chip">ارسال: <b>${htmlEsc(shippingLabel(o.shippingMethod))}</b></span>
    ${o.tracking ? `<span class="chip">کد رهگیری: <b dir="ltr">${htmlEsc(o.tracking)}</b></span>` : ""}
  </div>
  <div class="grid2">
    <div class="card"><h3>فروشنده</h3><p><b>${htmlEsc(SITE.name)}</b></p><p dir="ltr" style="text-align:right">${htmlEsc(SITE.phone)}</p><p>${htmlEsc(SITE.email)}</p><p class="muted">${htmlEsc(SITE.address)}</p></div>
    <div class="card"><h3>خریدار</h3><p><b>${htmlEsc(o.customer)}</b></p><p dir="ltr" style="text-align:right">${htmlEsc(o.phone)}</p><p>${htmlEsc(address)}</p>${o.postalCode ? `<p class="muted">کد پستی: <span dir="ltr">${htmlEsc(o.postalCode)}</span></p>` : ""}</div>
  </div>
  <table><thead><tr><th>کالا</th><th class="c">تعداد</th><th class="c">قیمت واحد</th><th class="c">جمع</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals">
    <div><span>جمع کالاها</span><span>${htmlEsc(money(o.subtotal))}</span></div>
    ${o.discount ? `<div><span>تخفیف</span><span>−${htmlEsc(money(o.discount))}</span></div>` : ""}
    <div><span>هزینه ارسال</span><span>${o.shipping ? htmlEsc(money(o.shipping)) : "رایگان"}</span></div>
    <div class="grand"><span>مبلغ کل</span><span><b>${htmlEsc(money(o.total))}</b> تومان</span></div>
  </div>
  <div class="bc">${barcodeSvg(o.code)}<div class="code" dir="ltr">${htmlEsc(o.code)}</div><div class="cap">کد سفارش</div></div>
  <div class="foot"><span>گارانتی ۱۲ ماه تعویض · ${htmlEsc(SITE.hours)}</span><span dir="ltr">${htmlEsc(SITE.phone)}</span></div>
</div>`;
  printDoc(`فاکتور ${o.code}`, `${INVOICE_CSS}`, body);
}

export function printLabel(o: AdminOrder) {
  const date = new Date(o.createdAt).toLocaleDateString("fa-IR");
  const address = [o.province, o.city, o.address].filter(Boolean).join("، ");
  const itemLines = o.items
    .map((it) => `<div class="row"><span>${htmlEsc(it.title)} ×${htmlEsc(it.qty)}</span><b dir="ltr">${htmlEsc(money(it.price * it.qty))}</b></div>`)
    .join("");
  const body = `<div class="lbl">
  <div class="band">
    <div><div class="name">50500<span>.shop</span></div><div class="tag">کفپوش چرمی گلدوزی پنج‌بعدی اختصاصی خودرو</div></div>
    <div class="left"><div class="doc">برچسب ارسال</div><div class="meta">شماره سفارش: <b dir="ltr">${htmlEsc(o.code)}</b></div><div class="meta">تاریخ: ${htmlEsc(date)}</div></div>
  </div>
  <div class="chips">
    <span class="chip brand">${htmlEsc(shippingLabel(o.shippingMethod))}</span>
    <span class="chip ${o.payment === "paid" ? "ok" : o.payment === "pending" ? "warn" : ""}">${htmlEsc(PAYMENT_TEXT[o.payment] ?? o.payment)}</span>
    <span class="chip">${htmlEsc(o.items.reduce((s, i) => s + i.qty, 0))} قلم کالا</span>
    <span class="chip">مبلغ کل: <b>${htmlEsc(money(o.total))} تومان</b></span>
  </div>
  <div class="recipient">
    <div class="rname">${htmlEsc(o.customer)}</div>
    <div class="rphone" dir="ltr" style="text-align:right">${htmlEsc(o.phone)}</div>
    <div class="raddr">${htmlEsc(address)}</div>
    ${o.postalCode ? `<div class="raddr muted">کد پستی: <span dir="ltr">${htmlEsc(o.postalCode)}</span></div>` : ""}
    ${o.notes ? `<div class="raddr muted">یادداشت خریدار: ${htmlEsc(o.notes)}</div>` : ""}
  </div>
  <div class="meta-row">
    <div class="cell"><div class="k">وضعیت سفارش</div><div class="v">${htmlEsc(statusName(o.status))}</div></div>
    <div class="cell"><div class="k">فرستنده</div><div class="v">${htmlEsc(SITE.name)}</div></div>
    <div class="cell"><div class="k">تلفن پشتیبانی</div><div class="v" dir="ltr">${htmlEsc(SITE.phone)}</div></div>
    <div class="cell"><div class="k">ساعات ارسال</div><div class="v">${htmlEsc(SITE.hours)}</div></div>
  </div>
  <div class="items-list">${itemLines}</div>
  <div class="bc">${barcodeSvg(o.code)}<div class="code" dir="ltr">${htmlEsc(o.code)}</div><div class="cap">کد سفارش — هنگام تحویل نشان دهید</div></div>
  ${o.tracking ? `<div class="bc">${barcodeSvg(o.tracking)}<div class="code" dir="ltr">${htmlEsc(o.tracking)}</div><div class="cap">کد رهگیری پست</div></div>` : ""}
  <div class="sender">
    <h4>فرستنده</h4>
    <p><b>${htmlEsc(SITE.name)}</b> · ${htmlEsc(SITE.address)}</p>
    <p dir="ltr" style="text-align:right">${htmlEsc(SITE.phone)} · ${htmlEsc(SITE.email)}</p>
  </div>
  <div class="signrow">
    <div class="signbox">امضای گیرنده</div>
    <div class="signbox">مهر و امضای فرستنده</div>
  </div>
  <div class="foot"><span>گارانتی ۱۲ ماه تعویض · ${htmlEsc(SITE.hours)}</span><span dir="ltr">${htmlEsc(SITE.phone)}</span></div>
</div>`;
  printDoc(`برچسب ارسال ${o.code}`, `${LABEL_CSS}`, body);
}
