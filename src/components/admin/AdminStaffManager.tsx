"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, KeyRound, Plus, UserMinus, UserPlus, Users } from "lucide-react";

type Permission = { key: string; label: string };
type Staff = { id: number; full_name: string; email: string; role: string; permissions: string[]; is_active: boolean; totp_enabled: boolean; last_login_at: string | null; created_at: string };
async function call(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "عملیات انجام نشد");
  return data;
}
export function AdminStaffManager() {
  const [rows, setRows] = useState<Staff[]>([]); const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "custom" });
  const [selected, setSelected] = useState<string[]>(["orders:read"]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const load = useCallback(async () => { const d = await call("/api/admin/staff"); setRows(d.rows || []); setPermissions(d.permissions || []); }, []);
  useEffect(() => { void load().catch(e => setMessage(e instanceof Error ? e.message : "خطا")); }, [load]);
  const create = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setMessage(""); try { await call("/api/admin/staff", "POST", { ...form, permissions: selected }); setForm({ fullName: "", email: "", password: "", role: "custom" }); await load(); setMessage("حساب کارمند ساخته شد."); } catch (e) { setMessage(e instanceof Error ? e.message : "خطا"); } finally { setBusy(false); } };
  const toggle = async (id: number, active: boolean) => { if (!window.confirm(active ? "حساب کارمند فعال شود؟" : "حساب کارمند غیرفعال و تمام نشست‌هایش لغو شود؟")) return; setBusy(true); try { await call(`/api/admin/staff/${id}`, "PATCH", { isActive: active }); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "خطا"); } finally { setBusy(false); } };
  const resetPassword = async (id: number) => { const password = window.prompt("رمز جدید با حداقل ۱۲ نویسه را وارد کن:"); if (!password) return; setBusy(true); try { await call(`/api/admin/staff/${id}`, "PATCH", { password }); await load(); setMessage("رمز تغییر کرد و نشست‌های قبلی لغو شدند."); } catch (e) { setMessage(e instanceof Error ? e.message : "خطا"); } finally { setBusy(false); } };
  const updateAccess = async (e: FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const role = String(data.get("role") || "custom"); const selectedPermissions = data.getAll("permissions").map(String);
    if (!selectedPermissions.length) { setMessage("برای هر کارمند حداقل یک مجوز لازم است."); return; }
    setBusy(true); setMessage("");
    try { await call(`/api/admin/staff/${id}`, "PATCH", { role, permissions: selectedPermissions }); await load(); setMessage("نقش و مجوزهای کارمند به‌روزرسانی شد."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "خطا"); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
    <form onSubmit={create} className="surface grid content-start gap-4 rounded-3xl p-5">
      <div><h2 className="flex items-center gap-2 font-black"><UserPlus className="size-5 text-brand-400"/> افزودن کارمند پنل</h2><p className="mt-1 text-xs opacity-60">هر کارمند ایمیل و رمز جداگانه و فقط مجوزهای انتخابی خواهد داشت. رمز حداقل ۱۲ نویسه باشد.</p></div>
      <label className="grid gap-1 text-xs">نام و نام خانوادگی<input className="input" value={form.fullName} onChange={e=>setForm(v=>({...v,fullName:e.target.value}))} required maxLength={100}/></label>
      <label className="grid gap-1 text-xs">ایمیل ورود<input className="input text-left" dir="ltr" type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} required/></label>
      <label className="grid gap-1 text-xs">رمز عبور موقت<input className="input text-left" dir="ltr" type="password" minLength={12} value={form.password} onChange={e=>setForm(v=>({...v,password:e.target.value}))} required/></label>
      <label className="grid gap-1 text-xs">عنوان نقش<select className="input" value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))}><option value="manager">مدیر اجرایی</option><option value="orders">اپراتور سفارش‌ها</option><option value="catalog">مدیر محصولات</option><option value="content">مدیر محتوا</option><option value="finance">حسابدار</option><option value="support">پشتیبانی</option><option value="analyst">تحلیل‌گر</option><option value="custom">دسترسی سفارشی</option></select></label>
      <div><div className="mb-2 flex items-center justify-between"><b className="text-sm">سطح دسترسی</b><button type="button" className="text-xs text-brand-400" onClick={()=>setSelected(permissions.map(p=>p.key))}>انتخاب همه</button></div><div className="grid gap-2 rounded-2xl border border-current/10 p-3 sm:grid-cols-2">{permissions.map(p=><label key={p.key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected.includes(p.key)} onChange={e=>setSelected(old=>e.target.checked?[...old,p.key]:old.filter(x=>x!==p.key))}/>{p.label}</label>)}</div></div>
      <button disabled={busy} className="btn btn-primary"><Plus className="size-4"/> ساخت حساب کارمند</button>
      {message&&<p className="text-sm text-brand-400">{message}</p>}
    </form>
    <section className="surface rounded-3xl p-5"><div className="mb-4 flex items-center gap-2"><Users className="size-5 text-brand-400"/><h2 className="font-black">کاربران پنل</h2><span className="text-xs opacity-50">{rows.length} نفر</span></div><div className="grid gap-3">{rows.map(s=><article key={s.id} className="rounded-2xl border border-current/10 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{s.full_name}</b><p className="mt-1 text-xs opacity-60" dir="ltr">{s.email}</p><p className="mt-2 text-xs opacity-50">{s.role} · {s.permissions.length} مجوز · {s.totp_enabled?"ورود دومرحله‌ای فعال":"ورود دومرحله‌ای غیرفعال"}</p><p className="mt-1 text-[11px] opacity-40">آخرین ورود: {s.last_login_at?new Date(s.last_login_at).toLocaleString("fa-IR"):"هنوز وارد نشده"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] ${s.is_active?"bg-emerald-500/10 text-emerald-500":"bg-rose-500/10 text-rose-400"}`}>{s.is_active?"فعال":"غیرفعال"}</span></div><div className="mt-3 flex flex-wrap gap-2"><button className="btn btn-ghost !py-2 text-xs" disabled={busy} onClick={()=>void resetPassword(s.id)}><KeyRound className="size-3.5"/> تغییر رمز و خروج از نشست‌ها</button><button className="btn btn-ghost !py-2 text-xs" disabled={busy} onClick={()=>void toggle(s.id,!s.is_active)}>{s.is_active?<UserMinus className="size-3.5"/>:<Check className="size-3.5"/>}{s.is_active?"غیرفعال‌سازی":"فعال‌سازی"}</button></div><details className="mt-3 rounded-xl border border-current/10 p-3"><summary className="cursor-pointer text-xs font-bold">ویرایش نقش و سطح دسترسی</summary><form className="mt-3 grid gap-3" onSubmit={e=>void updateAccess(e,s.id)}><label className="grid gap-1 text-xs">عنوان نقش<select className="input" name="role" defaultValue={s.role}><option value="manager">مدیر اجرایی</option><option value="orders">اپراتور سفارش‌ها</option><option value="catalog">مدیر محصولات</option><option value="content">مدیر محتوا</option><option value="finance">حسابدار</option><option value="support">پشتیبانی</option><option value="analyst">تحلیل‌گر</option><option value="custom">دسترسی سفارشی</option></select></label><div className="grid gap-2 sm:grid-cols-2">{permissions.map(p=><label key={p.key} className="flex items-center gap-2 text-xs"><input type="checkbox" name="permissions" value={p.key} defaultChecked={s.permissions.includes(p.key)}/>{p.label}</label>)}</div><button disabled={busy} className="btn btn-primary justify-self-start !py-2 text-xs">ذخیره دسترسی‌ها</button></form></details></article>)}{!rows.length&&<p className="text-sm opacity-50">هنوز حساب کارمندی ساخته نشده است.</p>}</div><p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-xs leading-6 text-amber-700 dark:text-amber-200">حساب مدیر اصلی که با رمز موجود در فایل محیطی وارد می‌شود مستقل است و از این فهرست حذف نمی‌شود. برای استفاده عمومی، احراز هویت دومرحله‌ای را هم برای مدیر اصلی و هم برای تمام کارکنانی که به پنل دسترسی دارند فعال کنید.</p></section>
  </div>;
}
