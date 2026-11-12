import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./db.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = await readFile(path.join(here, "..", "schema.sql"), "utf8");
await pool.query(sql);
await pool.query(
  "INSERT INTO app_meta(key,value) VALUES('schema_version',$1) ON CONFLICT (key) DO UPDATE SET value=$1, at=now()",
  [JSON.stringify({ version: 1, at: new Date().toISOString() })],
);
console.log("[migrate] schema ready");
await pool.end();
