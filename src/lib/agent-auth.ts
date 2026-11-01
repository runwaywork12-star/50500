import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { apiAudit, apiTokens } from "@/db/schema";

export const AGENT_SCOPES = [
  { id: "catalog:read", name: "خواندن کاتالوگ", desc: "مشاهده محصولات، دسته‌ها، برندها و مدل‌ها" },
  { id: "catalog:write", name: "مدیریت کاتالوگ", desc: "ایجاد و ویرایش محصولات" },
  { id: "orders:read", name: "خواندن سفارش‌ها", desc: "مشاهده سفارش‌ها و مشتریان" },
  { id: "orders:write", name: "مدیریت سفارش‌ها", desc: "تغییر وضعیت سفارش و پرداخت" },
  { id: "content:read", name: "خواندن محتوا", desc: "مشاهده تنظیمات و محتوای سایت" },
  { id: "content:write", name: "مدیریت محتوا", desc: "ویرایش تنظیمات و اجرای ابزار هوش مصنوعی" },
  { id: "stats:read", name: "خواندن آمار", desc: "آمار فروش، سود و بازدید" },
] as const;

export type AgentToken = typeof apiTokens.$inferSelect;

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const rate = new Map<number, { count: number; reset: number }>();

export function checkRateLimit(tokenId: number): boolean {
  const now = Date.now();
  const cur = rate.get(tokenId);
  if (!cur || now > cur.reset) {
    rate.set(tokenId, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  cur.count += 1;
  return cur.count <= RATE_LIMIT;
}

export async function createAgentToken(name: string, scopes: string[], expiresDays?: number | null) {
  await ensureDb();
  const allowed: Set<string> = new Set(AGENT_SCOPES.map((s) => s.id));
  const clean = [...new Set(scopes.filter((s) => allowed.has(s)))];
  if (!clean.length) throw new Error("حداقل یک دسترسی انتخاب کنید");
  const token = `sk50500_${randomBytes(24).toString("hex")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db
    .insert(apiTokens)
    .values({
      name: name.slice(0, 80),
      tokenHash,
      prefix: token.slice(0, 16),
      scopes: clean,
      expiresAt: expiresDays && expiresDays > 0 ? new Date(Date.now() + expiresDays * 86400_000) : null,
    })
    .returning();
  return { token, row };
}

export async function verifyAgentRequest(req: Request): Promise<{ token: AgentToken } | { error: string; status: number }> {
  const header = req.headers.get("authorization") || "";
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) {
    return { error: "توکن ارسال نشده است (Authorization: Bearer ...)", status: 401 };
  }
  await ensureDb();
  const hash = createHash("sha256").update(value.trim()).digest("hex");
  const [token] = await db.select().from(apiTokens).where(eq(apiTokens.tokenHash, hash)).limit(1);
  if (!token) return { error: "توکن نامعتبر است", status: 401 };
  let ok = false;
  try {
    ok = timingSafeEqual(Buffer.from(hash), Buffer.from(token.tokenHash));
  } catch {
    ok = false;
  }
  if (!ok || !token.isActive) return { error: "توکن نامعتبر یا غیرفعال است", status: 401 };
  if (token.expiresAt && new Date(token.expiresAt).getTime() < Date.now()) {
    return { error: "توکن منقضی شده است", status: 401 };
  }
  if (!checkRateLimit(token.id)) return { error: "محدودیت نرخ: ۱۲۰ درخواست در دقیقه", status: 429 };
  db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, token.id)).catch(() => undefined);
  return { token };
}

export function hasScope(token: AgentToken, scope: string): boolean {
  return token.scopes.includes(scope);
}

export function auditApi(tokenId: number | null, method: string, path: string, status: number, started: number) {
  db.insert(apiAudit)
    .values({ tokenId, method: method.slice(0, 10), path: path.slice(0, 300), status, durationMs: Date.now() - started })
    .catch(() => undefined);
}

export async function listAgentTokens() {
  await ensureDb();
  return db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      scopes: apiTokens.scopes,
      isActive: apiTokens.isActive,
      expiresAt: apiTokens.expiresAt,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .orderBy(desc(apiTokens.id));
}

export async function getAgentAudit(limit = 60) {
  await ensureDb();
  return db.select().from(apiAudit).orderBy(desc(apiAudit.id)).limit(limit);
}
