import { getProducts, type Product } from "./catalog";

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

/** Demo admin password, editable from پنل ← تنظیمات. Persists in
    localStorage so a refresh keeps the owner's chosen password. */
export function getAdminPassword(): string {
  try {
    const saved = localStorage.getItem(PW_KEY);
    return typeof saved === "string" && saved.trim() ? saved : "50500admin";
  } catch {
    return "50500admin";
  }
}

export function setAdminPassword(next: string): void {
  try {
    localStorage.setItem(PW_KEY, next.trim());
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

function printHtml(title: string, body: string) {
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:Tahoma,Arial,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:right;font-size:13px}th{background:#f5f5f5}.muted{color:#666;font-size:12px}.box{border:1px solid #ccc;border-radius:12px;padding:14px;margin-top:12px}.total{font-size:16px;font-weight:bold}.label{border:2px dashed #333;padding:18px;border-radius:12px;font-size:15px;line-height:2}@media print{button{display:none}}</style></head><body>${body}<p class="muted" style="margin-top:24px">50500.shop · فروشگاه کفپوش چرمی گلدوزی اختصاصی خودرو</p><script>window.onload=()=>{window.print();}</script></body></html>`);
  win.document.close();
}

export function printInvoice(o: AdminOrder) {
  const rows = o.items.map((it) => `<tr><td>${it.title}${it.leather ? `<div class="muted">چرم ${it.leather}${it.thread ? ` · گلدوزی ${it.thread}` : ""}</div>` : ""}</td><td>${it.qty}</td><td>${money(it.price)}</td><td>${money(it.price * it.qty)}</td></tr>`).join("");
  const date = new Date(o.createdAt).toLocaleDateString("fa-IR");
  printHtml(`فاکتور ${o.code}`, `<h1>فاکتور فروش</h1><div class="muted">شماره سفارش: <b>${o.code}</b> · تاریخ: ${date}</div>
  <div class="box"><b>خریدار:</b> ${o.customer} · ${o.phone}<br><b>نشانی:</b> ${o.province}، ${o.city}${o.address ? `، ${o.address}` : ""}${o.postalCode ? ` · کد پستی ${o.postalCode}` : ""}</div>
  <table><thead><tr><th>کالا</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="box"><div>جمع کالاها: ${money(o.subtotal)}</div>${o.discount ? `<div>تخفیف: ${money(o.discount)}</div>` : ""}<div>هزینه ارسال (${shippingLabel(o.shippingMethod)}): ${o.shipping ? money(o.shipping) : "رایگان"}</div><div class="total">مبلغ کل: ${money(o.total)} تومان</div></div>`);
}

export function printLabel(o: AdminOrder) {
  printHtml(`برچسب ارسال ${o.code}`, `<div class="label"><b>گیرنده:</b> ${o.customer}<br><b>تلفن:</b> ${o.phone}<br><b>نشانی:</b> ${o.province}، ${o.city}${o.address ? `، ${o.address}` : ""}<br>${o.postalCode ? `<b>کد پستی:</b> ${o.postalCode}<br>` : ""}<b>کد سفارش:</b> ${o.code}${o.tracking ? `<br><b>کد رهگیری:</b> ${o.tracking}` : ""}<br><b>فرستنده:</b> 50500.shop</div>`);
}
