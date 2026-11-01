import { requireAdminPermission } from "@/lib/auth";
import { Check, Mail, MailOpen, Phone, Trash2 } from "lucide-react";
import { AdminAction } from "@/components/admin/AdminClient";
import { getAdminMessages } from "@/lib/admin-queries";
import { cn, faDate } from "@/lib/format";

export default async function AdminMessagesPage() {
  await requireAdminPermission("support:read");

  const list = await getAdminMessages();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">پیام‌ها</h1>
        <p className="mt-1 text-sm text-white/50">پیام‌های ارسال‌شده از فرم تماس با ما</p>
      </div>
      {list.length === 0 && (
        <div className="surface grid place-items-center gap-3 rounded-3xl p-12 text-center text-sm text-white/50">
          <Mail className="size-10 text-white/20" />
          هنوز پیامی دریافت نشده است.
        </div>
      )}
      <div className="grid gap-3">
        {list.map((m) => (
          <div key={m.id} className={cn("surface rounded-3xl p-5", !m.isRead && "border-brand-500/30")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("grid size-10 place-items-center rounded-xl", m.isRead ? "bg-white/5 text-white/40" : "bg-brand-500/15 text-brand-300")}>
                  {m.isRead ? <MailOpen className="size-5" /> : <Mail className="size-5" />}
                </span>
                <div>
                  <p className="text-sm font-bold">
                    {m.name} <span className="text-xs font-normal text-white/40">· {m.subject}</span>
                  </p>
                  <p className="flex items-center gap-1 text-xs text-white/40">
                    <Phone className="size-3" /> <span dir="ltr">{m.phone}</span> · {faDate(m.createdAt, true)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!m.isRead && (
                  <AdminAction url={`/api/admin/messages/${m.id}`} body={{ isRead: true }}>
                    <Check className="size-3.5" /> خوانده شد
                  </AdminAction>
                )}
                <AdminAction url={`/api/admin/messages/${m.id}`} method="DELETE" confirmText="این پیام حذف شود؟" className="btn-ghost text-rose-300">
                  <Trash2 className="size-3.5" />
                </AdminAction>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/75">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
