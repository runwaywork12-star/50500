import { cookies } from "next/headers";
import { ADMIN_COOKIE, revokeAdminSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST() {
  const store = await cookies();
  const current = store.get(ADMIN_COOKIE)?.value;
  await revokeAdminSession(current).catch(() => undefined);
  store.delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
