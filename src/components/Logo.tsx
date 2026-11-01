import { ThemeLink } from "@/components/ThemeLink";

/** Compact car-profile emblem used in loading and admin login. */
export function LogoMark({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 58" className={className} fill="none" aria-hidden="true">
      <path
        d="M7 28.5c5.4-1.6 9.5-4.7 15.1-10.4 3.5-3.5 7.3-5.1 12.3-5.2l9.2-.2c4.5 0 8.7 2.6 13.1 5.2 3.6 2.1 7 3.2 10.3 4.2 2.8.8 4.5 2.7 4.5 5.1v6.5c0 2.4-1.9 4.3-4.3 4.3H10.8c-3 0-4.9-1.9-4.9-4.6v-2.5c0-1.2.4-2 1.1-2.4Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23 19.5h20.5M12 37.8l3 4.8m42.2-4.8-3 4.8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** Primary 50500.co wordmark, inspired by the supplied car-outline logo. */
export function Logo({ className = "", href = "/", withText = true }: { className?: string; href?: string; withText?: boolean }) {
  return (
    <ThemeLink href={href} className={`group inline-flex shrink-0 items-center gap-1.5 ${className}`} aria-label="فروشگاه 50500.co">
      <span className="inline-flex items-center gap-1" dir="ltr">
        <span className="font-english text-[26px] font-black tracking-tight text-[var(--txt)] sm:text-[28px]">50500</span>
        <span className="font-english text-[16px] font-black tracking-tight text-[var(--accent-2)]">.co</span>
      </span>
      {withText && <span className="hidden text-[10px] font-semibold leading-none text-[var(--txt)] opacity-70 sm:inline">فروشگاه کفپوش خودرو</span>}
    </ThemeLink>
  );
}
