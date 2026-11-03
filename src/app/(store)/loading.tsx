import { LogoMark } from "@/components/Logo";

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/30" />
          <LogoMark className="relative size-14" />
        </div>
        <p className="text-sm tdim">در حال بارگذاری...</p>
      </div>
    </div>
  );
}
