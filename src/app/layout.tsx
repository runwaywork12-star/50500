import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "فروشگاه 50500 | کفپوش چرمی گلدوزی اختصاصی خودرو",
    template: "%s | فروشگاه 50500",
  },
  description:
    "فروشگاه 50500؛ تولید و فروش کفپوش چرمی گلدوزی پنج بعدی اختصاصی برای بیش از ۱۵۰ مدل خودرو، با انتخاب رنگ چرم و رنگ گلدوزی، ۱۲ ماه گارانتی و ارسال به سراسر ایران.",
  keywords: ["کفپوش چرمی گلدوزی", "کفپوش پنج بعدی", "کفپوش چرمی خودرو", "کفپوش گلدوزی", "فروشگاه 50500"],
};

export const viewport: Viewport = {
  themeColor: "#050608",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-ink-950 font-sans text-[var(--txt)] antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
