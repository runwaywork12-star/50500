/** Prefix internal storefront routes while the light-skin route group (/v2) is active. */
export function themePath(pathname: string | null | undefined, href: string): string {
  const isLight = pathname === "/v2" || Boolean(pathname?.startsWith("/v2/"));
  if (!isLight || !href.startsWith("/") || href.startsWith("//")) return href;
  if (href.startsWith("/v2/") || href === "/v2") return href;
  if (href.startsWith("/api/") || href.startsWith("/admin") || href.startsWith("/_next/")) return href;
  return href === "/" ? "/v2" : `/v2${href}`;
}
