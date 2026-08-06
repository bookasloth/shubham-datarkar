"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gem, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import {
  APP_NAV, accountItems, activeSection, activeChildHref, matches, sectionHref,
  type AppNavItem, type AppNavSection,
} from "./nav-config";

/** Hardcoded card copy — no DB field for these yet (see getShellUser). */
const CARD_TAGLINE = "Founder and SEO Expert";
const CARD_BIO = "Building in public. Come for the tools, stay for the games.";

/** The identity slice the profile card renders. Null when signed out. */
export type SidebarProfile = {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  postCount: number;
  followers: number;
  following: number;
};

/** 2500 → "2.5K", 999 → "999". */
function fmt(n: number): string {
  if (n < 1000) return String(n);
  return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "SD";
}

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

/** Section name row — colored icon + label; active section gets the brand pill. */
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
      {/* Colored icon like the reference; on the active pill it inherits the pill's foreground. */}
      <Icon className={cn("size-4", !active && section.color)} /> {section.label}
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

/** Cover banner + overlapping avatar + name/tagline/bio + stats (the reference header). */
function ProfileCard({
  profile,
  onNavigate,
}: {
  profile: SidebarProfile | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      {/* Cover — gradient, no image asset needed. */}
      <div className="h-16 bg-gradient-to-r from-brand/70 via-brand to-foreground/60" />
      <div className="px-4 pb-4">
        {/* Avatar overlaps the cover. */}
        <div className="-mt-8 mb-2 flex justify-center">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external avatar host, avoids next/image host config
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-16 rounded-input border-4 border-card object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-input border-4 border-card bg-accent text-lg font-semibold text-foreground">
              {profile ? initials(profile.displayName) : "SD"}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="truncate text-base font-semibold text-foreground">
            {profile?.displayName ?? "Guest"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {profile ? CARD_TAGLINE : "You're browsing as a guest"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile ? CARD_BIO : "Sign in to post, follow, and play."}
          </p>
        </div>

        {profile ? (
          <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3 text-center">
            {[
              { label: "Posts", value: profile.postCount },
              { label: "Followers", value: profile.followers },
              { label: "Following", value: profile.following },
            ].map((s) => (
              <div key={s.label} className="px-1">
                <p className="text-sm font-semibold text-foreground">{fmt(s.value)}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="mt-4 flex items-center justify-center rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
          >
            Sign in
          </Link>
        )}

        {profile?.username && (
          <Link
            href={`/community/u/${profile.username}`}
            onClick={onNavigate}
            className="mt-3 block text-center text-sm font-medium text-brand transition-ui hover:underline"
          >
            View Profile
          </Link>
        )}
      </div>
    </div>
  );
}

export function AppSidebar({
  signedIn,
  isPremium,
  profile,
  onNavigate,
}: {
  signedIn: boolean;
  isPremium: boolean;
  profile: SidebarProfile | null;
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

  // Create opens the composer; gated behind login like the composer FAB.
  const composeHref = signedIn
    ? "/community/compose"
    : `/login?next=${encodeURIComponent("/community/compose")}`;

  return (
    <div className="flex h-full flex-col">
      <ProfileCard profile={profile} onNavigate={onNavigate} />

      <div className="mt-3 flex-1 space-y-1">
      {/* Standalone Home row above the sections (Tumblr-style). */}
      <Link
        href="/"
        onClick={onNavigate}
        aria-current={pathname === "/" ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition-ui",
          pathname === "/" ? "bg-brand text-brand-foreground" : "hover:bg-accent",
        )}
      >
        <Home className={cn("size-4", pathname !== "/" && "text-rose-500")} /> Home
      </Link>

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
            {/* Children only for signed-in members — logged out, a section is
                just a name that navigates, no dropdown. */}
            {active && signedIn && (
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
      {section === "account" && signedIn && (
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

      {/* Bottom CTAs — pinned under the scrollable nav (Tumblr's Go Premium / Create). */}
      <div className="mt-2 space-y-2 border-t border-border pt-3">
        {!isPremium && (
          <Link
            href="/members/upgrade"
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 rounded-btn border border-border px-4 py-2 text-sm font-medium transition-ui hover:bg-accent"
          >
            <Gem className="size-4" /> Go Premium
          </Link>
        )}
        <Link
          href={composeHref}
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
        >
          <PenSquare className="size-4" /> Create
        </Link>

        {/* Footer links (reference: About / Support / Contact). */}
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          <Link href="/about" onClick={onNavigate} className="transition-ui hover:text-foreground">About</Link>
          <Link href="/support" onClick={onNavigate} className="transition-ui hover:text-foreground">Support</Link>
          <Link href="/contact" onClick={onNavigate} className="transition-ui hover:text-foreground">Contact</Link>
        </nav>
      </div>
    </div>
  );
}
