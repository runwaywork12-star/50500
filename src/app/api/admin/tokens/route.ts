import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { apiTokens } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { AGENT_SCOPES, createAgentToken, getAgentAudit, listAgentTokens } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const [tokens, audit] = await Promise.all([listAgentTokens(), getAgentAudit(80)]);
  return Response.json({ tokens, audit, scopes: AGENT_SCOPES });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const body = (await req.json().catch(() => ({}))) as { name?: string; scopes?: string[]; expiresDays?: number };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (name.length < 2) return bad("نام توکن را وارد کنید");
  try {
    const { token, row } = await createAgentToken(name, Array.isArray(body.scopes) ? body.scopes : [], body.expiresDays ?? null);
    return Response.json({ ok: true, token, id: row.id, prefix: row.prefix });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "خطا در ساخت توکن");
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return bad("شناسه نامعتبر است");
  await ensureDb();
  await db.update(apiTokens).set({ isActive: false }).where(eq(apiTokens.id, id));
  return Response.json({ ok: true });
}
