"use client";

import Image from "next/image";
import { ThemeLink as Link } from "@/components/ThemeLink";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { CircleCheck, CreditCard, LoaderCircle, Lock, MapPin, Package, TicketPercent, Truck, User, Wallet } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn, fa, normalizePhone, toEnDigits } from "@/lib/format";
import { PAYMENT_METHODS, PROVINCES, SHIPPING_METHODS, shippingCost } from "@/lib/options";
import { themePath } from "@/lib/theme-path";

type Form = { customerName: string; phone: string; province: string; city: string; address: string; postalCode: string; notes: string };

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const pathname = usePathname();
  const { items, ready, subtotal, clear } = useCart();
  const [form, setForm] = useState<Form>({ customerName: "", phone: "", province: "تهران", city: "", address: "", postalCode: "", notes: "" });
  const [shipping, setShipping] = useState("post");
  const [payment, setPayment] = useState("online");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const discount = coupon?.discount ?? 0;
  const ship = shippingCost(shipping, subtotal - discount);
  const total = subtotal - discount + ship;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, subtotal }),
      });
      const data = (await res.json()) as { ok: boolean; code?: string; discount?: number; message: string };
      if (data.ok && data.code) {
        setCoupon({ code: data.code, discount: data.discount ?? 0 });
        setCouponMsg({ ok: true, text: data.message });
      } else {
        setCoupon(null);
        setCouponMsg({ ok: false, text: data.message });
      }
    } catch {
      setCouponMsg({ ok: false, text: "خطا در بررسی کد تخفیف" });
    } finally {
      setCouponLoading(false);
    }
  };

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (form.customerName.trim().length < 3) e.customerName = "نام و نام خانوادگی را کامل وارد کنید";
    if (!/^09\d{9}$/.test(normalizePhone(form.phone))) e.phone = "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)";
    if (form.city.trim().length < 2) e.city = "شهر را وارد کنید";
    if (form.address.trim().length < 10) e.address = "آدرس را کامل‌تر وارد کنید";
    const pc = toEnDigits(form.postalCode).replace(/\D/g, "");
    if (pc && pc.length !== 10) e.postalCode = "کد پستی باید ۱۰ رقم باشد";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: normalizePhone(form.phone),
          shippingMethod: shipping,
          paymentMethod: payment,
          couponCode: coupon?.code ?? "",
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })),
        }),
      });
      const data = (await res.json()) as { code?: string; paymentMethod?: string; error?: string };
      if (!res.ok || !data.code) {
        setServerError(data.error ?? "ثبت سفارش ناموفق بود");
        setSubmitting(false);
        return;
      }
      setPlaced(true);
      clear();
      router.push(themePath(pathname, data.paymentMethod === "online" ? `/pay/${data.code}` : `/order/${data.code}`));
    } catch {
      setServerError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید");
      setSubmitting(false);
    }
  };

  if (!ready || placed) {
    return (
      <div className="surface grid place-items-center gap-4 rounded-3xl py-24 text-center">
        <LoaderCircle className="size-10 animate-spin text-brand-400" />
        <p className="text-sm tdim">{placed ? "سفارش ثبت شد؛ در حال انتقال..." : "در حال بارگذاری..."}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="surface grid place-items-center gap-4 rounded-3xl py-20 text-center">
        <Package className="size-12 tfaint" />
        <p className="text-lg font-black">سبد خرید شما خالی است</p>
        <Link href="/products" className="btn btn-primary px-6 py-3">
          رفتن به فروشگاه
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_400px]" noValidate>
      <div className="grid content-start gap-6">
        <section className="surface rounded-3xl p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <User className="size-5 text-brand-400" /> اطلاعات گیرنده
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی *" error={errors.customerName}>
              <input className="input" value={form.customerName} onChange={set("customerName")} placeholder="مثلاً: علی محمدی" autoComplete="name" />
            </Field>
            <Field label="شماره موبایل *" error={errors.phone}>
              <input className="input text-left" dir="ltr" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="09121234567" autoComplete="tel" />
            </Field>
            <Field label="استان *">
              <select className="input" value={form.province} onChange={set("province")}>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="شهر *" error={errors.city}>
              <input className="input" value={form.city} onChange={set("city")} placeholder="نام شهر" />
            </Field>
            <Field label="آدرس کامل پستی *" error={errors.address} className="sm:col-span-2">
              <textarea className="input min-h-24 resize-y leading-7" value={form.address} onChange={set("address")} placeholder="خیابان، کوچه، پلاک، واحد" autoComplete="street-address" />
            </Field>
            <Field label="کد پستی (اختیاری)" error={errors.postalCode}>
              <input className="input text-left" dir="ltr" inputMode="numeric" value={form.postalCode} onChange={set("postalCode")} placeholder="1234567890" />
            </Field>
            <Field label="توضیحات سفارش (اختیاری)">
              <input className="input" value={form.notes} onChange={set("notes")} placeholder="مثلاً: گلدوزی نام روی کفپوش" />
            </Field>
          </div>
        </section>

        <section className="surface rounded-3xl p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Truck className="size-5 text-brand-400" /> روش ارسال
          </h2>
          <div className="mt-5 grid gap-3">
            {SHIPPING_METHODS.map((m) => {
              const cost = shippingCost(m.id, subtotal - discount);
              const active = shipping === m.id;
              return (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition",
                    active ? "border-brand-500/70 bg-brand-500/10" : "bd bd-h",
                  )}
                >
                  <input type="radio" name="shipping" value={m.id} checked={active} onChange={() => setShipping(m.id)} className="sr-only" />
                  <span className={cn("grid size-5 place-items-center rounded-full border-2", active ? "border-brand-500" : "bd")}>
                    {active && <span className="size-2.5 rounded-full bg-brand-500" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">{m.name}</span>
                    <span className="mt-1 block text-xs tdim">{m.desc}</span>
                  </span>
                  <span className="text-sm font-bold">{m.id === "tipax" ? "پس‌کرایه" : cost === 0 ? <span className="text-emerald-300">رایگان</span> : `${fa(cost)} تومان`}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="surface rounded-3xl p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Wallet className="size-5 text-brand-400" /> روش پرداخت
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {PAYMENT_METHODS.map((m) => {
              const active = payment === m.id;
              return (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
                    active ? "border-brand-500/70 bg-brand-500/10" : "bd bd-h",
                  )}
                >
                  <input type="radio" name="payment" value={m.id} checked={active} onChange={() => setPayment(m.id)} className="sr-only" />
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", active ? "bg-brand-500 text-[#fff]" : "soft tdim")}>
                    {m.id === "online" ? <CreditCard className="size-5" /> : <MapPin className="size-5" />}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{m.name}</span>
                    <span className="mt-1 block text-xs leading-6 tdim">{m.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="surface rounded-3xl p-5 sm:p-6">
          <h2 className="text-lg font-black">سفارش شما</h2>
          <div className="mt-4 grid max-h-64 gap-3 overflow-y-auto pe-1">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ink-700">
                  <Image src={i.image || "/api/site-image/mat"} alt="" fill sizes="56px" className="object-cover" />
                  <span className="absolute bottom-0.5 end-0.5 grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-black">{fa(i.quantity)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-xs font-bold">{i.title}</span>
                  <span className="line-clamp-1 text-[11px] tdim">{i.options.map((o) => o.value).join(" · ")}</span>
                </span>
                <span className="shrink-0 text-xs font-bold">{fa(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t bd pt-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <TicketPercent className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 tdim" />
                <input
                  className="input ps-9 text-sm"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="کد تخفیف (مثلاً 50500)"
                  disabled={!!coupon}
                />
              </div>
              {coupon ? (
                <button
                  type="button"
                  onClick={() => {
                    setCoupon(null);
                    setCouponMsg(null);
                    setCouponInput("");
                  }}
                  className="btn btn-ghost px-4 text-sm"
                >
                  حذف
                </button>
              ) : (
                <button type="button" onClick={applyCoupon} disabled={couponLoading} className="btn btn-ghost px-4 text-sm">
                  {couponLoading ? <LoaderCircle className="size-4 animate-spin" /> : "اعمال"}
                </button>
              )}
            </div>
            {couponMsg && <p className={cn("mt-2 text-xs", couponMsg.ok ? "text-emerald-300" : "text-rose-300")}>{couponMsg.text}</p>}
          </div>

          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between tdim">
              <dt>جمع کالاها</dt>
              <dd>{fa(subtotal)} تومان</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-300">
                <dt>تخفیف ({coupon?.code})</dt>
                <dd>− {fa(discount)} تومان</dd>
              </div>
            )}
            <div className="flex justify-between tdim">
              <dt>هزینه ارسال</dt>
              <dd>{shipping === "tipax" ? "پس‌کرایه" : ship === 0 ? "رایگان" : `${fa(ship)} تومان`}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t bd pt-4">
              <dt className="font-bold">مبلغ قابل پرداخت</dt>
              <dd className="text-2xl font-black text-brand-300">
                {fa(total)} <span className="text-xs font-medium tdim">تومان</span>
              </dd>
            </div>
          </dl>

          {serverError && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{serverError}</p>}

          <button type="submit" disabled={submitting} className="btn btn-primary shine mt-6 w-full py-4 text-base">
            {submitting ? <LoaderCircle className="size-5 animate-spin" /> : payment === "online" ? <Lock className="size-5" /> : <CircleCheck className="size-5" />}
            {payment === "online" ? "پرداخت و ثبت سفارش" : "ثبت نهایی سفارش"}
          </button>
          <p className="mt-3 text-center text-[11px] leading-6 tdim">ثبت سفارش به معنی پذیرش قوانین و شرایط فروشگاه ۵۰۵۰۰ است.</p>
        </div>
      </aside>
    </form>
  );
}
