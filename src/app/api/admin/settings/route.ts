import { isAdminPermission, isAdminRequest } from "@/lib/auth";
import { getSettings, setSettings } from "@/lib/settings";
import { ensureDb } from "@/db/bootstrap";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  await ensureDb();
  return Response.json(await getSettings());
}

export async function PUT(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return Response.json({ error: "بدنه نامعتبر است" }, { status: 400 });
  const touchesPayments = Object.keys(body).some((key) => key.startsWith("payments."));
  if (touchesPayments && !(await isAdminPermission("payments:write"))) return Response.json({ error: "برای تغییر تنظیمات درگاه، مجوز مدیریت پرداخت لازم است" }, { status: 403 });
  try {
    await setSettings(body as Record<string, string>);
    await logAdminAudit({ action: "site_settings_updated", resource: "site_settings", summary: `به‌روزرسانی ${Object.keys(body).length} تنظیم سایت` });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطا در ذخیره" }, { status: 400 });
  }
}
