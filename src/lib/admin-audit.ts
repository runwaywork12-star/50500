import { getAdminContext } from "@/lib/auth";
import { pool } from "@/db";

/** Append-only audit trail for privileged actions. Never pass secrets or raw gateway payloads. */
export async function logAdminAudit(input: {
  action: string;
  resource: string;
  resourceId?: string | number;
  summary?: string;
  actor?: string;
}) {
  const context = input.actor ? null : await getAdminContext().catch(() => null);
  const actor = input.actor || context?.name || "admin";
  await pool.query(
    `INSERT INTO admin_audit_events (actor, action, resource, resource_id, summary)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      actor.slice(0, 100),
      input.action.slice(0, 80),
      input.resource.slice(0, 80),
      String(input.resourceId ?? "").slice(0, 120),
      (input.summary || "").slice(0, 500),
    ],
  );
}
