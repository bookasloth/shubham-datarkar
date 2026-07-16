"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import {
  APP_NAV, accountItems, activeSection, activeChildHref, matches, sectionHref,
  type AppNavItem, type AppNavSection,
} from "./nav-config";

function linkCls(active: boolean): string {
  return cn(
    "block rounded-input px-3 py-1.5 text-sm transition-ui",
    active
      ? "bg-accent font-medium text-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );
}

function SidebarLink({
  item,
  activeHref,
  signedIn,
  onNavigate,
}: {
  item: AppNavItem;
  activeHref: string | null;
  signedIn: boolean;
  onNavigate?: () => void;
}) {
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={linkCls(false)}
      >
        {item.label}
      </a>
    );
  }
  const active = item.href === activeHref;
  const href =
    !signedIn && item.gated ? `/login?next=${encodeURIComponent(item.href)}` : item.href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={linkCls(active)}
    >
      {item.label}
    </Link>
  );
}

/** Section name row — a plain link; the active section gets the brand pill. */
function SectionRow({
  section,
  active,
  signedIn,
  onNavigate,
}: {
  section: AppNavSection;
  active: boolean;
  signedIn: boolean;
  onNavigate?: () => void;
}) {
  const Icon = section.icon;
  const target = sectionHref(section.key);
  const href =
    !signedIn && section.items[0]?.gated
      ? `/login?next=${encodeURIComponent(target)}`
      : target;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition-ui",
        active ? "bg-brand text-brand-foreground" : "hover:bg-accent",
      )}
    >
      <Icon className="size-4" /> {section.label}
    </Link>
  );
}

/** Children of the active section, always visible — no toggle, no chevron. */
function SectionChildren({
  section,
  pathname,
  activeHref,
  signedIn,
  onNavigate,
}: {
  section: AppNavSection;
  pathname: string;
  activeHref: string | null;
  signedIn: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-0.5 pb-1 pl-4 pt-1">
      {section.items.map((item) =>
        // A group (each game) is a name link; only the game you're inside
        // shows its Play / Archive / Leaderboard sub-links.
        item.children ? (
          <div key={item.label + item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={linkCls(false)}
            >
              {item.label}
            </Link>
            {matches(pathname, item.href) && (
              <div className="space-y-0.5 pl-2">
                {item.children.map((child) => (
                  <SidebarLink
                    key={child.label + child.href}
                    item={child}
                    activeHref={activeHref}
                    signedIn={signedIn}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <SidebarLink
            key={item.label + item.href}
            item={item}
            activeHref={activeHref}
            signedIn={signedIn}
            onNavigate={onNavigate}
          />
        ),
      )}
    </nav>
  );
}

export function AppSidebar({
  signedIn,
  isPremium,
  onNavigate,
}: {
  signedIn: boolean;
  isPremium: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const section = activeSection(pathname);
  const activeHref = activeChildHref(pathname);

  // Active section floats to the top; Account is always pinned last.
  const main = APP_NAV.filter((s) => s.key !== "account");
  const ordered =
    section && section !== "account"
      ? [
          main.find((s) => s.key === section)!,
          ...main.filter((s) => s.key !== section),
        ]
      : main;
  const account = APP_NAV.find((s) => s.key === "account")!;

  return (
    <div className="space-y-1">
      {ordered.map((s) => {
        const active = s.key === section;
        return (
          <div key={s.key}>
            <SectionRow
              section={s}
              active={active}
              signedIn={signedIn}
              onNavigate={onNavigate}
            />
            {active && (
              <SectionChildren
                section={s}
                pathname={pathname}
                activeHref={activeHref}
                signedIn={signedIn}
                onNavigate={onNavigate}
              />
            )}
          </div>
        );
      })}

      <div className="!my-2 border-t border-border" />

      <SectionRow
        section={account}
        active={section === "account"}
        signedIn={signedIn}
        onNavigate={onNavigate}
      />
      {section === "account" && (
        <nav className="space-y-0.5 pb-1 pl-4 pt-1">
          {accountItems(isPremium).map((item) => (
            <SidebarLink
              key={item.label + item.href}
              item={item}
              activeHref={activeHref}
              signedIn={signedIn}
              onNavigate={onNavigate}
            />
          ))}
          <form action={signOut}>
            <button
              type="submit"
              onClick={onNavigate}
              className={cn(linkCls(false), "w-full text-left")}
            >
              Logout
            </button>
          </form>
        </nav>
      )}
    </div>
  );
}
