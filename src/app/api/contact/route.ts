import { rateLimit, requestClientKey } from "@/lib/rate-limit";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { messages } from "@/db/schema";
import { normalizePhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = rateLimit(`contact:${requestClientKey(req)}`, 4, 600000);
  if (!limit.allowed) return Response.json({ error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  await ensureDb();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone.slice(0, 20) : "");
  const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 80) : "";
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 2000) : "";

  if (name.length < 2) return Response.json({ error: "نام خود را وارد کنید" }, { status: 400 });
  if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
  if (text.length < 5) return Response.json({ error: "متن پیام را وارد کنید" }, { status: 400 });

  await db.insert(messages).values({ name, phone, subject, body: text });
  return Response.json({ ok: true });
}
