export type SitePageBlock = {
  id: string;
  type: "text" | "image" | "feature" | "cta" | "faq";
  title: string;
  body: string;
  image: string;
  buttonLabel: string;
  buttonHref: string;
  enabled: boolean;
};

export function isSafeInternalImagePath(value: string): boolean {
  return value.length <= 1000 && value.startsWith("/") && !value.startsWith("//") &&
    !value.includes("\\") && !/[\u0000-\u001f"'<>]/.test(value);
}

export function isSafePageHref(value: string): boolean {
  if (!value || value.length > 500 || /[\u0000-\u001f\\]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("#")) return true;
  if (/^https:\/\//i.test(value)) return true;
  if (/^(mailto|tel):/i.test(value)) return true;
  return false;
}

export function normalizeSitePageBlocks(value: unknown): SitePageBlock[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;
  const out: SitePageBlock[] = [];
  const types = new Set(["text", "image", "feature", "cta", "faq"]);
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const b = raw as Record<string, unknown>;
    const type = String(b.type ?? "");
    if (!types.has(type)) return null;
    const str = (key: string, max: number) => typeof b[key] === "string" ? String(b[key]).trim().slice(0, max) : "";
    const image = str("image", 1000);
    const buttonHref = str("buttonHref", 500);
    if (image && !isSafeInternalImagePath(image)) return null;
    if (buttonHref && !isSafePageHref(buttonHref)) return null;
    out.push({
      id: str("id", 60) || crypto.randomUUID(),
      type: type as SitePageBlock["type"],
      title: str("title", 180),
      body: str("body", 8000),
      image,
      buttonLabel: str("buttonLabel", 80),
      buttonHref,
      enabled: b.enabled !== false,
    });
  }
  return out;
}
