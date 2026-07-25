"use client";

import { usePathname } from "next/navigation";

/** Route prefixes that render standalone, without the global header/footer. */
const BARE_PREFIXES = [
  "/games",
  "/link",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/welcome",
  "/admin",
  "/members",
  "/community",
];

/**
 * Hides site chrome (header/footer) on standalone routes: the /games mini-app
 * (own AppShell), the bare /link + /login pages, and /admin (which has its
 * own admin shell with its own header + command palette). Renders children
 * everywhere else.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (!pathname) return <>{children}</>;
  // Embed widgets (…/embed) render bare so they can be iframed cleanly.
  if (pathname.endsWith("/embed")) return null;
  if (BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <>{children}</>;
}
