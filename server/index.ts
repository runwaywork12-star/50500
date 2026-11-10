import { serve } from "@hono/node-server";
import { config } from "./config";
import { app } from "./app";
import { expireUnpaidOrders, migrate, sql } from "./db";
import { loadStatic } from "./static";

async function main() {
  await migrate();
  loadStatic(config.staticDir);
  await expireUnpaidOrders();
  const timer = setInterval(() => expireUnpaidOrders().catch((error) => console.error("expire job failed:", error)), 5 * 60_000);

  // HEAD is answered by running the GET pipeline, so security headers are identical.
  const handler = async (request: Request, env: unknown) => {
    if (request.method !== "HEAD") return app.fetch(request, env as never);
    const res = await app.fetch(new Request(request.url, { method: "GET", headers: request.headers }), env as never);
    return new Response(null, { status: res.status, headers: res.headers });
  };

  const server = serve({ fetch: handler, port: config.port, hostname: "0.0.0.0" }, (info) => {
    console.log(`✓ 50500.shop server listening on :${info.port} (${config.production ? "production" : "development"})`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down…`);
    clearInterval(timer);
    server.close(() => void sql.end({ timeout: 5 }).finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("❌ startup failed:", error);
  process.exit(1);
});
