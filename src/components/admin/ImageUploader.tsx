"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

export function ImageUploader({
  target,
  src,
  title,
  hint,
  big = false,
}: {
  target: string;
  src: string;
  title: string;
  hint?: string;
  big?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(src);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("target", target);
    try {
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "آپلود ناموفق بود");
      setPreview(`${data.url}?v=${Date.now()}`);
      setMsg({ ok: true, text: "عکس ذخیره شد و در سایت نمایش داده می‌شود ✓" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "خطا در آپلود" });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={`surface rounded-3xl p-4 ${big ? "sm:p-6" : ""}`}>
      <div className={`relative overflow-hidden rounded-2xl bg-photo ${big ? "aspect-[16/10]" : "aspect-square"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt={title} className="size-full object-contain" />
      </div>
      <h3 className={`mt-4 font-black ${big ? "text-lg" : "text-sm"}`}>{title}</h3>
      {hint && <p className="mt-1 text-xs leading-6 text-white/50">{hint}</p>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn btn-primary mt-3 w-full py-3 text-sm">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {busy ? "در حال آپلود…" : "آپلود عکس جدید"}
      </button>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
    </div>
  );
}
