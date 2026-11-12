import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Landmark, ShieldCheck, Truck, Wallet } from "lucide-react";
import { PageHero } from "@/components/ui";
import { MobileCheckout } from "@/components/store/MobileCheckout";
import { createOrder, useCart, type OrderCustomer } from "@/lib/cart";
import { PAYMENT_METHODS, SHIPPING_METHODS, shippingCost } from "@/data/content";
import { cn, fa, maskPhone, money, normalizePhone } from "@/lib/format";

const empty: OrderCustomer = { name: "", phone: "", province: "", city: "", address: "", postalCode: "", notes: "" };

export default function Checkout() {
 const { detailed, subtotal, discount, coupon, clear } = useCart();
 const navigate = useNavigate();
 const [form, setForm] = useState<OrderCustomer>(empty);
 const [shippingMethod, setShippingMethod] = useState("post");
 const [payment, setPayment] = useState("online");
 const [errors, setErrors] = useState<Record<string, string>>({});

 const afterDiscount = subtotal - discount;
 const shipping = useMemo(() => shippingCost(shippingMethod, afterDiscount), [shippingMethod, afterDiscount]);
 const total = afterDiscount + shipping;

 if (detailed.length === 0 && Object.values(form).every((v) => v === "")) {
  return (
   <>
    <div className="lg:hidden"><MobileCheckout /></div>
    <div className="hidden lg:block">
     <PageHero eyebrow="تسویه حساب" title="سبد خرید خالی است" desc="ابتدا محصولی را به سبد اضافه کنید." />
     <div className="container-x py-16 text-center">
      <Link to="/products" className="btn btn-primary px-6 py-3 text-sm">رفتن به فروشگاه <ArrowLeft className="size-4" /></Link>
     </div>
    </div>
   </>
  );
 }

 const set = (k: keyof OrderCustomer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  setForm((f) => ({ ...f, [k]: e.target.value }));

 const validate = (): boolean => {
  const errs: Record<string, string> = {};
  if (form.name.trim().length < 3) errs.name = "نام و نام خانوادگی را کامل وارد کنید";
  const phone = normalizePhone(form.phone);
  if (!/^09\d{9}$/.test(phone)) errs.phone = "شماره موبایل معتبر نیست (مثلاً 09121234567)";
  if (!form.province.trim()) errs.province = "استان را وارد کنید";
  if (!form.city.trim()) errs.city = "شهر را وارد کنید";
  if (form.address.trim().length < 10) errs.address = "نشانی کامل را وارد کنید";
  if (form.postalCode && !/^\d{10}$/.test(form.postalCode.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString()))) errs.postalCode = "کد پستی ۱۰ رقمی است";
  setErrors(errs);
  return Object.keys(errs).length === 0;
 };

 const submit = (e: FormEvent) => {
  e.preventDefault();
  if (!validate()) return;
  const order = createOrder({ items: detailed.map((d) => ({ slug: d.slug, qty: d.qty, leather: d.leather, thread: d.thread })), customer: form, shippingMethod, payment, coupon });
  clear();
  navigate(payment === "online" ? `/pay/${order.code}` : `/order/${order.code}`);
 };

 return (
  <>
   <div className="lg:hidden"><MobileCheckout /></div>
   <div className="hidden lg:block">
   <PageHero eyebrow="تسویه حساب" title="تکمیل سفارش" desc="اطلاعات ارسال را وارد کنید و روش پرداخت را انتخاب کنید" />
   <div className="container-x py-10 lg:py-14">
    {/* steps */}
    <ol className="mb-8 flex items-center gap-2 text-xs font-bold">
     {[ ["۱", "سبد خرید", true], ["۲", "اطلاعات ارسال", true], ["۳", "پرداخت", false] ].map(([n, label, done], i) => (
      <li key={label as string} className="flex flex-1 items-center gap-2">
       <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-black", done ? "bg-brand-500 text-white" : "border bd tfaint")}>{n}</span>
       <span className={done ? "" : "tfaint"}>{label}</span>
       {i < 2 && <span className="h-px flex-1" style={{ background: "var(--line-strong)" }} />}
      </li>
     ))}
    </ol>

    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
     <div className="grid content-start gap-6">
      {/* customer */}
      <section className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
       <h2 className="flex items-center gap-2 text-base font-black"><Wallet className="size-5 text-brand-400" /> اطلاعات گیرنده</h2>
       <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی" error={errors.name}>
         <input className="input" placeholder="مثلاً: علی محمدی" value={form.name} onChange={set("name")} autoComplete="name" />
        </Field>
        <Field label="شماره موبایل" error={errors.phone}>
         <input className="input" dir="ltr" inputMode="tel" placeholder="09121234567" value={form.phone} onChange={set("phone")} autoComplete="tel" />
        </Field>
        <Field label="استان" error={errors.province}>
         <input className="input" placeholder="مثلاً: تهران" value={form.province} onChange={set("province")} />
        </Field>
        <Field label="شهر" error={errors.city}>
         <input className="input" placeholder="نام شهر" value={form.city} onChange={set("city")} />
        </Field>
        <div className="sm:col-span-2">
         <Field label="نشانی دقیق" error={errors.address}>
          <textarea className="input min-h-24 resize-y" placeholder="خیابان، کوچه، پلاک، واحد" value={form.address} onChange={set("address")} autoComplete="street-address" />
         </Field>
        </div>
        <Field label="کد پستی (اختیاری)" error={errors.postalCode}>
         <input className="input" dir="ltr" inputMode="numeric" placeholder="1234567890" value={form.postalCode} onChange={set("postalCode")} />
        </Field>
        <Field label="یادداشت سفارش (اختیاری)">
         <input className="input" placeholder="مثلاً: گلدوزی نام روی کفپوش" value={form.notes} onChange={set("notes")} />
        </Field>
       </div>
      </section>

      {/* shipping */}
      <section className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
       <h2 className="flex items-center gap-2 text-base font-black"><Truck className="size-5 text-brand-400" /> روش ارسال</h2>
       <div className="mt-5 grid gap-3">
        {SHIPPING_METHODS.map((m) => {
         const cost = shippingCost(m.id, afterDiscount);
         return (
          <label
           key={m.id}
           className={cn(
            "flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition",
            shippingMethod === m.id ? "border-brand-500/60 bg-brand-500/10" : "bd hover:border-brand-500/30",
           )}
          >
           <input type="radio" name="shipping" className="size-4 accent-[#ff6b1a]" checked={shippingMethod === m.id} onChange={() => setShippingMethod(m.id)} />
           <span className="flex-1">
            <b className="block text-sm">{m.name}</b>
            <span className="mt-0.5 block text-xs tdim">{m.desc}</span>
           </span>
           <span className="text-sm font-black">{cost === 0 ? <span className="text-emerald-400">رایگان</span> : money(cost)}</span>
          </label>
         );
        })}
       </div>
      </section>

      {/* payment */}
      <section className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
       <h2 className="flex items-center gap-2 text-base font-black"><CreditCard className="size-5 text-brand-400" /> روش پرداخت</h2>
       <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((m) => (
         <label
          key={m.id}
          className={cn(
           "flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition",
           payment === m.id ? "border-brand-500/60 bg-brand-500/10" : "bd hover:border-brand-500/30",
          )}
         >
          <input type="radio" name="payment" className="mt-1 size-4 accent-[#ff6b1a]" checked={payment === m.id} onChange={() => setPayment(m.id)} />
          <span>
           <b className="flex items-center gap-2 text-sm">{m.id === "online" ? <Landmark className="size-4 text-brand-400" /> : <Wallet className="size-4 text-brand-400" />} {m.name}</b>
           <span className="mt-1 block text-xs leading-5 tdim">{m.desc}</span>
          </span>
         </label>
        ))}
       </div>
       <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[11px] font-bold leading-5 text-emerald-400">
        <ShieldCheck className="size-4 shrink-0" /> پرداخت कि seguro — در این نسخه نمایشی، درگاه ökumen sandboxed است و پولی کسر نمی‌شود.
       </p>
      </section>
     </div>

     {/* summary */}
     <aside className="lg:sticky lg:top-32 lg:self-start">
      <div className="rounded-3xl border bd p-6" style={{ background: "var(--surface-1)" }}>
       <h2 className="text-base font-black">سفارش شما</h2>
       <ul className="mt-4 grid max-h-64 gap-3 overflow-y-auto pe-1">
        {detailed.map((x) => (
         <li key={`${x.slug}-${x.leather ?? ""}`} className="flex items-center gap-3 text-sm">
          <img src={x.product.image} alt="" className="size-12 shrink-0 rounded-xl object-cover" style={{ background: "var(--muted-surface)" }} />
          <span className="min-w-0 flex-1">
           <span className="block truncate font-bold">{x.product.title}</span>
           <span className="text-xs tfaint">× {fa(x.qty)}</span>
          </span>
          <b className="text-xs">{money(x.product.price * x.qty)}</b>
         </li>
        ))}
       </ul>
       <dl className="mt-5 grid gap-3 border-t bd pt-4 text-sm">
        <div className="flex justify-between tdim"><dt>جمع کالاها</dt><dd className="font-bold">{money(subtotal)}</dd></div>
        {discount > 0 && (
         <div className="flex justify-between text-emerald-400"><dt>تخفیف کد {coupon}</dt><dd className="font-bold">−{money(discount)}</dd></div>
        )}
        <div className="flex justify-between tdim"><dt>ارسال</dt><dd className="font-bold">{shipping === 0 ? <span className="text-emerald-400">رایگان</span> : money(shipping)}</dd></div>
        <div className="flex justify-between text-lg font-black"><dt>قابل پرداخت</dt><dd>{money(total)}</dd></div>
       </dl>
       <button type="submit" className="btn btn-primary shine mt-5 w-full py-4 text-sm">
        {payment === "online" ? "پرداخت آنلاین و ثبت سفارش" : "ثبت سفارش (پرداخت در محل)"} <ArrowLeft className="size-5" />
       </button>
       <p className="mt-3 text-center text-[11px] leading-5 tfaint">
        برای پیگیری بعدی، کد سفارش و شماره موبایل خود را یادداشت کنید — از صفحه «پیگیری سفارش» قابل رهگیری است.
        <br />شمارهutan backed: {form.phone ? maskPhone(normalizePhone(form.phone)) : "—"}
       </p>
      </div>
     </aside>
    </form>
   </div>
   </div>
  </>
 );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
 return (
  <label className="grid gap-1.5">
   <span className="text-xs font-bold tdim">{label}</span>
   {children}
   {error && <span className="text-[11px] font-bold text-rose-400">{error}</span>}
  </label>
 );
}
