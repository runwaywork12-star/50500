import { z } from "zod";

/**
 * Environment configuration. In production the server fails closed:
 * a missing or weak secret stops startup instead of running insecurely.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_SECRET: z.string().default(""),
  APP_ORIGIN: z.string().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  STATIC_DIR: z.string().default("dist"),
  ORDER_PAYMENT_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  /** Only honoured outside production — lets tests point gateways at a mock server. */
  PAYMENT_TEST_BASE_URL: z.string().url().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
const env = parsed.data;
const production = env.NODE_ENV === "production";

const problems: string[] = [];
if (production) {
  if (env.APP_SECRET.length < 32) problems.push("APP_SECRET must be at least 32 random characters");
  if (!env.APP_ORIGIN.startsWith("https://")) problems.push("APP_ORIGIN must be an https:// origin (e.g. https://50500.shop)");
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 12) problems.push("ADMIN_PASSWORD must be at least 12 characters");
}
if (problems.length) {
  console.error("❌ Refusing to start in production:\n - " + problems.join("\n - "));
  process.exit(1);
}

let origin: URL;
try {
  origin = new URL(env.APP_ORIGIN);
} catch {
  console.error("❌ APP_ORIGIN is not a valid URL");
  process.exit(1);
}

export const config = {
  production,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  // Development gets a stable per-process fallback so local runs work; production requires a real secret.
  appSecret: env.APP_SECRET || "development-only-secret-change-me-0123456789",
  appOrigin: origin.origin,
  appHost: origin.host,
  adminEmail: env.ADMIN_EMAIL?.toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD,
  openaiKey: env.OPENAI_API_KEY,
  anthropicKey: env.ANTHROPIC_API_KEY,
  staticDir: env.STATIC_DIR,
  orderTtlMinutes: env.ORDER_PAYMENT_TTL_MINUTES,
  paymentTestBase: production ? undefined : env.PAYMENT_TEST_BASE_URL,
} as const;
