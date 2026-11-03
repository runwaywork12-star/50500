import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { financeEntries } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return bad("شناسه نامعتبر است");
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.isVoided !== "boolean") return bad("عملیات نامعتبر است");
  const [row] = await db.update(financeEntries).set({ isVoided: body.isVoided, voidedAt: body.isVoided ? new Date() : null }).where(eq(financeEntries.id, id)).returning({ id: financeEntries.id });
  if (!row) return bad("سند مالی پیدا نشد", 404);
  await logAdminAudit({ action: body.isVoided ? "finance_entry_voided" : "finance_entry_restored", resource: "finance_entries", resourceId: id, summary: "تغییر وضعیت سند مالی" });
  return Response.json({ ok: true });
}
