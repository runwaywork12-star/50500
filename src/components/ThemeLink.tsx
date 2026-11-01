"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { themePath } from "@/lib/theme-path";

type Props = ComponentProps<typeof Link> & {
  /** Force the destination skin. Usually leave unset so links stay in the current theme. */
  skin?: "dark" | "light";
};

/** Keep ordinary internal navigation inside /v2 while the light skin is active. */
export function ThemeLink({ href, skin, ...props }: Props) {
  const pathname = usePathname() ?? "/";
  const isLight = skin ? skin === "light" : pathname === "/v2" || pathname.startsWith("/v2/");
  const target = isLight && typeof href === "string" ? themePath("/v2", href) : href;
  return <Link href={target} {...props} />;
}
