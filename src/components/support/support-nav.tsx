"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/support", label: "Support" },
  { href: "/support/updates", label: "Updates" },
  { href: "/support/supporters", label: "Supporters" },
];

/** Page-based sub-nav (links, not tabs). Active state from the pathname. */
export function SupportNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Support sections" className="flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = t.href === "/support" ? pathname === "/support" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-ui",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
