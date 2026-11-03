import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { decryptSecret } from "@/lib/secret-vault";
import { ensureDb } from "@/db/bootstrap";
import { aiJobs, products } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

export type AiTask = "keywords" | "description" | "meta" | "blog";
export type AiProvider = "openai" | "anthropic" | "offline";

type AiRuntime = { status: { provider: AiProvider; model: string; hasKey: boolean }; openaiKey: string; anthropicKey: string };

async function getAiRuntime(): Promise<AiRuntime> {
  await ensureDb();
  const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, ["secure.openai_api_key", "secure.anthropic_api_key", "ai.provider", "ai.openai_model", "ai.anthropic_model"]));
  const settings = new Map(rows.map((r) => [r.key, r.value]));
  const storedSecret = (key: string) => {
    const value = settings.get(key) || "";
    if (!value) return "";
    try { return decryptSecret(value); } catch { return ""; }
  };
  const openaiKey = storedSecret("secure.openai_api_key") || process.env.OPENAI_API_KEY || "";
  const anthropicKey = storedSecret("secure.anthropic_api_key") || process.env.ANTHROPIC_API_KEY || "";
  const forced = (settings.get("ai.provider") || process.env.AI_PROVIDER || "auto").toLowerCase();
  const openaiModel = settings.get("ai.openai_model") || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const anthropicModel = settings.get("ai.anthropic_model") || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  if (forced === "offline") return { status: { provider: "offline", model: "موتور داخلی", hasKey: false }, openaiKey, anthropicKey };
  if (forced === "openai") return openaiKey
    ? { status: { provider: "openai", model: openaiModel, hasKey: true }, openaiKey, anthropicKey }
    : { status: { provider: "offline", model: "کلید OpenAI تنظیم نشده", hasKey: false }, openaiKey, anthropicKey };
  if (forced === "anthropic") return anthropicKey
    ? { status: { provider: "anthropic", model: anthropicModel, hasKey: true }, openaiKey, anthropicKey }
    : { status: { provider: "offline", model: "کلید Claude تنظیم نشده", hasKey: false }, openaiKey, anthropicKey };
  if (openaiKey) return { status: { provider: "openai", model: openaiModel, hasKey: true }, openaiKey, anthropicKey };
  if (anthropicKey) return { status: { provider: "anthropic", model: anthropicModel, hasKey: true }, openaiKey, anthropicKey };
  return { status: { provider: "offline", model: "موتور داخلی (بدون کلید)", hasKey: false }, openaiKey, anthropicKey };
}

export async function getAiStatus() {
  return (await getAiRuntime()).status;
}

async function callOpenAI(system: string, user: string, model: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 1500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("پاسخ خالی از OpenAI");
  return text;
}

async function callAnthropic(system: string, user: string, model: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = data.content?.map((c) => c.text || "").join("").trim();
  if (!text) throw new Error("پاسخ خالی از Anthropic");
  return text;
}

const FA_STOP = new Set(
  "و در به از که با را این آن یک برای بر هر دو سه چه چیز شده شدهاست می ها های تر ترین را اگر اما چون تا ولی یا نه بله خود ما شما ایشان آن‌ها آنها بین روی زیر داخل خارج بعد قبل هنگام موقع سپس پس خیلی بیشتر کمتر خوب بد بزرگ کوچک جدید قدیم فروشگاه خودرو ماشین محصول خرید قیمت تومان سفارش ارسال شده می‌شود باشد باشند هستند هست نیست کنم کنیم کنید کند کنند کرده شود شوند شده‌ایم اما اگرچه وقتی همان همین چطور چرا کجا کی کدام همینطور همچنین ولیکن لیکن بلکه حتی فقط هم نیز خیلی".split(" "),
);

function tokenizeFa(text: string): string[] {
  return (text.match(/[آ-ی۰-۹0-9]{2,}/g) || [])
    .map((w) => w.replace(/[ً-ٟ]/g, ""))
    .filter((w) => w.length >= 3 && !FA_STOP.has(w));
}

export function offlineKeywords(topic: string, corpus: string): { keyword: string; score: number }[] {
  const text = `${topic} ${topic} ${corpus}`;
  const tokens = tokenizeFa(text);
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  const scored = [...freq.entries()].map(([keyword, f]) => ({ keyword, score: Math.round(f * (1 + keyword.length / 12) * 10) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 8);
  const bigrams = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    bigrams.set(pair, (bigrams.get(pair) ?? 0) + 1);
  }
  const topBi = [...bigrams.entries()]
    .filter(([, f]) => f >= 2)
    .map(([keyword, f]) => ({ keyword, score: Math.round(f * 14) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  return [...topBi, ...top].slice(0, 14);
}

export function offlineDescription(title: string, specs: { label: string; value: string }[], price: number): string {
  const specLine = specs.slice(0, 4).map((s) => `${s.label} ${s.value}`).join("، ");
  return [
    `${title} با طراحی اختصاصی و کیفیت ساخت بالا، انتخابی مطمئن برای خودروی شماست. این محصول با دقت در جزئیات تولید شده تا هم ظاهر کابین را ارتقا دهد و هم در استفاده روزمره دوام بیاورد.`,
    specLine
      ? `از ویژگی‌های مهم آن می‌توان به ${specLine} اشاره کرد.`
      : "از ویژگی‌های مهم آن می‌توان به کیفیت ساخت بالا و نصب آسان اشاره کرد.",
    `با قیمت ${price.toLocaleString("fa-IR")} تومان و گارانتی ۱۲ ماهه فروشگاه ۵۰۵۰۰، این محصول با خیال راحت قابل سفارش است و در کوتاه‌ترین زمان به سراسر ایران ارسال می‌شود.`,
  ].join("\n\n");
}

export function offlineMeta(title: string, desc: string): { title: string; description: string } {
  const t = `${title} | خرید با گارانتی ۱۲ ماهه 50500`.slice(0, 60);
  const d = desc.replace(/\s+/g, " ").trim().slice(0, 155) || `${title} با بهترین قیمت و ارسال سریع از فروشگاه 50500.`;
  return { title: t, description: d };
}

const SYSTEM_FA =
  "شما دستیار تولید محتوای فارسی فروشگاه اینترنتی «50500» (کفپوش چرمی گلدوزی خودرو) هستید. همیشه فارسی روان، کوتاه و فروشنده بنویسید. عدد 50500 را انگلیسی بنویسید.";

export type AiRunResult = { output: string; provider: AiProvider; model: string };

export async function runAiJob(kind: AiTask, input: string, opts: { productId?: number } = {}): Promise<AiRunResult> {
  await ensureDb();
  const runtime = await getAiRuntime();
  const status = runtime.status;
  const topic = input.trim().slice(0, 2000);
  if (!topic && kind !== "description") throw new Error("موضوع را وارد کنید");

  let output = "";
  let provider: AiProvider = status.provider;

  const prompts: Record<AiTask, string> = {
    keywords: `۱۴ کلمه کلیدی فارسی سئو برای موضوع زیر پیشنهاد بده؛ مرتبط با فروشگاه کفپوش خودرو. فقط JSON برگردان: [{"keyword":"...","score":1-100}].\nموضوع: ${topic}`,
    description: `یک توضیح محصول فارسی جذاب در ۳ پاراگراف کوتاه برای محصول زیر بنویس (بدون ایموجی):\n${topic}`,
    meta: `برای صفحه محصول زیر یک متا تایتل (حداکثر ۶۰ کاراکتر) و یک متا دیسکریپشن (حداکثر ۱۵۵ کاراکتر) فارسی بنویس. فقط JSON برگردان: {"title":"...","description":"..."}.\n${topic}`,
    blog: `یک پیش‌نویس مقاله فارسی ۴۰۰ کلمه‌ای برای مجله فروشگاه کفپوش خودرو با موضوع زیر بنویس؛ با تیتر و پاراگراف:\n${topic}`,
  };

  if (status.provider === "openai" || status.provider === "anthropic") {
    try {
      output =
        status.provider === "openai"
          ? await callOpenAI(SYSTEM_FA, prompts[kind], status.model, runtime.openaiKey)
          : await callAnthropic(SYSTEM_FA, prompts[kind], status.model, runtime.anthropicKey);
    } catch {
      provider = "offline";
    }
  }

  if (!output) {
    provider = "offline";
    if (kind === "keywords") {
      let corpus = "";
      try {
        const rows = await db.select({ title: products.title }).from(products).limit(120);
        corpus = rows.map((r) => r.title).join(" ");
      } catch {
        corpus = "";
      }
      output = JSON.stringify(offlineKeywords(topic, corpus), null, 1);
    } else if (kind === "description" && opts.productId) {
      const [p] = await db.select().from(products).where(eq(products.id, opts.productId)).limit(1);
      if (!p) throw new Error("محصول پیدا نشد");
      output = offlineDescription(p.title, p.specs, p.price);
    } else if (kind === "meta") {
      output = JSON.stringify(offlineMeta(topic.split("\n")[0] || topic, topic), null, 1);
    } else {
      output = `پیش‌نویس آفلاین برای «${topic.slice(0, 80)}»:\n\nبرای تولید متن کامل با هوش مصنوعی، کلید OpenAI یا Anthropic را در متغیرهای محیطی (OPENAI_API_KEY یا ANTHROPIC_API_KEY) ثبت کنید. در حالت آفلاین، ابزار کلمات کلیدی و توضیح محصول کاملاً فعال است.`;
    }
  }

  await db.insert(aiJobs).values({ kind, input: topic.slice(0, 4000), output: output.slice(0, 12000), provider, status: "done" });
  return { output, provider, model: provider === "offline" ? "موتور داخلی" : status.model };
}

export async function getAiHistory(limit = 30) {
  await ensureDb();
  return db.select().from(aiJobs).orderBy(desc(aiJobs.id)).limit(limit);
}
