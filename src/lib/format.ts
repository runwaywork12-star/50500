const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const numberFormat = new Intl.NumberFormat("fa-IR");

/** Locale-aware number formatting. Second argument forces English digits. */
export function fa(value: number | string, locale: "fa" | "en" = "fa"): string {
 if (typeof value === "number") {
  return locale === "en" ? new Intl.NumberFormat("en-US").format(value) : numberFormat.format(value);
 }
 const src = String(value);
 if (locale === "en") return toEnDigits(src).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
 return src.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEnDigits(value: string): string {
 return value
  .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

export function faDate(date: Date | string, withTime = false): string {
 return new Intl.DateTimeFormat(
  "fa-IR",
  withTime
   ? { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }
   : { dateStyle: "long", timeZone: "Asia/Tehran" },
 ).format(new Date(date));
}

export function discountPercent(price: number, compare: number | null | undefined): number {
 if (!compare || compare <= price) return 0;
 return Math.round((1 - price / compare) * 100);
}

export function compactFa(n: number): string {
 if (n >= 1000) return `${fa(Math.round(n / 100) / 10)} هزار`;
 return fa(n);
}

export function normalizePhone(value: string): string {
 let s = toEnDigits(value).replace(/[^0-9]/g, "");
 if (s.startsWith("0098")) s = "0" + s.slice(4);
 else if (s.startsWith("98")) s = "0" + s.slice(2);
 if (s.length === 10 && s.startsWith("9")) s = "0" + s;
 return s;
}

export function maskPhone(phone: string): string {
 if (phone.length < 8) return fa(phone);
 return fa(`${phone.slice(0, 4)}***${phone.slice(-4)}`);
}

export function normalizeFa(value: string): string {
 return value.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ").trim();
}

export function cn(...classes: (string | false | null | undefined)[]): string {
 return classes.filter(Boolean).join(" ");
}

export function money(value: number): string {
 return `${fa(Math.round(value))} تومان`;
}
