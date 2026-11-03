import { getEnabledGateways } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ gateways: await getEnabledGateways() });
}
