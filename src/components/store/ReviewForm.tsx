"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, LoaderCircle, Star } from "lucide-react";
import { cn } from "@/lib/format";

export function ReviewForm({ productId }: { productId: number }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, name, city, rating, comment }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "ثبت نظر با خطا مواجه شد");
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
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
        <CircleCheck className="size-6 shrink-0" />
        نظر شما با موفقیت ثبت شد و پس از تایید کارشناسان نمایش داده می‌شود. ممنون از همراهی شما 🧡
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bd soft p-5">
      <p className="font-black">نظر خود را ثبت کنید</p>
      <div className="flex items-center gap-3">
        <span className="text-sm tdim">امتیاز شما:</span>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" className="p-1" onClick={() => setRating(i)} onMouseEnter={() => setHover(i)} aria-label={`${i} ستاره`}>
              <Star className={cn("size-7 transition", i <= (hover || rating) ? "fill-amber-400 text-amber-400" : "tfaint")} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="نام شما" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
        <input className="input" placeholder="شهر (اختیاری)" value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} />
      </div>
      <textarea
        className="input min-h-28 resize-y leading-7"
        placeholder="تجربه خود از این محصول را بنویسید..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
        minLength={10}
        maxLength={1000}
      />
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button type="submit" disabled={status === "sending"} className="btn btn-primary justify-self-start px-6 py-3 text-sm">
        {status === "sending" && <LoaderCircle className="size-4 animate-spin" />} ثبت نظر
      </button>
    </form>
  );
}
