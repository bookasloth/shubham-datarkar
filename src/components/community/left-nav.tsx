"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bookmark, User, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/community", icon: Home },
  { label: "Bookmarks", href: "/community/bookmarks", icon: Bookmark },
  { label: "Profile", href: "/community/me", icon: User },
];

export function LeftNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {ITEMS.map(({ label, href, icon: Icon }) => {
        const active = href === "/community" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-input px-3 py-2 text-sm transition-ui",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-5" /> {label}
          </Link>
        );
      })}
      <Link
        href="/community/compose"
        className="mt-2 flex items-center justify-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-ui hover:opacity-90"
      >
        <PenSquare className="size-4" /> Post
      </Link>
    </nav>
  );
}
