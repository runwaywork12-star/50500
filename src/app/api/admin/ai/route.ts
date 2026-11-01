import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { products } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { getAiHistory, getAiStatus, runAiJob, type AiTask } from "@/lib/ai";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const TASKS: AiTask[] = ["keywords", "description", "meta", "blog"];

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const [status, history] = await Promise.all([getAiStatus(), getAiHistory(30)]);
  return Response.json({ status, history });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return bad("دسترسی غیرمجاز", 401);
  const body = (await req.json().catch(() => ({}))) as { task?: string; input?: string; productId?: number; apply?: boolean };
  if (!TASKS.includes((body.task || "") as AiTask)) return bad("نوع کار نامعتبر است");
  try {
    const result = await runAiJob(body.task as AiTask, body.input || "", { productId: body.productId });
    if (body.apply && body.task === "description" && body.productId) {
      await db.update(products).set({ description: result.output.slice(0, 8000) }).where(eq(products.id, body.productId));
      return Response.json({ ...result, applied: true });
    }
    return Response.json(result);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "خطای هوش مصنوعی");
  }
}
