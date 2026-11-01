import { getSettings } from "@/lib/settings";
export const dynamic = "force-dynamic";
const allowed = [
  "account.brand_label", "account.brand_title", "account.brand_desc", "account.benefit_orders", "account.benefit_security", "account.benefit_vehicle",
  "account.login_title", "account.login_desc", "account.register_title", "account.register_desc", "account.dashboard_label", "account.dashboard_desc",
  "account.orders_title", "account.quick_title", "account.details_title", "account.help_title",
];
export async function GET() { const all = await getSettings(); return Response.json(Object.fromEntries(allowed.map((key) => [key, all[key] ?? ""])), { headers: { "Cache-Control": "no-store" } }); }
