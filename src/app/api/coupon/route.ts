import { rateLimit, requestClientKey } from "@/lib/rate-limit";
import { ensureDb } from "@/db/bootstrap";
import { evaluateCoupon } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = rateLimit(`coupon:${requestClientKey(req)}`, 30, 60000);
  if (!limit.allowed) return Response.json({ error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  await ensureDb();
  const body = (await req.json().catch(() => null)) as { code?: unknown; subtotal?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.slice(0, 30) : "";
  const subtotal = Math.max(0, Math.floor(Number(body?.subtotal) || 0));
  const result = await evaluateCoupon(code, subtotal);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
