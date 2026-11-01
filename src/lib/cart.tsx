"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type CartOption = { key: string; label: string; value: string; hex?: string };
export type CartItem = {
  id: string;
  productId: number;
  slug: string;
  title: string;
  image: string;
  price: number;
  comparePrice: number | null;
  quantity: number;
  options: CartOption[];
};
export type AddToCartInput = Omit<CartItem, "id" | "quantity">;

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  compareTotal: number;
  add: (item: AddToCartInput, qty?: number, silent?: boolean) => void;
  update: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "store-50500-cart-v1";
const MAX_QTY = 10;

function isCartItem(v: unknown): v is CartItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.productId === "number" && typeof o.price === "number" && typeof o.quantity === "number";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<{ title: string; image: string; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      }
    } catch {
      // ignore corrupted storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const synced = useRef(false);
  useEffect(() => {
    if (!ready || synced.current) return;
    synced.current = true;
    const ids = Array.from(new Set(items.map((i) => i.productId)));
    if (!ids.length) return;
    fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: { id: number; slug: string; title: string; price: number; comparePrice: number | null; image: string }[] }>) : null))
      .then((data) => {
        if (!data) return;
        const map = new Map(data.items.map((p) => [p.id, p]));
        setItems((prev) =>
          prev
            .filter((i) => map.has(i.productId))
            .map((i) => {
              const p = map.get(i.productId)!;
              return { ...i, slug: p.slug, title: p.title, price: p.price, comparePrice: p.comparePrice, image: p.image || i.image };
            }),
        );
      })
      .catch(() => undefined);
  }, [ready, items]);

  const add = useCallback((input: AddToCartInput, qty = 1, silent = false) => {
    const id = [input.productId, ...input.options.map((o) => `${o.key}:${o.value}`)].join("|");
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + qty) } : i));
      }
      return [...prev, { ...input, id, quantity: Math.min(MAX_QTY, Math.max(1, qty)) }];
    });
    if (!silent) {
      setToast({ title: input.title, image: input.image, key: Date.now() });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 3800);
    }
  }, []);

  const update = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QTY, qty) } : i)),
    );
  }, []);

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const compareTotal = items.reduce((s, i) => s + Math.max(i.comparePrice ?? i.price, i.price) * i.quantity, 0);
    return { items, ready, count, subtotal, compareTotal, add, update, remove, clear };
  }, [items, ready, add, update, remove, clear]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast && (
        <div
          key={toast.key}
          className="fixed bottom-24 left-4 right-4 z-[70] mx-auto max-w-sm animate-fade-up sm:right-auto sm:bottom-6 lg:left-6"
          role="status"
        >
          <div className="glass flex items-center gap-3 rounded-2xl bg-ink-800/90 p-3 shadow-2xl shadow-black/60">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ink-700">
              <Image src={toast.image} alt="" fill sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CircleCheck className="size-4" /> به سبد خرید اضافه شد
              </div>
              <p className="mt-1 truncate text-sm text-white/80">{toast.title}</p>
            </div>
            <Link href="/cart" className="btn btn-primary shrink-0 px-3 py-2 text-xs" onClick={() => setToast(null)}>
              مشاهده سبد
            </Link>
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white" aria-label="بستن">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
