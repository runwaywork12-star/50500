"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", phone: "", subject: "مشاوره خرید", body: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "ارسال پیام ناموفق بود");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setError("ارتباط با سرور برقرار نشد");
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <div className="grid place-items-center gap-3 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
        <CircleCheck className="size-12 text-emerald-300" />
        <p className="text-lg font-black">پیام شما با موفقیت ارسال شد</p>
        <p className="text-sm tdim">کارشناسان ما در کمتر از ۲ ساعت کاری با شما تماس می‌گیرند.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">نام و نام خانوادگی</span>
          <input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">شماره موبایل</span>
          <input className="input text-left" dir="ltr" required inputMode="tel" placeholder="09121234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className="label">موضوع</span>
        <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
          <option>مشاوره خرید</option>
          <option>سفارش اختصاصی</option>
          <option>پیگیری سفارش</option>
          <option>گارانتی و خدمات پس از فروش</option>
          <option>همکاری و نمایندگی</option>
        </select>
      </label>
      <label className="block">
        <span className="label">متن پیام</span>
        <textarea className="input min-h-36 resize-y leading-7" required minLength={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="پیام خود را بنویسید..." />
      </label>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button type="submit" disabled={status === "sending"} className="btn btn-primary justify-self-start px-7 py-3.5">
        {status === "sending" ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />} ارسال پیام
      </button>
    </form>
  );
}
