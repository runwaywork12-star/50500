import { ensureDb } from "@/db/bootstrap";
import { readUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("not found", { status: 404 });
  await ensureDb();
  const up = await readUpload(id);
  if (!up) return new Response("not found", { status: 404 });
  return new Response(Buffer.from(up.data, "base64"), {
    headers: { "Content-Type": up.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
