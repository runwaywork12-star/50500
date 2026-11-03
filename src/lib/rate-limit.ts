type Entry = { count: number; resetAt: number };
const g = globalThis as typeof globalThis & { __store50500RateLimits?: Map<string, Entry> };
const entries = g.__store50500RateLimits ?? (g.__store50500RateLimits = new Map());

/** Process-local fallback limiter. Use a shared Redis/DB limiter for multi-instance production. */
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = entries.get(key);
  if (!entry || entry.resetAt <= now) { entry = { count: 0, resetAt: now + windowMs }; entries.set(key, entry); }
  entry.count += 1;
  if (entries.size > 10000) { for (const [k, v] of entries) if (v.resetAt <= now) entries.delete(k); }
  return { allowed: entry.count <= limit, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
}

export function requestClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}
