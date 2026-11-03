"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, Upload, XCircle } from "lucide-react";
import { MAT_SLOTS, matUrl } from "@/lib/mat-photos";

type Result = { name: string; ok: boolean; text: string };

export function MatPhotosManager({ uploaded }: { uploaded: Record<string, boolean> }) {
  const router = useRouter();
  const multi = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [bust, setBust] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>(uploaded);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);

  const send = async (file: File, target: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("target", target);
    const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
    const data = (await res.json()) as { ok?: boolean; key?: string; label?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "آپلود ناموفق بود");
    return data;
  };

  const uploadMany = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    setResults([]);
    const out: Result[] = [];
    const nextDone = { ...done };
    for (const f of list) {
      try {
        const r = await send(f, "site:auto");
        if (r.key) nextDone[r.key] = true;
        out.push({ name: f.name, ok: true, text: `ثبت شد ← ${r.label}` });
      } catch (e) {
        out.push({ name: f.name, ok: false, text: e instanceof Error ? e.message : "خطا" });
      }
      setResults([...out]);
    }
    setDone(nextDone);
    setBust(Date.now());
    setBusy(false);
    router.refresh();
  };

  const uploadSlot = async (key: string, file: File | undefined) => {
    if (!file) return;
    setSlotBusy(key);
    try {
      await send(file, `site:mat-${key}`);
      setDone((d) => ({ ...d, [key]: true }));
      setBust(Date.now());
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "خطا");
    } finally {
      setSlotBusy(null);
    }
  };

  const count = MAT_SLOTS.filter((s) => done[s.key]).length;

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void uploadMany(e.dataTransfer.files);
        }}
        className={`rounded-3xl border-2 border-dashed p-8 text-center transition ${drag ? "border-brand-400 bg-brand-500/10" : "bd soft"}`}
      >
        <input ref={multi} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => e.target.files && void uploadMany(e.target.files)} />
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">{busy ? <Loader2 className="size-8 animate-spin" /> : <ImagePlus className="size-8" />}</span>
        <h3 className="mt-4 text-lg font-black">هر ۴ عکس کفپوش را یک‌جا اینجا رها کنید</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/55">
          عکس ست کامل سه‌تکه روی زمینه سفید. رنگ هر عکس خودکار تشخیص داده می‌شود (مشکی/قرمز، مشکی/سفید، عسلی، قهوه‌ای) و در کل سایت جایگزین می‌شود.
        </p>
        <button type="button" disabled={busy} onClick={() => multi.current?.click()} className="btn btn-primary mt-5 px-7 py-3.5">
          <Upload className="size-5" /> انتخاب عکس‌ها از کامپیوتر / موبایل
        </button>
        {results.length > 0 && (
          <ul className="mx-auto mt-5 grid max-w-xl gap-2 text-start text-sm">
            {results.map((r, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${r.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
                {r.ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
                <span dir="ltr" className="max-w-[10rem] truncate text-xs opacity-70">{r.name}</span>
                <span className="ms-auto">{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black">وضعیت عکس‌ها</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${count === MAT_SLOTS.length ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
            {count} از {MAT_SLOTS.length} عکس واقعی آپلود شده
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {MAT_SLOTS.map((s) => (
            <div key={s.key} className="surface rounded-3xl p-3">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${matUrl(s.key)}?v=${bust}`} alt={s.label} className="size-full object-contain p-2" />
                <span className={`absolute start-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black ${done[s.key] ? "bg-emerald-500 text-[#fff]" : "bg-amber-400 text-black"}`}>
                  {done[s.key] ? "عکس واقعی" : "نمونه موقت"}
                </span>
              </div>
              <p className="mt-3 text-sm font-black">{s.label}</p>
              <label className="btn btn-ghost mt-2 w-full cursor-pointer py-2.5 text-xs">
                {slotBusy === s.key ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} جایگزینی این عکس
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void uploadSlot(s.key, e.target.files?.[0])} />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
