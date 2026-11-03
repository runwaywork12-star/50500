import { LEATHER_COLORS, THREAD_COLORS, type Swatch } from "@/data/content";

export { LEATHER_COLORS, THREAD_COLORS };

export const OPTION_LABELS = {
  leather: "رنگ چرم",
  thread: "رنگ گلدوزی",
} as const;

export function leatherById(id: string): Swatch {
  return LEATHER_COLORS.find((item) => item.id === id) ?? LEATHER_COLORS[0];
}

export function threadById(id: string): Swatch {
  return THREAD_COLORS.find((item) => item.id === id) ?? THREAD_COLORS[0];
}

export const PRICE_RANGES = [
  { id: "0-1000000", name: "تا ۱ میلیون تومان" },
  { id: "1000000-3000000", name: "۱ تا ۳ میلیون تومان" },
  { id: "3000000-6000000", name: "۳ تا ۶ میلیون تومان" },
  { id: "6000000-10000000", name: "۶ تا ۱۰ میلیون تومان" },
  { id: "10000000-100000000", name: "بالای ۱۰ میلیون تومان" },
];