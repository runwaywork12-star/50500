import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { siteSettings } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { encryptSecret } from "@/lib/secret-vault";
import { getAiStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const KEYS = ["secure.openai_api_key", "secure.anthropic_api_key", "ai.provider", "ai.openai_model", "ai.anthropic_model"] as const;

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  await ensureDb();
  const rows = await db.select().from(siteSettings);
  const m = new Map(rows.map(r => [r.key, r.value]));
  const status = await getAiStatus();
  return Response.json({ provider: m.get("ai.provider") || "auto", openaiModel: m.get("ai.openai_model") || process.env.OPENAI_MODEL || "gpt-4o-mini", anthropicModel: m.get("ai.anthropic_model") || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514", hasOpenAIKey: Boolean(m.get(KEYS[0]) || process.env.OPENAI_API_KEY), hasAnthropicKey: Boolean(m.get(KEYS[1]) || process.env.ANTHROPIC_API_KEY), activeProvider: status.provider });
}

export async function PUT(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return bad("بدنه درخواست نامعتبر است");
  await ensureDb();
  const patch: Record<string, string> = {};
  if (typeof body.provider === "string") {
    if (!["auto", "openai", "anthropic", "offline"].includes(body.provider)) return bad("ارائه‌دهنده نامعتبر است");
    patch["ai.provider"] = body.provider;
  }
  for (const [input, key, max] of [["openaiModel", "ai.openai_model", 120], ["anthropicModel", "ai.anthropic_model", 120]] as const) {
    if (typeof body[input] === "string") {
      const value = body[input].trim().slice(0, max);
      if (!/^[a-zA-Z0-9._:-]+$/.test(value)) return bad("نام مدل فقط می‌تواند شامل حروف، عدد و . _ : - باشد");
      patch[key] = value;
    }
  }
  for (const [input, key] of [["openaiKey", KEYS[0]], ["anthropicKey", KEYS[1]]] as const) {
    if (typeof body[input] === "string" && body[input].trim()) {
      const value = body[input].trim();
      if (value.length < 20 || value.length > 500) return bad("طول کلید API معتبر نیست");
      try { patch[key] = encryptSecret(value); } catch (e) { return bad(e instanceof Error ? e.message : "رمزگذاری کلید ناموفق بود", 500); }
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    await db.insert(siteSettings).values({ key, value, updatedAt: new Date() }).onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  }
  return Response.json({ ok: true, saved: Object.keys(patch).filter(k => !k.startsWith("secure.")), keysSaved: Object.keys(patch).filter(k => k.startsWith("secure.")).length });
}
