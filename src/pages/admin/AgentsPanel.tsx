import { useEffect, useState } from "react";
import { Bot, Check, Clipboard, Download, KeyRound, LoaderCircle, Play, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { callProvider, downloadJSON, getSecret, patchControlState, setSecret, uid, useControlState, type AgentConfig, type AgentPermission, type AgentRun, type AIProvider } from "@/lib/control-center";
import { getProducts } from "@/lib/catalog";
import { useSiteContent } from "@/lib/site-content";
import { money, type AdminOrder } from "@/lib/admin";
import { fa } from "@/lib/format";
import { Badge, Card, EmptyState, Field, Notice, PanelHeader, Toggle } from "./ControlUi";

type Scope = "none" | "products" | "orders" | "content";
type ProviderStatus = { state: "idle" | "busy" | "ok" | "error"; message: string };
const SCOPES: { id: Scope; label: string; permission?: AgentPermission }[] = [
  { id: "none", label: "بدون داده فروشگاه" },
  { id: "products", label: "محصولات واقعی", permission: "products:read" },
  { id: "orders", label: "سفارش‌های واقعی", permission: "orders:read" },
  { id: "content", label: "محتوای فعلی سایت", permission: "content:read" },
];
const PERMISSIONS: { id: AgentPermission; label: string }[] = [
  { id: "products:read", label: "خواندن محصولات" },
  { id: "orders:read", label: "خواندن سفارش‌ها" },
  { id: "content:read", label: "خواندن محتوا" },
  { id: "content:write", label: "اعمال نتیجه در محتوا" },
];

export function AgentsPanel({ onToast, orders }: { onToast: (message: string) => void; orders: AdminOrder[] }) {
  const state = useControlState();
  const { content, updateHero } = useSiteContent();
  const [selectedId, setSelectedId] = useState(state.agents[0]?.id ?? "");
  const [draft, setDraft] = useState<AgentConfig | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({});
  const [, setSecretVersion] = useState(0);
  const [scope, setScope] = useState<Scope>("none");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");

  const selected = state.agents.find((agent) => agent.id === selectedId) ?? state.agents[0];
  useEffect(() => { setDraft(selected ? { ...selected, permissions: [...selected.permissions] } : null); setScope("none"); setOutput(""); setRunError(""); }, [selectedId]);
  const provider = draft ? state.providers.find((item) => item.id === draft.provider) : undefined;
  const allowedScopes = SCOPES.filter((item) => !item.permission || draft?.permissions.includes(item.permission));

  const updateProvider = (id: AIProvider["id"], patch: Partial<AIProvider>) => {
    patchControlState("providers", state.providers.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const testProvider = async (item: AIProvider) => {
    setStatuses((current) => ({ ...current, [item.id]: { state: "busy", message: "در حال ارسال درخواست واقعی…" } }));
    try {
      const result = await callProvider({
        provider: item,
        agent: { id: "connection-test", name: "تست اتصال", description: "", provider: item.id, enabled: true, systemPrompt: "Answer briefly.", temperature: 0, maxTokens: 16, permissions: [] },
        input: "Reply with the single word: connected",
        context: "",
      });
      setStatuses((current) => ({ ...current, [item.id]: { state: "ok", message: `اتصال موفق · ${result.tokens ? `${fa(result.tokens)} توکن · ` : ""}${fa(result.durationMs)}ms` } }));
    } catch (error) {
      setStatuses((current) => ({ ...current, [item.id]: { state: "error", message: error instanceof Error ? error.message : "اتصال ناموفق" } }));
    }
  };

  const saveAgent = () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.systemPrompt.trim()) { onToast("نام و دستور سیستم ایجنت الزامی است"); return; }
    const exists = state.agents.some((agent) => agent.id === draft.id);
    patchControlState("agents", exists ? state.agents.map((agent) => agent.id === draft.id ? draft : agent) : [...state.agents, draft]);
    onToast(`ایجنت «${draft.name}» ذخیره شد`);
  };

  const addAgent = () => {
    const agent: AgentConfig = {
      id: uid("agent"), name: "ایجنت جدید", description: "دستیار اختصاصی فروشگاه", provider: "openai", enabled: true,
      systemPrompt: "تو دستیار فروشگاه 50500 هستی. فارسی دقیق و کاربردی پاسخ بده و داده‌ای را جعل نکن.",
      temperature: 0.5, maxTokens: 700, permissions: ["content:read"],
    };
    patchControlState("agents", [...state.agents, agent]);
    setSelectedId(agent.id);
    setDraft(agent);
  };

  const deleteAgent = () => {
    if (!draft || !window.confirm(`ایجنت «${draft.name}» حذف شود؟`)) return;
    patchControlState("agents", state.agents.filter((agent) => agent.id !== draft.id));
    setSelectedId(state.agents.find((agent) => agent.id !== draft.id)?.id ?? "");
    onToast("ایجنت حذف شد");
  };

  const contextFor = (value: Scope) => {
    if (value === "products") return getProducts().slice(0, 16).map((product) => ({ title: product.title, price: product.price, stock: product.stock, category: product.category, brand: product.brandName }));
    if (value === "orders") return orders.slice(0, 12).map((order) => ({ code: order.code, customer: order.customer, status: order.status, payment: order.payment, total: money(order.total), createdAt: order.createdAt }));
    if (value === "content") return { hero: content.hero, promo: content.promo, contact: content.contact, headings: content.headings };
    return "";
  };

  const run = async () => {
    if (!draft || !provider) return;
    if (scope !== "none" && !allowedScopes.some((item) => item.id === scope)) { setRunError("این ایجنت اجازه دسترسی به داده انتخابی را ندارد"); return; }
    setRunning(true); setRunError(""); setOutput("");
    const startedAt = new Date().toISOString();
    try {
      const result = await callProvider({ provider, agent: draft, input, context: typeof contextFor(scope) === "string" ? contextFor(scope) as string : JSON.stringify(contextFor(scope), null, 2) });
      setOutput(result.text);
      const record: AgentRun = { id: uid("run"), agentId: draft.id, agentName: draft.name, provider: provider.id, model: provider.model, scope, input, output: result.text, status: "success", tokens: result.tokens, durationMs: result.durationMs, createdAt: startedAt };
      patchControlState("runs", [record, ...state.runs].slice(0, 50));
      onToast("پاسخ واقعی ایجنت دریافت شد");
    } catch (error) {
      const message = error instanceof Error ? error.message : "اجرای ایجنت ناموفق بود";
      setRunError(message);
      const record: AgentRun = { id: uid("run"), agentId: draft.id, agentName: draft.name, provider: provider.id, model: provider.model, scope, input, output: message, status: "error", tokens: null, durationMs: 0, createdAt: startedAt };
      patchControlState("runs", [record, ...state.runs].slice(0, 50));
    } finally { setRunning(false); }
  };

  const statusBadge = (status?: ProviderStatus) => !status || status.state === "idle" ? null : <Badge tone={status.state === "ok" ? "green" : status.state === "error" ? "rose" : "amber"}>{status.message}</Badge>;

  return (
    <div className="grid gap-5">
      <PanelHeader
        title="ایجنت‌های Claude و GPT"
        description="دستیارهای محتوا، SEO و پشتیبانی با مدل، دستور سیستم و سطح دسترسی مستقل؛ اجرای واقعی API و ثبت تاریخچه."
        actions={<>
          <button onClick={() => downloadJSON("50500-agent-runs.json", state.runs)} className="btn btn-ghost px-4 py-2.5 text-xs"><Download className="size-4" /> خروجی تاریخچه</button>
          <button onClick={addAgent} className="btn btn-primary px-4 py-2.5 text-xs"><Plus className="size-4" /> ایجنت جدید</button>
        </>}
      />
      <Notice tone="warning">کلیدها فقط در نشست مرورگر وارد می‌شوند و در localStorage ذخیره نمی‌شوند. اتصال مستقیم مرورگر برای استفاده شخصی/تست است؛ در production کلیدها باید پشت API سرور قرار بگیرند.</Notice>

      <div className="grid gap-4 lg:grid-cols-2">
        {state.providers.map((item) => {
          const status = statuses[item.id];
          return (
            <Card key={item.id} title={item.name} description="مدل و آدرس API قابل تغییر است" action={<Bot className="size-5 text-brand-400" />}>
              <div className="grid gap-3">
                <Toggle checked={item.enabled} onChange={(enabled) => updateProvider(item.id, { enabled })} label="فعال‌سازی سرویس" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="مدل"><input className="input" dir="ltr" value={item.model} onChange={(event) => updateProvider(item.id, { model: event.target.value })} /></Field>
                  <Field label="Base URL"><input className="input" dir="ltr" value={item.baseUrl} onChange={(event) => updateProvider(item.id, { baseUrl: event.target.value })} /></Field>
                </div>
                <Field label="API Key این نشست" hint="پس از بستن مرورگر یا پاک‌کردن نشست حذف می‌شود">
                  <div className="relative"><KeyRound className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 tfaint" /><input className="input pe-10" dir="ltr" type="password" autoComplete="off" value={getSecret(item.id, "apiKey")} onChange={(event) => { setSecret(item.id, "apiKey", event.target.value); setSecretVersion((value) => value + 1); }} placeholder={item.id === "openai" ? "sk-..." : "sk-ant-..."} /></div>
                </Field>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => void testProvider(item)} disabled={status?.state === "busy"} className="btn btn-ghost px-4 py-2.5 text-xs disabled:opacity-60">{status?.state === "busy" ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} تست اتصال واقعی</button>
                  {statusBadge(status)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="self-start" title="ایجنت‌های فروشگاه" description={`${fa(state.agents.length)} ایجنت قابل تنظیم`}>
          <div className="grid gap-2">
            {state.agents.map((agent) => (
              <button key={agent.id} onClick={() => setSelectedId(agent.id)} className={`rounded-2xl border p-3 text-start transition ${selectedId === agent.id ? "border-brand-500/40 bg-brand-500/10" : "bd soft-h"}`}>
                <span className="flex items-center justify-between gap-2"><span className="text-xs font-black">{agent.name}</span><Badge tone={agent.enabled ? "green" : "neutral"}>{agent.provider === "openai" ? "GPT" : "Claude"}</Badge></span>
                <span className="mt-1 block text-[10px] leading-5 tdim">{agent.description}</span>
              </button>
            ))}
          </div>
        </Card>

        {draft && (
          <Card title={`تنظیم ${draft.name}`} description="دسترسی‌ها تعیین می‌کنند چه داده‌ای به مدل ارسال شود">
            <div className="grid gap-4">
              <Toggle checked={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} label="ایجنت فعال باشد" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نام ایجنت"><input className="input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
                <Field label="سرویس‌دهنده"><select className="input" value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.target.value as AgentConfig["provider"] })}>{state.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              </div>
              <Field label="توضیح"><input className="input" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
              <Field label="دستور سیستم (System Prompt)"><textarea className="input min-h-28" value={draft.systemPrompt} onChange={(event) => setDraft({ ...draft, systemPrompt: event.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`دمای خلاقیت: ${fa(draft.temperature)}`}><input type="range" min={0} max={1} step={0.05} value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: Number(event.target.value) })} /></Field>
                <Field label="حداکثر توکن خروجی"><input className="input" type="number" min={64} max={4000} value={draft.maxTokens} onChange={(event) => setDraft({ ...draft, maxTokens: Math.max(64, Math.min(4000, Number(event.target.value) || 64)) })} /></Field>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold tdim">مجوزهای داده و عملیات</p>
                <div className="grid gap-2 sm:grid-cols-2">{PERMISSIONS.map((permission) => {
                  const checked = draft.permissions.includes(permission.id);
                  return <Toggle key={permission.id} checked={checked} onChange={(value) => setDraft({ ...draft, permissions: value ? [...draft.permissions, permission.id] : draft.permissions.filter((item) => item !== permission.id) })} label={permission.label} />;
                })}</div>
              </div>
              <div className="flex flex-wrap gap-2"><button onClick={saveAgent} className="btn btn-primary px-4 py-2.5 text-xs"><Save className="size-4" /> ذخیره ایجنت</button><button onClick={deleteAgent} className="btn btn-ghost px-4 py-2.5 text-xs !text-rose-400"><Trash2 className="size-4" /> حذف</button></div>
            </div>
          </Card>
        )}
      </div>

      {draft && (
        <Card title="میز کار ایجنت" description="درخواست واقعی به مدل ارسال می‌شود؛ هیچ پاسخ از پیش ساخته‌ای وجود ندارد" action={<Badge tone="brand">{provider?.name} · {provider?.model}</Badge>}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <Field label="داده‌ای که همراه درخواست ارسال شود">
                <select className="input" value={scope} onChange={(event) => setScope(event.target.value as Scope)}>{allowedScopes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
              </Field>
              <Field label="درخواست شما"><textarea className="input min-h-44" value={input} onChange={(event) => setInput(event.target.value)} placeholder="مثلاً برای صفحه اصلی یک توضیح کوتاه و حرفه‌ای بنویس…" /></Field>
              <button onClick={() => void run()} disabled={running || !input.trim()} className="btn btn-primary py-3 text-xs disabled:opacity-50">{running ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />} {running ? "در حال دریافت پاسخ…" : "اجرای ایجنت"}</button>
              {runError && <p className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-3 text-xs leading-6 text-rose-300">{runError}</p>}
            </div>
            <div className="grid content-start gap-3">
              <Field label="خروجی"><textarea className="input min-h-64" dir="auto" value={output} onChange={(event) => setOutput(event.target.value)} placeholder="پاسخ مدل اینجا نمایش داده می‌شود" /></Field>
              <div className="flex flex-wrap gap-2">
                <button disabled={!output} onClick={() => { void navigator.clipboard?.writeText(output); onToast("خروجی کپی شد"); }} className="btn btn-ghost px-4 py-2.5 text-xs disabled:opacity-50"><Clipboard className="size-4" /> کپی</button>
                {draft.permissions.includes("content:write") && <button disabled={!output} onClick={() => { updateHero({ description: output }); onToast("خروجی در توضیح هیرو اعمال شد"); }} className="btn btn-ghost px-4 py-2.5 text-xs disabled:opacity-50"><Check className="size-4" /> اعمال در توضیح هیرو</button>}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card title="آخرین اجراها" description={`${fa(state.runs.length)} رکورد؛ حداکثر ۵۰ اجرای آخر نگه داشته می‌شود`}>
        {state.runs.length ? <div className="grid gap-2">{state.runs.slice(0, 10).map((run) => (
          <button key={run.id} onClick={() => { const agent = state.agents.find((item) => item.id === run.agentId); if (agent) setSelectedId(agent.id); setInput(run.input); setOutput(run.output); setScope(run.scope); }} className="rounded-2xl border bd p-3 text-start transition soft-h">
            <span className="flex flex-wrap items-center gap-2"><Badge tone={run.status === "success" ? "green" : "rose"}>{run.status === "success" ? "موفق" : "خطا"}</Badge><span className="text-xs font-black">{run.agentName}</span><span className="text-[10px] tdim">{run.model}</span><span className="ms-auto text-[10px] tdim">{run.tokens ? `${fa(run.tokens)} توکن · ` : ""}{new Date(run.createdAt).toLocaleString("fa-IR")}</span></span>
            <span className="mt-2 block truncate text-[11px] tdim">{run.input}</span>
          </button>
        ))}</div> : <EmptyState icon={<Bot className="size-7" />} title="هنوز اجرایی ثبت نشده" description="یک ایجنت و داده مجاز را انتخاب کنید و اولین درخواست واقعی را اجرا کنید." />}
      </Card>
    </div>
  );
}
