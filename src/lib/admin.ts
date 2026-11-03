import { getProducts, type Product } from "./catalog";

/* ------------------------------------------------------------------ *
 * A small, self-contained demo store for the admin panel.
 * Everything lives in localStorage so changes survive a refresh.
 * ------------------------------------------------------------------ */

const KEY = "50500_admin_v1";

export type AdminOrderItem = { slug: string; title: string; qty: number; price: number; image: string };

export type AdminOrder = {
  code: string;
  customer: string;
  phone: string;
  province: string;
  city: string;
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

export type AdminProduct = {
  slug: string;
  title: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  category: "embroidered-leather" | "accessories";
  brandName?: string;
  image: string;
  active: boolean;
  cost: number;
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
  ["حسین مرادی", "09121234567", "تهران", "تهران"],
  ["سارا عباسی", "09351112233", "اصفهان", "اصفهان"],
  ["کامران شریفی", "09137778899", "فارس", "شیراز"],
  ["مینا رستمی", "09194445566", "البرز", "کرج"],
  ["بهزاد نیک‌نام", "09151239876", "خراسان رضوی", "مشهد"],
  ["لیلا قاسمی", "09112223344", "گیلان", "رشت"],
  ["پیمان اکبری", "09143334455", "آذربایجان شرقی", "تبریز"],
  ["نازنین طاهری", "09125556677", "تهران", "تهران"],
  ["آرش فرهادی", "09381230000", "قم", "قم"],
  ["رها کاظمی", "09127778811", "تهران", "تهران"],
  ["سینا مرادی", "09128889900", "یزد", "یزد"],
  ["نگار صادقی", "09122223344", "شیراز", "شیراز"],
] as const;

const STATUSES = ["delivered", "delivered", "shipped", "shipped", "producing", "producing", "confirmed", "pending", "pending", "delivered", "cancelled", "delivered"];
const PAYMENTS: AdminOrder["payment"][] = ["paid", "paid", "paid", "cod", "paid", "paid", "paid", "cod", "pending", "paid", "refunded", "paid"];

function d(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString();
}

function seed(): AdminState {
  const catalog = getProducts();
  const mats = catalog.filter((p) => p.category === "embroidered-leather");
  const accessories = catalog.filter((p) => p.category === "accessories");

  const orders: AdminOrder[] = CUSTOMERS.map(([name, phone, province, city], i) => {
    const mat = mats[(i * 7 + 3) % mats.length];
    const acc = accessories[(i * 3) % accessories.length];
    const useMat = i % 3 !== 2;
    const items: AdminOrderItem[] = useMat
      ? [{ slug: mat.slug, title: mat.title, qty: 1, price: mat.price, image: mat.image }]
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
    { id: "s1", name: "نگین احمدی", email: "negin@50500.co", role: "مدیر فروش", active: true, lastSeen: d(0), perms: { orders: perm(true, true), products: perm(true, true), customers: perm(true, false), coupons: perm(true, true), reviews: perm(true, true), content: perm(false, false), finance: perm(true, false), affiliates: perm(false, false) } },
    { id: "s2", name: "سعید کریمی", email: "saeed@50500.co", role: "کارشناس انبار", active: true, lastSeen: d(1), perms: { orders: perm(true, false), products: perm(true, true), customers: perm(false, false), coupons: perm(false, false), reviews: perm(false, false), content: perm(false, false), finance: perm(false, false), affiliates: perm(false, false) } },
    { id: "s3", name: "مریم نوروزی", email: "maryam@50500.co", role: "پشتیبانی مشتریان", active: false, lastSeen: d(9), perms: { orders: perm(true, true), products: perm(true, false), customers: perm(true, true), coupons: perm(true, false), reviews: perm(true, true), content: perm(false, false), finance: perm(false, false), affiliates: perm(false, false) } },
  ];

  const settings: AdminSettings = {
    storeName: "فروشگاه 50500",
    phone: "۰۲۱-۹۱۰50500",
    email: "info@store50500.ir",
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

export function loadAdmin(): AdminState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    const base = seed();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      audit: parsed.audit ?? base.audit,
      affiliates: parsed.affiliates ?? base.affiliates,
      finance: parsed.finance ?? base.finance,
      staff: parsed.staff ?? base.staff,
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
