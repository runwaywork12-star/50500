import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronDown, CreditCard, LoaderCircle,
  MapPin, Minus, PackageSearch, Phone, Plus, ShieldCheck, ShoppingBag, Tag, Trash2,
  Truck, UserRound, Wallet,
} from "lucide-react";
import { createOrder, useCart, type OrderCustomer } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { PAYMENT_METHODS, SHIPPING_METHODS, matImageFor, shippingCost } from "@/data/content";
import { fa, normalizePhone } from "@/lib/format";
import { cn } from "@/lib/format";
import styles from "./MobileCheckout.module.css";

/* ------------------------------------------------------------------ *
 * Mobile-first, 3-step checkout.
 * One decision per screen, big touch targets, sticky total, draft
 * persisted in sessionStorage so a phone call or refresh never loses
 * the customer's progress.
 * ------------------------------------------------------------------ */

const DRAFT_KEY = "50500_mobile_checkout_v1";
const STEPS = [
  { id: 0, label: "سبد خرید", title: "سبد تو" },
  { id: 1, label: "ارسال", title: "اطلاعات ارسال" },
  { id: 2, label: "پرداخت", title: "پرداخت" },
] as const;

const EMPTY: OrderCustomer = { name: "", phone: "", province: "", city: "", address: "", postalCode: "", notes: "" };
type Draft = { form: OrderCustomer; shippingMethod: string; payment: string };

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Draft>;
      return {
        form: { ...EMPTY, ...(parsed.form ?? {}) },
        shippingMethod: parsed.shippingMethod ?? "post",
        payment: parsed.payment ?? "online",
      };
    }
  } catch { /* private mode */ }
  return { form: { ...EMPTY }, shippingMethod: "post", payment: "online" };
}

const money = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));
const digitsFa = (v: string) =>
  v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "");
const prettyPhone = (v: string) => {
  const d = digitsFa(v).slice(0, 11);
  return d.length > 7 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
};

export function MobileCheckout() {
  const { detailed, subtotal, discount, coupon, setQty, removeItem, applyCoupon, removeCoupon } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const initial = useMemo(loadDraft, []);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const { form, shippingMethod, payment } = draft;
  const count = detailed.reduce((s, x) => s + x.qty, 0);
  const afterDiscount = subtotal - discount;
  const shipping = useMemo(() => shippingCost(shippingMethod, afterDiscount), [shippingMethod, afterDiscount]);
  const total = afterDiscount + shipping;
  const payLabel = PAYMENT_METHODS.find((m) => m.id === payment)?.name ?? "پرداخت اینترنتی";

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
  }, [draft]);

  const goTo = (next: number) => {
    setErrors({});
    setSubmitError("");
    setStep(Math.max(0, Math.min(2, next)));
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const setForm = (key: keyof OrderCustomer, value: string) =>
    setDraft((d) => ({ ...d, form: { ...d.form, [key]: value } }));

  const validateShipping = () => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 3) errs.name = "نام و نام خانوادگی را کامل بنویسید";
    if (!/^09\d{9}$/.test(normalizePhone(form.phone))) errs.phone = "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد";
    if (form.province.trim().length < 2) errs.province = "استان را وارد کنید";
    if (form.city.trim().length < 2) errs.city = "شهر را وارد کنید";
    if (form.address.trim().length < 10) errs.address = "نشانی را کامل بنویسید (خیابان، کوچه، پلاک)";
    if (form.postalCode && digitsFa(form.postalCode).length !== 10) errs.postalCode = "کد پستی باید ۱۰ رقم باشد";
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      const el = focusRef.current[first];
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(() => el?.focus({ preventScroll: true }), 260);
      return false;
    }
    return true;
  };

  const next = () => {
    if (step === 0) {
      if (detailed.length === 0) return;
      return goTo(1);
    }
    if (step === 1) {
      if (!validateShipping()) return;
      return goTo(2);
    }
    submit();
  };

  const submit = () => {
    if (busy) return;
    if (!validateShipping()) { goTo(1); return; }
    setBusy(true);
    setSubmitError("");
    try {
      const order = createOrder({
        items: detailed.map((d) => ({ slug: d.slug, qty: d.qty, leather: d.leather, thread: d.thread })),
        customer: { ...form, phone: normalizePhone(form.phone) },
        shippingMethod,
        payment,
        coupon,
      });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      navigate(payment === "online" ? `/pay/${order.code}` : `/order/${order.code}`, { replace: true });
    } catch {
      setSubmitError("ثبت سفارش انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.");
      setBusy(false);
    }
  };

  const apply = () => {
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    setCouponMsg({ ok: res.ok, text: res.message });
    if (res.ok) setCouponInput("");
  };

  const stepTitle = STEPS[step].title;

  return (
    <div className={styles.wrap}>
      {/* ---------------- sticky header + progress ---------------- */}
      <div ref={topRef} className={styles.topbar}>
        <div className={styles.topRow}>
          <button
            type="button"
            className={styles.back}
            onClick={() => (step === 0 ? navigate("/cart") : goTo(step - 1))}
            aria-label={step === 0 ? "بازگشت به فروشگاه" : "مرحله قبل"}
          >
            <ArrowRight className="size-5" />
          </button>
          <div className={styles.headText}>
            <p className={styles.headTitle}>{stepTitle}</p>
            <p className={styles.headSub}>
              مرحله {fa(step + 1)} از {fa(3)} · خرید بدون نیاز به ثبت‌نام
            </p>
          </div>
          <span className={styles.stepCount}>{fa(count)} کالا</span>
        </div>

        <div className={styles.steps} role="list" aria-label="مراحل خرید">
          {STEPS.map((s) => {
            const state = s.id < step ? "done" : s.id === step ? "active" : "todo";
            return (
              <button
                key={s.id}
                type="button"
                role="listitem"
                className={styles.stepBtn}
                data-state={state}
                disabled={s.id > step}
                onClick={() => s.id < step && goTo(s.id)}
                aria-current={s.id === step ? "step" : undefined}
                aria-label={`${s.label}${state === "done" ? " (تکمیل شد)" : ""}`}
              >
                <span className={styles.stepBar}><i /></span>
                <span className={styles.stepLabel}>
                  {state === "done" ? <Check className="me-1 inline size-3" /> : null}
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={bodyRef} className={styles.body} key={step}>
        {/* ================= STEP 1 — cart ================= */}
        {step === 0 && (
          <>
            {detailed.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><ShoppingBag className="size-7" /></span>
                <p className="text-sm font-black">سبد خرید خالی است</p>
                <p className="max-w-xs text-xs leading-6 tdim">خودروی خود را انتخاب کنید و کفپوش اختصاصی‌اش را به سبد اضافه کنید.</p>
                <Link to="/products" className={styles.cta}>
                  <PackageSearch className="size-4" /> انتخاب خودرو و خرید
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.card}>
                  <p className={styles.cardHead}>
                    <ShoppingBag className="size-4" /> کالاهای سبد
                    <span className="ms-auto text-[11px] font-bold tfaint">{fa(count)} عدد</span>
                  </p>

                  {detailed.map((x) => {
                    const key = `${x.slug}-${x.leather ?? ""}-${x.thread ?? ""}`;
                    const img = x.leather ? matImageFor(x.leather) : x.product.image;
                    return (
                      <div key={key} className={styles.item}>
                        <Link to={`/products/${x.slug}`} className={styles.thumb}>
                          <img src={img} alt={x.product.title} loading="lazy" />
                        </Link>
                        <div className={styles.itemBody}>
                          <Link to={`/products/${x.slug}`} className={styles.itemTitle}>{x.product.title}</Link>
                          {(x.leather || x.thread) && (
                            <p className={styles.itemMeta}>
                              {[x.leather && `چرم ${x.leather === "black" ? "مشکی" : x.leather === "cream" ? "کرم" : x.leather === "tan" ? "عسلی" : x.leather}`,
                                x.thread && `گلدوزی ${x.thread === "red" ? "قرمز" : x.thread === "white" ? "سفید" : x.thread}`]
                                .filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <p className={styles.itemPrice}>
                            {money(x.product.price * x.qty)} <small>تومان</small>
                          </p>
                          <div className="flex items-center gap-2">
                            <div className={styles.qty}>
                              <button type="button" onClick={() => setQty(x.slug, x.qty - 1, x.leather, x.thread)} aria-label="کاهش تعداد">
                                <Minus className="size-4" />
                              </button>
                              <span className={styles.qtyValue}>{fa(x.qty)}</span>
                              <button type="button" onClick={() => setQty(x.slug, x.qty + 1, x.leather, x.thread)} aria-label="افزایش تعداد">
                                <Plus className="size-4" />
                              </button>
                            </div>
                            <button type="button" className={styles.trash} onClick={() => removeItem(x.slug, x.leather, x.thread)} aria-label="حذف از سبد">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* coupon */}
                <div className={styles.card}>
                  <p className={styles.cardHead}><Tag className="size-4" /> کد تخفیف</p>
                  {coupon ? (
                    <div className="flex items-center justify-between rounded-xl bg-brand-500/10 px-3 py-2.5">
                      <span dir="ltr" className="text-sm font-black text-brand-300">{coupon}</span>
                      <button type="button" onClick={() => { removeCoupon(); setCouponMsg(null); }} className="text-xs font-bold text-rose-400">
                        حذف کد
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={styles.couponRow}>
                        <input
                          className={styles.input} dir="ltr" placeholder="مثلاً 50500" value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)} inputMode="text" autoCapitalize="characters"
                          onKeyDown={(e) => e.key === "Enter" && apply()}
                        />
                        <button type="button" onClick={apply} className={styles.ghost}>اعمال</button>
                      </div>
                      {couponMsg && <p className={cn(styles.chipMsg, couponMsg.ok ? styles.chipOk : styles.chipBad)}>{couponMsg.text}</p>}
                    </>
                  )}
                </div>

                <div className={styles.hint}>
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <span>
                    {user ? (
                      <>خرید با حساب شما ثبت می‌شود؛ <b className="text-brand-300">{user.name.split(" ")[0]}</b> عزیز.</>
                    ) : (
                      <>خرید بدون ثبت‌نام است؛ کد سفارش + موبایل برای رهگیری کافی است.{" "}
                        <Link to="/register" state={{ phone: form.phone }} className="font-bold text-brand-300 underline underline-offset-2">
                          ثبت‌نام سریع
                        </Link>
                      </>
                    )}
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* ================= STEP 2 — shipping ================= */}
        {step === 1 && (
          <>
            <div className={styles.card}>
              <p className={styles.cardHead}><UserRound className="size-4" /> مشخصات تحویل‌گیرنده</p>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>نام و نام خانوادگی</span>
                <input
                  ref={(el) => { focusRef.current.name = el; }}
                  className={styles.input} value={form.name} placeholder="مثلاً علی محمدی"
                  autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "err-name" : undefined}
                  onChange={(e) => { setForm("name", e.target.value); setErrors((x) => ({ ...x, name: "" })); }}
                />
                {errors.name && <span id="err-name" className={styles.error}>{errors.name}</span>}
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>شماره موبایل <em>برای پیگیری سفارش</em></span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" />
                  <input
                    ref={(el) => { focusRef.current.phone = el; }}
                    className={cn(styles.input, "pe-10")} dir="ltr" inputMode="tel" autoComplete="tel"
                    value={prettyPhone(form.phone)} placeholder="0912 345 6789"
                    aria-invalid={Boolean(errors.phone)}
                    onChange={(e) => { setForm("phone", digitsFa(e.target.value)); setErrors((x) => ({ ...x, phone: "" })); }}
                  />
                </div>
                {errors.phone && <span className={styles.error}>{errors.phone}</span>}
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>استان</span>
                  <input
                    ref={(el) => { focusRef.current.province = el; }}
                    className={styles.input} value={form.province} placeholder="تهران" autoComplete="address-level1"
                    aria-invalid={Boolean(errors.province)}
                    onChange={(e) => { setForm("province", e.target.value); setErrors((x) => ({ ...x, province: "" })); }}
                  />
                  {errors.province && <span className={styles.error}>{errors.province}</span>}
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>شهر</span>
                  <input
                    ref={(el) => { focusRef.current.city = el; }}
                    className={styles.input} value={form.city} placeholder="تهران" autoComplete="address-level2"
                    aria-invalid={Boolean(errors.city)}
                    onChange={(e) => { setForm("city", e.target.value); setErrors((x) => ({ ...x, city: "" })); }}
                  />
                  {errors.city && <span className={styles.error}>{errors.city}</span>}
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>نشانی دقیق <em>خیابان، کوچه، پلاک، واحد</em></span>
                <textarea
                  ref={(el) => { focusRef.current.address = el; }}
                  className={styles.input} value={form.address} placeholder="خیابان ولیعصر، کوچه ۱۲، پلاک ۸، واحد ۳"
                  autoComplete="street-address" aria-invalid={Boolean(errors.address)}
                  onChange={(e) => { setForm("address", e.target.value); setErrors((x) => ({ ...x, address: "" })); }}
                />
                {errors.address && <span className={styles.error}>{errors.address}</span>}
              </div>

              <details className={styles.disclosure} style={{ marginTop: "0.7rem" }}>
                <summary>
                  <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> کد پستی و یادداشت سفارش <em className="not-italic text-[10px] tfaint">(اختیاری)</em></span>
                  <ChevronDown className="size-4" />
                </summary>
                <div className={styles.disclosureBody}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>کد پستی ۱۰ رقمی</span>
                    <input
                      ref={(el) => { focusRef.current.postalCode = el; }}
                      className={styles.input} dir="ltr" inputMode="numeric" value={form.postalCode} placeholder="1234567890"
                      onChange={(e) => { setForm("postalCode", digitsFa(e.target.value).slice(0, 10)); setErrors((x) => ({ ...x, postalCode: "" })); }}
                    />
                    {errors.postalCode && <span className={styles.error}>{errors.postalCode}</span>}
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>یادداشت برای ما</span>
                    <input
                      className={styles.input} value={form.notes} placeholder="مثلاً گلدوزی نام روی کفپوش"
                      onChange={(e) => setForm("notes", e.target.value)}
                    />
                  </div>
                </div>
              </details>
            </div>

            <div className={styles.card}>
              <p className={styles.cardHead}><Truck className="size-4" /> روش ارسال</p>
              <div className={styles.options}>
                {SHIPPING_METHODS.map((m) => {
                  const cost = shippingCost(m.id, afterDiscount);
                  const on = shippingMethod === m.id;
                  return (
                    <label key={m.id} className={styles.option} data-on={on}>
                      <input
                        type="radio" name="mc-shipping" className="sr-only" checked={on}
                        onChange={() => setDraft((d) => ({ ...d, shippingMethod: m.id }))}
                      />
                      <span className={styles.radio} aria-hidden="true" />
                      <span className={styles.optionBody}>
                        <span className={styles.optionTitle}>{m.name}</span>
                        <span className={styles.optionDesc}>{m.desc}</span>
                      </span>
                      <span className={cn(styles.optionSide, cost === 0 && styles.free)}>{cost === 0 ? "رایگان" : `${money(cost)} ت`}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={styles.hint}>
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <span>اطلاعات این مرحله در همین گوشی ذخیره می‌شود؛ اگر صفحه را ببندید، دوباره همان‌جا ادامه می‌دهید.</span>
            </div>
          </>
        )}

        {/* ================= STEP 3 — payment ================= */}
        {step === 2 && (
          <>
            <div className={styles.card}>
              <div className="flex items-start justify-between gap-2">
                <p className={styles.cardHead} style={{ marginBottom: 0 }}><MapPin className="size-4" /> ارسال به</p>
                <button type="button" onClick={() => goTo(1)} className="text-[11px] font-bold text-brand-300">ویرایش</button>
              </div>
              <div className="mt-2 rounded-xl border bd p-3" style={{ background: "var(--field)" }}>
                <p className="text-xs font-black">{form.name} <span className="ms-1 font-mono text-[11px] font-normal tfaint" dir="ltr">{normalizePhone(form.phone)}</span></p>
                <p className="mt-1 text-[11px] leading-6 tdim">{form.province}، {form.city}{form.address ? `، ${form.address}` : ""}</p>
                <p className="mt-1 text-[10.5px] tfaint">{SHIPPING_METHODS.find((m) => m.id === shippingMethod)?.name}</p>
              </div>
            </div>

            <div className={styles.card}>
              <p className={styles.cardHead}><CreditCard className="size-4" /> چطور پرداخت می‌کنی؟</p>
              <div className={styles.options}>
                {PAYMENT_METHODS.map((m) => {
                  const on = payment === m.id;
                  return (
                    <label key={m.id} className={styles.option} data-on={on}>
                      <input
                        type="radio" name="mc-payment" className="sr-only" checked={on}
                        onChange={() => setDraft((d) => ({ ...d, payment: m.id }))}
                      />
                      <span className={styles.optionIcon} aria-hidden="true">
                        {m.id === "online" ? <CreditCard className="size-4" /> : <Wallet className="size-4" />}
                      </span>
                      <span className={styles.optionBody}>
                        <span className={styles.optionTitle}>{m.name}</span>
                        <span className={styles.optionDesc}>{m.desc}</span>
                      </span>
                      <span className={styles.radio} aria-hidden="true" />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={styles.card}>
              <p className={styles.cardHead}><ShoppingBag className="size-4" /> خلاصه پرداخت</p>
              <div className={styles.summaryRow}><span>جمع کالاها ({fa(count)})</span><b>{money(subtotal)} تومان</b></div>
              {discount > 0 && (
                <div className={styles.summaryRow}><span>تخفیف {coupon}</span><b className="text-emerald-400">−{money(discount)} تومان</b></div>
              )}
              <div className={styles.summaryRow}>
                <span>هزینه ارسال</span>
                <b className={shipping === 0 ? "text-emerald-400" : undefined}>{shipping === 0 ? "رایگان" : `${money(shipping)} تومان`}</b>
              </div>
              <div className={styles.summaryTotal}><span>مبلغ نهایی</span><b>{money(total)} <span className="text-[10px] font-medium tdim">تومان</span></b></div>
            </div>

            <div className={styles.trust}>
              <span><ShieldCheck className="size-4" /> پرداخت امن بانکی</span>
              <span><Truck className="size-4" /> ارسال سراسر ایران</span>
              <span><BadgeCheck className="size-4" /> گارانتی ۱۲ ماه</span>
            </div>

            {submitError && <p className={cn(styles.error, "justify-center")}>{submitError}</p>}

            <p className={styles.savedNote}>
              <ShieldCheck className="size-3" /> اطلاعات کارت شما هرگز در این سایت ذخیره نمی‌شود.
            </p>
          </>
        )}
      </div>

      {/* ---------------- sticky action bar ---------------- */}
      {detailed.length > 0 && (
        <div className={styles.bottom}>
          <div className={styles.bottomInner}>
            <div className={styles.bottomTotal}>
              <small>{step === 2 ? "قابل پرداخت" : step === 1 ? "جمع تا اینجا" : "جمع سبد"}</small>
              <b>{money(total)} <span>تومان</span></b>
            </div>
            {step > 0 && (
              <button type="button" className={styles.ghost} onClick={() => goTo(step - 1)} aria-label="مرحله قبل">
                <ArrowRight className="size-4" />
              </button>
            )}
            <button type="button" className={styles.cta} onClick={next} disabled={busy}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {step === 0 ? "ادامه و ثبت اطلاعات" : step === 1 ? "ادامه به پرداخت" : payment === "online" ? `پرداخت ${money(total)}` : "ثبت سفارش"}
              {!busy && <ArrowLeft className="size-4" />}
            </button>
          </div>
          {step === 2 && <p className={styles.savedNote}>{payLabel} · بدون نیاز به ثبت‌نام</p>}
        </div>
      )}
    </div>
  );
}
