"use client";

import { usePathname } from "next/navigation";

/**
 * Hides site chrome (header/footer) on the standalone /games mini-app,
 * which provides its own GamesHeader. Renders children everywhere else.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/games")) return null;
  return <>{children}</>;
}
