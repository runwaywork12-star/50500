import pg from "pg";

const { DATABASE_URL, PGSSL, NODE_ENV } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
  ssl: PGSSL === "true" || (NODE_ENV === "production" && PGSSL !== "false")
    ? { rejectUnauthorized: false }
    : undefined,
  statement_timeout: 15_000,
});

pool.on("error", (err) => console.error("[pg] idle client error", err.message));

/** Parameterised only — never interpolate user input into SQL. */
export const q = (text, params = []) => pool.query(text, params);

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function health() {
  const started = Date.now();
  const { rows } = await q("SELECT version() AS v, current_database() AS db");
  const size = await q("SELECT pg_size_pretty(pg_database_size(current_database())) AS size");
  return {
    ok: true,
    latencyMs: Date.now() - started,
    version: rows[0].v.split(" ").slice(0, 2).join(" "),
    database: rows[0].db,
    size: size.rows[0].size,
  };
}
