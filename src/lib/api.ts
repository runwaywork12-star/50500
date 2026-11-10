/* ------------------------------------------------------------------ *
 * Server bridge. When the storefront runs behind the 50500 API server,
 * every sensitive operation (auth, orders, prices, payments, uploads,
 * AI) goes through it. Static previews fall back to the local demo.
 * ------------------------------------------------------------------ */

export type PublicGateway = { id: string; name: string; mode: string; card?: { owner: string; cardNumber: string; iban: string; bank: string } };
export type ServerUser = { id: string; name: string; email: string; phone: string };
export type Bootstrap = {
  serverMode: true;
  user: ServerUser | null;
  siteContent: Record<string, unknown> | null;
  control: { pages?: unknown } | null;
  productOverrides: Record<string, unknown>;
  gateways: PublicGateway[];
  redirectHosts: string[];
};

let serverMode = false;
let adminSession = false;
let boot: Bootstrap | null = null;

export const isServerMode = () => serverMode;
export const hasAdminSession = () => adminSession;
export const setAdminSession = (value: boolean) => { adminSession = value; };
export const getBootstrap = () => boot;

export class ApiError extends Error {
  constructor(public status: number, message: string, public data: Record<string, unknown> = {}) { super(message); }
}

export async function api<T = Record<string, unknown>>(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "x-50500-client": "1", ...(options.headers ?? {}) };
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) body = options.body;
  else if (options.body !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(options.body); }
  let response: Response;
  try {
    response = await fetch(path, { method: options.method ?? "GET", headers, body, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید.");
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(response.status, typeof data.error === "string" ? data.error : `خطای سرور (${response.status})`, data);
  return data as T;
}

/** Detects the API server. Resolves null on static hosting / file:// previews. */
export async function bootstrapServer(): Promise<Bootstrap | null> {
  if (typeof window === "undefined" || location.protocol === "file:") return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("/api/public/bootstrap", { credentials: "same-origin", headers: { Accept: "application/json" }, signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) return null;
    const data = (await response.json()) as Bootstrap;
    if (data?.serverMode !== true) return null;
    serverMode = true;
    boot = data;
    return data;
  } catch {
    return null;
  }
}

/* ----------------------- admin → server settings sync ---------------------- */
let suppressed = 0;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingPatches = new Map<string, Record<string, unknown>>();
const settingRequests = new Map<string, Promise<void>>();

export function withoutSync(fn: () => void) {
  suppressed++;
  try { fn(); } finally { suppressed--; }
}

function reportSyncError(error: unknown) {
  window.dispatchEvent(new CustomEvent("50500:sync-error", { detail: error instanceof Error ? error.message : "ذخیره روی سرور ناموفق بود" }));
}

export function pushSetting(key: "site_content" | "control", value: unknown) {
  if (!serverMode || !adminSession || suppressed) return;
  clearTimeout(timers.get(key));
  if (key === "site_content") {
    const serialized = JSON.stringify(value);
    if (serialized.includes('"indexeddb:') || serialized.includes('"data:image/')) return;
  }
  timers.set(key, setTimeout(() => {
    void queueSetting(key, value).catch(reportSyncError);
  }, 700));
}

function queueSetting(key: "site_content" | "control", value: unknown): Promise<void> {
  const previous = settingRequests.get(key) ?? Promise.resolve();
  const request = previous.catch(() => {}).then(async () => {
    await api(`/api/admin/settings/${key}`, { method: "PUT", body: { value } });
  });
  settingRequests.set(key, request);
  return request;
}

export async function saveSettingNow(key: "site_content" | "control", value: unknown): Promise<void> {
  if (!serverMode) return;
  if (!adminSession) throw new Error("نشست مدیریت معتبر نیست؛ دوباره وارد شوید.");
  clearTimeout(timers.get(key));
  timers.delete(key);
  await queueSetting(key, value);
}

/** Sends only the changed fields of one product, so stale values never overwrite live stock. */
export function pushProductPatch(slug: string, patch: Record<string, unknown>) {
  if (!serverMode || !adminSession || suppressed) return;
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (!Object.keys(clean).length) return;
  pendingPatches.set(slug, { ...(pendingPatches.get(slug) ?? {}), ...clean });
  const key = `product:${slug}`;
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    const body = pendingPatches.get(slug);
    pendingPatches.delete(slug);
    api(`/api/admin/products/${encodeURIComponent(slug)}`, { method: "PATCH", body }).catch(reportSyncError);
  }, 400));
}

/* ------------------------------- order access ------------------------------ */
const TOKENS_KEY = "50500_order_tokens_v1";

export function rememberOrderToken(code: string, token: string) {
  try {
    const all = JSON.parse(sessionStorage.getItem(TOKENS_KEY) ?? "{}") as Record<string, string>;
    all[code] = token;
    sessionStorage.setItem(TOKENS_KEY, JSON.stringify(all));
  } catch { /* private mode */ }
}

export function orderToken(code: string): string | null {
  try { return (JSON.parse(sessionStorage.getItem(TOKENS_KEY) ?? "{}") as Record<string, string>)[code] ?? null; } catch { return null; }
}

/** Only bank hosts returned by the server (and same-origin URLs) may receive the browser. */
export function safePaymentRedirect(target: string): string | null {
  try {
    const url = new URL(target, location.origin);
    if (url.origin === location.origin) return url.href;
    if (url.protocol !== "https:") return null;
    return (boot?.redirectHosts ?? []).includes(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
