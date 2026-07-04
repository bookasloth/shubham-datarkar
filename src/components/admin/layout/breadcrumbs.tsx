"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { resolveBreadcrumbs } from "./nav-config";

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = resolveBreadcrumbs(pathname);
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-admin-text-muted" aria-hidden />}
            {last ? (
              <span className="font-medium text-admin-text" aria-current="page">{c.label}</span>
            ) : (
              <Link href={c.href} className="text-admin-text-muted transition-[color] duration-150 hover:text-admin-text">
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
