import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct, type Product } from "./catalog";
import { COUPONS, DEMO_ORDERS, shippingCost } from "@/data/content";
import { normalizePhone } from "./format";
import { img } from "@/lib/images";

export type CartItem = {
 slug: string;
 qty: number;
 leather?: string;
 thread?: string;
};

export type OrderCustomer = {
 name: string;
 phone: string;
 province: string;
 city: string;
 address: string;
 postalCode: string;
 notes: string;
};

export type Order = {
 code: string;
 items: (CartItem & { title: string; price: number; image: string })[];
 customer: OrderCustomer;
 shippingMethod: string;
 payment: string;
 coupon: string | null;
 subtotal: number;
 discount: number;
 shipping: number;
 total: number;
 status: string;
 paymentStatus: "paid" | "pending" | "cod";
 createdAt: string;
};

const CART_KEY = "50500_cart_v1";
const COUPON_KEY = "50500_coupon_v1";
const ORDERS_KEY = "50500_orders_v1";

type CartContextValue = {
 items: CartItem[];
 coupon: string | null;
 addItem: (item: CartItem) => void;
 removeItem: (slug: string, leather?: string, thread?: string) => void;
 setQty: (slug: string, qty: number, leather?: string, thread?: string) => void;
 clear: () => void;
 applyCoupon: (code: string) => { ok: boolean; message: string };
 removeCoupon: () => void;
 detailed: (CartItem & { product: Product })[];
 count: number;
 subtotal: number;
 discount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function sameItem(a: CartItem, b: CartItem) {
 return a.slug === b.slug && a.leather === b.leather && a.thread === b.thread;
}

function load<T>(key: string, fallback: T): T {
 try {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
 } catch {
  return fallback;
 }
}

export function CartProvider({ children }: { children: ReactNode }) {
 const [items, setItems] = useState<CartItem[]>(() => load<CartItem[]>(CART_KEY, []));
 const [coupon, setCoupon] = useState<string | null>(() => load<string | null>(COUPON_KEY, null));

 useEffect(() => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
 }, [items]);
 useEffect(() => {
  if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
  else localStorage.removeItem(COUPON_KEY);
 }, [coupon]);

 const addItem = useCallback((item: CartItem) => {
  setItems((prev) => {
   const found = prev.find((p) => sameItem(p, item));
   if (found) return prev.map((p) => (sameItem(p, item) ? { ...p, qty: p.qty + item.qty } : p));
   return [...prev, item];
  });
 }, []);

 const removeItem = useCallback((slug: string, leather?: string, thread?: string) => {
  setItems((prev) => prev.filter((p) => !(p.slug === slug && p.leather === leather && p.thread === thread)));
 }, []);

 const setQty = useCallback((slug: string, qty: number, leather?: string, thread?: string) => {
  setItems((prev) =>
   qty <= 0
    ? prev.filter((p) => !(p.slug === slug && p.leather === leather && p.thread === thread))
    : prev.map((p) => (p.slug === slug && p.leather === leather && p.thread === thread ? { ...p, qty } : p)),
  );
 }, []);

 const clear = useCallback(() => setItems([]), []);

 const applyCoupon = useCallback((code: string) => {
  const c = COUPONS[code.trim().toUpperCase()];
  if (!c) return { ok: false, message: "کد تخفیف نامعتبر است" };
  setCoupon(code.trim().toUpperCase());
  return { ok: true, message: `${c.label} با موفقیت اعمال شد` };
 }, []);

 const removeCoupon = useCallback(() => setCoupon(null), []);

 const detailed = useMemo(
  () =>
   items
    .map((it) => ({ ...it, product: getProduct(it.slug) }))
    .filter((x): x is CartItem & { product: Product } => Boolean(x.product)),
  [items],
 );

 const subtotal = useMemo(() => detailed.reduce((s, x) => s + x.product.price * x.qty, 0), [detailed]);
 const discount = useMemo(() => {
  const c = coupon ? COUPONS[coupon] : null;
  return c ? Math.round((subtotal * c.percent) / 100) : 0;
 }, [subtotal, coupon]);
 const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);

 const value: CartContextValue = {
  items,
  coupon,
  addItem,
  removeItem,
  setQty,
  clear,
  applyCoupon,
  removeCoupon,
  detailed,
  count,
  subtotal,
  discount,
 };
 return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
 const ctx = useContext(CartContext);
 if (!ctx) throw new Error("useCart must be used within CartProvider");
 return ctx;
}

/* -- orders -- */

function storedOrders(): Order[] {
 return load<Order[]>(ORDERS_KEY, []);
}

export function saveOrder(order: Order) {
 const all = storedOrders();
 all.unshift(order);
 localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
}

/** Normalize a demo order (flat shape) into the full Order shape. */
function normalizeDemo(o: (typeof DEMO_ORDERS)[number]): Order {
  return {
    code: o.code,
    items: [{ slug: "demo", qty: 1, title: o.items[0] ?? "محصول 50500", price: o.total, image: img("images/mat-black-red.webp") }],
    customer: { name: o.name, phone: o.phone, province: "", city: o.city, address: "—", postalCode: "", notes: "" },
    shippingMethod: "post",
    payment: o.payment === "paid" ? "online" : "cod",
    coupon: null,
    subtotal: o.total,
    discount: 0,
    shipping: 0,
    total: o.total,
    status: o.status,
    paymentStatus: o.payment === "paid" ? "paid" : "pending",
    createdAt: new Date().toISOString(),
  };
}

export function getOrder(code: string): Order | undefined {
  const c = code.trim();
  const stored = storedOrders().find((o) => o.code === c);
  if (stored) return stored;
  const demo = DEMO_ORDERS.find((o) => o.code === c);
  return demo ? normalizeDemo(demo) : undefined;
}

export function findOrders(phone: string): Order[] {
  const p = normalizePhone(phone);
  const stored = storedOrders().filter((o) => normalizePhone(o.customer.phone) === p || o.customer.phone === p);
  const demo = DEMO_ORDERS.filter((o) => o.phone === p).map(normalizeDemo);
  return [...stored, ...demo];
}

export function markOrderPaid(code: string) {
  const all = storedOrders();
  const i = all.findIndex((o) => o.code === code);
  if (i >= 0) {
    all[i] = { ...all[i], paymentStatus: "paid", status: "confirmed" };
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    return;
  }
  const demo = DEMO_ORDERS.find((o) => o.code === code);
  if (demo) {
    all.unshift({ ...normalizeDemo(demo), paymentStatus: "paid", status: "confirmed" });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
  }
}

export function createOrder(input: {
 items: CartItem[];
 customer: OrderCustomer;
 shippingMethod: string;
 payment: string;
 coupon: string | null;
}): Order {
 const detailed = input.items
  .map((it) => ({ ...it, product: getProduct(it.slug) }))
  .filter((x): x is CartItem & { product: Product } => Boolean(x.product));
 const subtotal = detailed.reduce((s, x) => s + x.product.price * x.qty, 0);
 const c = input.coupon ? COUPONS[input.coupon] : null;
 const discount = c ? Math.round((subtotal * c.percent) / 100) : 0;
 const shipping = shippingCost(input.shippingMethod, subtotal - discount);
 const code = String(50000000 + Math.floor(Math.random() * 49999999));
 const order: Order = {
  code,
  items: detailed.map((x) => ({
   slug: x.slug,
   qty: x.qty,
   leather: x.leather,
   thread: x.thread,
   title: x.product.title,
   price: x.product.price,
   image: x.product.image,
  })),
  customer: { ...input.customer, phone: normalizePhone(input.customer.phone) },
  shippingMethod: input.shippingMethod,
  payment: input.payment,
  coupon: input.coupon,
  subtotal,
  discount,
  shipping,
  total: subtotal - discount + shipping,
  status: input.payment === "online" ? "pending" : "pending",
  paymentStatus: input.payment === "online" ? "pending" : "cod",
  createdAt: new Date().toISOString(),
 };
 saveOrder(order);
 return order;
}
