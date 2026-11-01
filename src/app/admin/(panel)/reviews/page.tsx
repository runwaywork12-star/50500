import { requireAdminPermission } from "@/lib/auth";
import Link from "next/link";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { AdminAction } from "@/components/admin/AdminClient";
import { Stars } from "@/components/ui";
import { getAdminReviews } from "@/lib/admin-queries";
import { cn, faDate } from "@/lib/format";

export default async function AdminReviewsPage() {
  await requireAdminPermission("support:read");

  const list = await getAdminReviews();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">نظرات مشتریان</h1>
        <p className="mt-1 text-sm text-white/50">نظرات جدید پس از تایید در صفحه محصول نمایش داده می‌شوند</p>
      </div>
      {list.length === 0 && <div className="surface rounded-3xl p-12 text-center text-sm text-white/50">نظری ثبت نشده است.</div>}
      <div className="grid gap-3">
        {list.map((r) => (
          <div key={r.id} className={cn("surface rounded-3xl p-5", !r.isApproved && "border-amber-400/30")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-700 text-sm font-black">{r.name.slice(0, 1)}</span>
                <div>
                  <p className="text-sm font-bold">
                    {r.name} {r.city && <span className="text-xs font-normal text-white/40">· {r.city}</span>}
                  </p>
                  <p className="text-xs text-white/40">{faDate(r.createdAt, true)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Stars value={r.rating} className="size-3.5" />
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", r.isApproved ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300")}>
                  {r.isApproved ? "منتشر شده" : "در انتظار تایید"}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-white/75">{r.comment}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
              {r.productSlug ? (
                <Link href={`/products/${r.productSlug}`} target="_blank" className="line-clamp-1 text-xs text-brand-300 hover:underline">
                  {r.productTitle}
                </Link>
              ) : (
                <span className="text-xs text-white/40">نظر عمومی</span>
              )}
              <div className="flex gap-2">
                {r.isApproved ? (
                  <AdminAction url={`/api/admin/reviews/${r.id}`} body={{ isApproved: false }}>
                    <EyeOff className="size-3.5" /> عدم نمایش
                  </AdminAction>
                ) : (
                  <AdminAction url={`/api/admin/reviews/${r.id}`} body={{ isApproved: true }} className="btn-primary">
                    <Check className="size-3.5" /> تایید و انتشار
                  </AdminAction>
                )}
                <AdminAction url={`/api/admin/reviews/${r.id}`} method="DELETE" confirmText="این نظر حذف شود؟" className="btn-ghost text-rose-300">
                  <Trash2 className="size-3.5" />
                </AdminAction>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
