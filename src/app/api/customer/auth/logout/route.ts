import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { createHash } from "node:crypto";
export async function POST() {
  const jar = await cookies(); const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (token) { await ensureDb(); await pool.query("DELETE FROM customer_sessions WHERE token_hash=$1", [createHash("sha256").update(token).digest("hex")]); }
  jar.delete(CUSTOMER_COOKIE);
  return NextResponse.json({ ok: true });
}
