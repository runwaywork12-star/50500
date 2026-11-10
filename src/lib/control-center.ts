import { useSyncExternalStore } from "react";
import { api, isServerMode, pushSetting, saveSettingNow } from "./api";

/* ------------------------------------------------------------------ *
 * Shared control-center state. Secrets never enter this persisted
 * object: gateway passwords and AI keys live only in sessionStorage.
 * ------------------------------------------------------------------ */

export type PageControl = {
  id: string;
  title: string;
  route: string;
  enabled: boolean;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  robots: "index,follow" | "noindex,nofollow";
  ogImage: string;
  updatedAt: string;
};

export type GatewayId = "zarinpal" | "sadad" | "sep" | "zibal" | "card";
export type GatewayConfig = {
  id: GatewayId;
  name: string;
  description: string;
  enabled: boolean;
  mode: "sandbox" | "production";
  position: number;
  currency: "IRT" | "IRR";
  callbackUrl: string;
  fields: Record<string, string>;
};

export type GatewayField = { key: string; label: string; required?: boolean; secret?: boolean; placeholder?: string; dir?: "ltr" | "rtl" };
export const GATEWAY_FIELDS: Record<GatewayId, GatewayField[]> = {
  zarinpal: [
    { key: "merchantId", label: "مرچنت کد (Merchant ID)", required: true, placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", dir: "ltr" },
  ],
  sadad: [
    { key: "terminalId", label: "شماره ترمینال", required: true, dir: "ltr" },
    { key: "merchantId", label: "کد پذیرنده", required: true, dir: "ltr" },
    { key: "secretKey", label: "کلید مخفی / Secret Key", required: true, secret: true, dir: "ltr" },
  ],
  sep: [
    { key: "terminalId", label: "شماره ترمینال", required: true, dir: "ltr" },
    { key: "password", label: "رمز ترمینال", required: true, secret: true, dir: "ltr" },
  ],
  zibal: [
    { key: "merchantId", label: "مرچنت زیبال", required: true, dir: "ltr" },
  ],
  card: [
    { key: "owner", label: "نام صاحب حساب", required: true },
    { key: "cardNumber", label: "شماره کارت", required: true, dir: "ltr" },
    { key: "iban", label: "شماره شبا", dir: "ltr" },
    { key: "bank", label: "نام بانک" },
  ],
};

export type AIProvider = {
  id: "openai" | "anthropic";
  name: string;
  enabled: boolean;
  model: string;
  baseUrl: string;
};

export type AgentPermission = "products:read" | "orders:read" | "content:read" | "content:write";
export type AgentConfig = {
  id: string;
  name: string;
  description: string;
  provider: AIProvider["id"];
  enabled: boolean;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  permissions: AgentPermission[];
};

export type AgentRun = {
  id: string;
  agentId: string;
  agentName: string;
  provider: AIProvider["id"];
  model: string;
  scope: "none" | "products" | "orders" | "content";
  input: string;
  output: string;
  status: "success" | "error";
  tokens: number | null;
  durationMs: number;
  createdAt: string;
};

export type ControlState = {
  pages: PageControl[];
  gateways: GatewayConfig[];
  providers: AIProvider[];
  agents: AgentConfig[];
  runs: AgentRun[];
};

const KEY = "50500_control_center_v1";
const SECRET_KEY = "50500_control_secrets_v1";
const now = () => new Date().toISOString();

const DEFAULT_PAGES: PageControl[] = [
  { id: "home", title: "صفحه اصلی", route: "/", enabled: true, seoTitle: "فروشگاه 50500 | کفپوش چرمی گلدوزی اختصاصی خودرو", seoDescription: "کفپوش چرمی گلدوزی اختصاصی خودرو با انتخاب رنگ چرم و نخ، گارانتی و ارسال به سراسر ایران.", keywords: "کفپوش خودرو, کفپوش چرمی, 50500", robots: "index,follow", ogImage: "", updatedAt: now() },
  { id: "products", title: "فروشگاه و محصولات", route: "/products", enabled: true, seoTitle: "محصولات | فروشگاه 50500", seoDescription: "مشاهده و فیلتر کفپوش اختصاصی خودرو و لوازم جانبی.", keywords: "خرید کفپوش, لوازم جانبی خودرو", robots: "index,follow", ogImage: "", updatedAt: now() },
  { id: "product", title: "قالب صفحه محصول", route: "/products/*", enabled: true, seoTitle: "جزئیات محصول | 50500", seoDescription: "مشخصات، تصاویر و انتخاب رنگ کفپوش اختصاصی خودرو.", keywords: "جزئیات کفپوش", robots: "index,follow", ogImage: "", updatedAt: now() },
  { id: "blog", title: "مجله", route: "/blog", enabled: true, seoTitle: "مجله خودرو | 50500", seoDescription: "راهنمای خرید و نگهداری کفپوش و لوازم چرمی خودرو.", keywords: "مجله خودرو, نگهداری کفپوش", robots: "index,follow", ogImage: "", updatedAt: now() },
  { id: "article", title: "قالب مقاله", route: "/blog/*", enabled: true, seoTitle: "مقاله | مجله 50500", seoDescription: "مقاله‌های تخصصی مجله 50500.", keywords: "مقاله خودرو", robots: "index,follow", ogImage: "", updatedAt: now() },
  { id: "about", title: "درباره ما", route: "/about", enabled: true, seoTitle: "درباره 50500", seoDescription: "آشنایی با فروشگاه و فرایند تولید کفپوش اختصاصی خودرو.", keywords: "درباره 50500", robots: "index,follow", ogImage: "", updatedAt: now() },
  { id: "contact", title: "تماس با ما", route: "/contact", enabled: true, seoTitle: "تماس با 50500", seoDescription: "راه‌های ارتباط با پشتیبانی و مشاوره خرید 50500.", keywords: "تماس 50500", robots: "index,follow", ogImage: "", updatedAt: now() },
  { id: "track", title: "پیگیری سفارش", route: "/track", enabled: true, seoTitle: "پیگیری سفارش | 50500", seoDescription: "پیگیری وضعیت سفارش با کد سفارش یا شماره موبایل.", keywords: "پیگیری سفارش", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
  { id: "cart", title: "سبد خرید", route: "/cart", enabled: true, seoTitle: "سبد خرید | 50500", seoDescription: "بازبینی کالاهای سبد خرید.", keywords: "", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
  { id: "checkout", title: "تسویه حساب", route: "/checkout", enabled: true, seoTitle: "تسویه حساب | 50500", seoDescription: "ثبت اطلاعات ارسال و تسویه سفارش.", keywords: "", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
  { id: "login", title: "ورود", route: "/login", enabled: true, seoTitle: "ورود به حساب کاربری | 50500", seoDescription: "ورود به حساب کاربری فروشگاه 50500.", keywords: "", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
  { id: "register", title: "ثبت‌نام", route: "/register", enabled: true, seoTitle: "ثبت‌نام | 50500", seoDescription: "ساخت حساب کاربری در فروشگاه 50500.", keywords: "", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
  { id: "forgot", title: "بازیابی رمز", route: "/forgot", enabled: true, seoTitle: "بازیابی رمز عبور | 50500", seoDescription: "بازیابی دسترسی به حساب کاربری.", keywords: "", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
  { id: "account", title: "حساب کاربری", route: "/account", enabled: true, seoTitle: "حساب کاربری | 50500", seoDescription: "سفارش‌ها و اطلاعات حساب کاربری.", keywords: "", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
  { id: "order", title: "جزئیات سفارش", route: "/order/*", enabled: true, seoTitle: "جزئیات سفارش | 50500", seoDescription: "جزئیات و وضعیت سفارش.", keywords: "", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
  { id: "pay", title: "پرداخت سفارش", route: "/pay/*", enabled: true, seoTitle: "پرداخت سفارش | 50500", seoDescription: "انتخاب روش پرداخت سفارش.", keywords: "", robots: "noindex,nofollow", ogImage: "", updatedAt: now() },
];

const DEFAULT_GATEWAYS: GatewayConfig[] = [
  { id: "zarinpal", name: "زرین‌پال", description: "پرداخت اینترنتی با مرچنت اختصاصی فروشگاه", enabled: false, mode: "sandbox", position: 1, currency: "IRT", callbackUrl: "https://50500.shop/pay/callback/zarinpal", fields: {} },
  { id: "sadad", name: "سداد بانک ملی", description: "درگاه پرداخت اینترنتی بانک ملی ایران", enabled: false, mode: "sandbox", position: 2, currency: "IRR", callbackUrl: "https://50500.shop/pay/callback/sadad", fields: {} },
  { id: "sep", name: "سپ (بانک سامان)", description: "درگاه پرداخت الکترونیک سامان", enabled: false, mode: "sandbox", position: 3, currency: "IRR", callbackUrl: "https://50500.shop/pay/callback/sep", fields: {} },
  { id: "zibal", name: "زیبال", description: "درگاه پرداخت زیبال با تسویه بانکی", enabled: false, mode: "sandbox", position: 4, currency: "IRT", callbackUrl: "https://50500.shop/pay/callback/zibal", fields: {} },
  { id: "card", name: "کارت‌به‌کارت", description: "ثبت اطلاعات حساب و بررسی دستی رسید واریز", enabled: true, mode: "production", position: 5, currency: "IRT", callbackUrl: "", fields: {} },
];

const DEFAULT_PROVIDERS: AIProvider[] = [
  { id: "openai", name: "OpenAI / GPT", enabled: true, model: "gpt-4o-mini", baseUrl: "https://api.openai.com/v1" },
  { id: "anthropic", name: "Anthropic / Claude", enabled: true, model: "claude-3-5-haiku-latest", baseUrl: "https://api.anthropic.com/v1" },
];

const DEFAULT_AGENTS: AgentConfig[] = [
  { id: "content", name: "دستیار محتوا", description: "نوشتن و ویرایش متن محصول، هیرو و کمپین", provider: "openai", enabled: true, systemPrompt: "تو دستیار محتوای فروشگاه کفپوش خودرو 50500 هستی. فارسی روان، دقیق و بدون ادعای اثبات‌نشده بنویس. خروجی را کوتاه و آماده استفاده در فروشگاه بده.", temperature: 0.7, maxTokens: 900, permissions: ["products:read", "content:read", "content:write"] },
  { id: "seo", name: "متخصص SEO", description: "عنوان، توضیحات متا و کلمات کلیدی صفحه‌ها", provider: "anthropic", enabled: true, systemPrompt: "تو متخصص سئوی فارسی هستی. عنوان حداکثر ۶۰ کاراکتر و توضیح متا حداکثر ۱۵۵ کاراکتر پیشنهاد بده. از کلمات کلیدی طبیعی استفاده کن و از keyword stuffing پرهیز کن.", temperature: 0.35, maxTokens: 700, permissions: ["products:read", "content:read"] },
  { id: "support", name: "دستیار پشتیبانی", description: "پیش‌نویس پاسخ به مشتریان و پیگیری سفارش", provider: "openai", enabled: true, systemPrompt: "تو پشتیبان فروشگاه 50500 هستی. محترمانه، شفاف و کوتاه پاسخ بده. درباره وضعیت سفارش فقط از داده ارائه‌شده استفاده کن و هیچ وضعیتی را حدس نزن.", temperature: 0.3, maxTokens: 650, permissions: ["orders:read", "products:read"] },
];

export const DEFAULT_CONTROL_STATE: ControlState = { pages: DEFAULT_PAGES, gateways: DEFAULT_GATEWAYS, providers: DEFAULT_PROVIDERS, agents: DEFAULT_AGENTS, runs: [] };

function mergeState(raw: Partial<ControlState> | null): ControlState {
  if (!raw) return DEFAULT_CONTROL_STATE;
  return {
    pages: [...DEFAULT_PAGES.map((p) => ({ ...p, ...(raw.pages?.find((x) => x.id === p.id) ?? {}) })), ...(raw.pages ?? []).filter((p) => !DEFAULT_PAGES.some((base) => base.id === p.id))],
    gateways: DEFAULT_GATEWAYS.map((g) => ({ ...g, ...(raw.gateways?.find((x) => x.id === g.id) ?? {}), fields: { ...(raw.gateways?.find((x) => x.id === g.id)?.fields ?? {}) } })),
    providers: DEFAULT_PROVIDERS.map((p) => ({ ...p, ...(raw.providers?.find((x) => x.id === p.id) ?? {}) })),
    agents: [...DEFAULT_AGENTS.map((a) => ({ ...a, ...(raw.agents?.find((x) => x.id === a.id) ?? {}) })), ...(raw.agents ?? []).filter((a) => !DEFAULT_AGENTS.some((base) => base.id === a.id))],
    runs: Array.isArray(raw.runs) ? raw.runs.slice(0, 50) : [],
  };
}

let cache: ControlState | null = null;
const listeners = new Set<() => void>();

export function getControlState(): ControlState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = mergeState(raw ? (JSON.parse(raw) as Partial<ControlState>) : null);
  } catch {
    cache = DEFAULT_CONTROL_STATE;
  }
  return cache;
}

export function saveControlState(next: ControlState) {
  cache = next;
  pushSetting("control", next);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full/unavailable */ }
  listeners.forEach((listener) => listener());
}

export async function publishControlState(next: ControlState): Promise<void> {
  await saveSettingNow("control", next);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    if (!isServerMode()) throw new Error("فضای ذخیره مرورگر کافی نیست؛ تنظیمات ذخیره نشد.");
  }
  cache = next;
  listeners.forEach((listener) => listener());
}

export function resetControlCache() {
  cache = null;
}

export function patchControlState<K extends keyof ControlState>(key: K, value: ControlState[K]) {
  saveControlState({ ...getControlState(), [key]: value });
}

export function resetControlState() {
  saveControlState(DEFAULT_CONTROL_STATE);
  try { sessionStorage.removeItem(SECRET_KEY); } catch { /* ignore */ }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useControlState(): ControlState {
  return useSyncExternalStore(subscribe, getControlState, getControlState);
}

/* Session-only secrets, keyed by gateway/provider and field. */
function readSecrets(): Record<string, string> {
  try { return JSON.parse(sessionStorage.getItem(SECRET_KEY) ?? "{}") as Record<string, string>; } catch { return {}; }
}
export function setSecret(owner: string, field: string, value: string) {
  const secrets = readSecrets();
  const key = `${owner}.${field}`;
  if (value) secrets[key] = value;
  else delete secrets[key];
  try { sessionStorage.setItem(SECRET_KEY, JSON.stringify(secrets)); } catch { /* ignore */ }
}
export function getSecret(owner: string, field: string): string {
  return readSecrets()[`${owner}.${field}`] ?? "";
}

export function gatewayIssues(gateway: GatewayConfig): string[] {
  const issues: string[] = [];
  for (const field of GATEWAY_FIELDS[gateway.id]) {
    // Behind the server, secrets live encrypted in the vault; "__set_<key>" reports they exist.
    const value = field.secret ? getSecret(gateway.id, field.key) || (isServerMode() && gateway.fields[`__set_${field.key}`] ? "stored" : "") : gateway.fields[field.key];
    if (field.required && !value?.trim()) issues.push(`${field.label} وارد نشده است`);
  }
  if (gateway.id !== "card" && gateway.callbackUrl) {
    try { new URL(gateway.callbackUrl); } catch { issues.push("آدرس callback معتبر نیست"); }
  }
  if (gateway.id === "card" && gateway.fields.cardNumber && gateway.fields.cardNumber.replace(/\D/g, "").length !== 16) {
    issues.push("شماره کارت باید ۱۶ رقم باشد");
  }
  return issues;
}

/* ------------------------------- real AI calls ------------------------------ */
export type AIRequest = {
  provider: AIProvider;
  agent: AgentConfig;
  input: string;
  context: string;
};
export type AIResponse = { text: string; tokens: number | null; durationMs: number };

export async function callProvider({ provider, agent, input, context }: AIRequest): Promise<AIResponse> {
  if (isServerMode()) {
    // Keys never stay in the browser: a key typed into the panel is moved into the server vault.
    const typed = getSecret(provider.id, "apiKey");
    if (typed) {
      await api("/api/admin/ai/keys", { method: "PUT", body: { provider: provider.id, apiKey: typed } });
      setSecret(provider.id, "apiKey", "");
    }
    if (!provider.enabled) throw new Error(`${provider.name} غیرفعال است`);
    if (!agent.enabled) throw new Error("این ایجنت غیرفعال است");
    if (!input.trim()) throw new Error("متن درخواست را وارد کنید");
    const userText = context.trim() ? `${input.trim()}\n\nداده‌های مجاز برای این درخواست:\n${context}` : input.trim();
    return api<AIResponse>("/api/admin/ai/run", {
      method: "POST",
      body: { provider: provider.id, model: provider.model, system: agent.systemPrompt, input: userText, temperature: agent.temperature, maxTokens: agent.maxTokens },
    });
  }
  const apiKey = getSecret(provider.id, "apiKey");
  if (!apiKey) throw new Error(`کلید ${provider.name} برای این نشست وارد نشده است`);
  if (!provider.enabled) throw new Error(`${provider.name} غیرفعال است`);
  if (!agent.enabled) throw new Error("این ایجنت غیرفعال است");
  if (!input.trim()) throw new Error("متن درخواست را وارد کنید");

  const userText = context.trim() ? `${input.trim()}\n\nداده‌های مجاز برای این درخواست:\n${context}` : input.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);
  const started = Date.now();
  try {
    if (provider.id === "openai") {
      const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: "system", content: agent.systemPrompt }, { role: "user", content: userText }],
          temperature: agent.temperature,
          max_tokens: agent.maxTokens,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message ?? `OpenAI HTTP ${response.status}`);
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) throw new Error("پاسخ متنی از OpenAI دریافت نشد");
      return { text, tokens: typeof data?.usage?.total_tokens === "number" ? data.usage.total_tokens : null, durationMs: Date.now() - started };
    }

    const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/messages`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: provider.model,
        system: agent.systemPrompt,
        messages: [{ role: "user", content: userText }],
        temperature: agent.temperature,
        max_tokens: agent.maxTokens,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message ?? `Anthropic HTTP ${response.status}`);
    const text = Array.isArray(data?.content) ? data.content.filter((b: { type?: string }) => b.type === "text").map((b: { text?: string }) => b.text ?? "").join("\n") : "";
    if (!text.trim()) throw new Error("پاسخ متنی از Claude دریافت نشد");
    const tokens = typeof data?.usage?.input_tokens === "number" && typeof data?.usage?.output_tokens === "number" ? data.usage.input_tokens + data.usage.output_tokens : null;
    return { text, tokens, durationMs: Date.now() - started };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("زمان درخواست به پایان رسید؛ دوباره تلاش کنید");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function uid(prefix: string) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
