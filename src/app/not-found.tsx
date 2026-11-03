import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="relative grid min-h-[70vh] place-items-center overflow-hidden px-4 py-20 text-center">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute top-1/4 h-72 w-72 rounded-full bg-brand-500/20 blur-[110px]" />
      <div className="relative">
        <LogoMark className="mx-auto size-16" />
        <p dir="ltr" className="text-gradient mt-6 text-8xl font-black">404</p>
        <h1 className="mt-4 text-2xl font-black">صفحه مورد نظر پیدا نشد</h1>
        <p className="mt-3 text-sm text-white/55">ممکن است آدرس اشتباه باشد یا این صفحه حذف شده باشد.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary px-6 py-3.5">
            بازگشت به خانه <ArrowLeft className="size-4" />
          </Link>
          <Link href="/products" className="btn btn-ghost px-6 py-3.5">
            فروشگاه
          </Link>
        </div>
      </div>
    </div>
  );
}
