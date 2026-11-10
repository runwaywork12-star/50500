import { useCallback, useEffect, useState } from "react";
import { api, isServerMode, orderToken, rememberOrderToken } from "./api";
import { getOrder, type CartItem, type Order, type OrderCustomer } from "./cart";
import { getProduct, productCartImage } from "./catalog";

type ServerOrder = Omit<Order, "items" | "paymentStatus"> & {
  items: (CartItem & { title: string; price: number })[];
  paymentStatus: string;
  tracking?: string | null;
  expiresAt?: string | null;
};

/** Server orders carry no images; the storefront derives them from the catalog. */
export function fromServerOrder(o: ServerOrder): Order & { tracking?: string | null; expiresAt?: string | null } {
  return {
    ...o,
    items: o.items.map((item) => ({ ...item, image: productCartImage(getProduct(item.slug), item.leather) })),
    paymentStatus: (o.paymentStatus === "paid_review" ? "paid" : o.paymentStatus) as Order["paymentStatus"],
  };
}

export async function placeServerOrder(input: { items: CartItem[]; customer: OrderCustomer; shippingMethod: string; payment: string; coupon: string | null }) {
  const res = await api<{ order: ServerOrder; accessToken: string }>("/api/orders", { method: "POST", body: input });
  rememberOrderToken(res.order.code, res.accessToken);
  return fromServerOrder(res.order);
}

export async function trackServerOrder(code: string, phone: string) {
  const res = await api<{ order: ServerOrder }>("/api/orders/track", { method: "POST", body: { code, phone } });
  return fromServerOrder(res.order);
}

/** Loads an order the visitor is allowed to see (access token from checkout, or own account). */
export function useOrder(code: string | undefined) {
  const [order, setOrder] = useState<ReturnType<typeof fromServerOrder> | undefined>(() => (isServerMode() ? undefined : getOrder(code ?? "")));
  const [loading, setLoading] = useState(isServerMode());
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!isServerMode()) { setOrder(getOrder(code ?? "")); return; }
    if (!code) { setLoading(false); return; }
    setLoading(true);
    try {
      const token = orderToken(code);
      const res = await api<{ order: ServerOrder }>(`/api/orders/${encodeURIComponent(code)}`, { headers: token ? { "x-order-token": token } : {} });
      setOrder(fromServerOrder(res.order));
      setError("");
    } catch (e) {
      setOrder(undefined);
      setError(e instanceof Error ? e.message : "خطا در دریافت سفارش");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { void reload(); }, [reload]);
  return { order, loading, error, reload, setOrder };
}

export function useAccountOrders(enabled: boolean, demo: () => Order[]) {
  const [orders, setOrders] = useState<Order[]>(() => (isServerMode() || !enabled ? [] : demo()));
  useEffect(() => {
    if (!enabled) { setOrders([]); return; }
    if (!isServerMode()) { setOrders(demo()); return; }
    let alive = true;
    api<{ orders: ServerOrder[] }>("/api/account/orders")
      .then((res) => { if (alive) setOrders(res.orders.map(fromServerOrder)); })
      .catch(() => { if (alive) setOrders([]); });
    return () => { alive = false; };
  }, [enabled]);
  return orders;
}
