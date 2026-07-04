"use client";

import { usePathname } from "next/navigation";

/** Route prefixes that render standalone, without the global header/footer. */
const BARE_PREFIXES = ["/games", "/link", "/login"];

/**
 * Hides site chrome (header/footer) on standalone routes: the /games mini-app
 * (own GamesHeader) and the bare /link + /login pages. Renders children
 * everywhere else.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname && BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <>{children}</>;
}
