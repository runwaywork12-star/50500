import { rateLimit, requestClientKey } from "@/lib/rate-limit";
import { trackPageView } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = rateLimit(`track:${requestClientKey(req)}`, 60, 60000);
  if (!limit.allowed) return Response.json({ error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const fwd = req.headers.get("x-forwarded-for") || "";
    await trackPageView({
      sessionId: typeof body.sessionId === "string" ? body.sessionId : "anon",
      path: typeof body.path === "string" ? body.path : "/",
      referrer: typeof body.referrer === "string" ? body.referrer : "",
      url: typeof body.url === "string" ? body.url : "",
      userAgent: req.headers.get("user-agent") || "",
      language: typeof body.language === "string" ? body.language : req.headers.get("accept-language") || "",
      ip: fwd.split(",")[0]?.trim() || "",
      country: req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "",
    });
  } catch {
    // analytics must never break the storefront
  }
  return Response.json({ ok: true });
}
