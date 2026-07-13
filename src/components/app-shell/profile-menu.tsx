"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Crown, Zap, Settings, HelpCircle, Shield, LogOut,
  Monitor, Sun, Moon, Flame,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const THEMES = [
  { key: "system", label: "System", icon: Monitor },
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "torch", label: "Torch", icon: Flame },
] as const;

export function ProfileMenu({
  displayName, email, username, isAdmin, isPremium,
}: {
  displayName: string; email: string; username: string | null;
  isAdmin: boolean; isPremium: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);
  const seed = username || email;
  const handle = username ? `@${username}` : email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <CommunityAvatar seed={seed} size={32} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        {/* Identity */}
        <div className="flex items-center gap-3 px-1.5 py-2">
          <CommunityAvatar seed={seed} size={40} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{handle}</p>
          </div>
        </div>

        {/* View profile */}
        <DropdownMenuItem asChild className="mt-1 justify-center bg-brand/10 py-2 font-medium text-brand focus:bg-brand/20 focus:text-brand">
          <Link href="/community/me">View Your Profile</Link>
        </DropdownMenuItem>

        {/* Membership status */}
        <DropdownMenuItem
          asChild
          className="mt-1.5 justify-center gap-2 bg-brand py-2 font-medium text-white focus:bg-brand focus:text-white [&_svg]:text-white"
        >
          <Link href={isPremium ? "/members/account" : "/members/upgrade"}>
            <Crown />
            {isPremium ? "You're a Premium Member" : "Get Premium Membership"}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/tools/kalamai"><Zap /> <span>Try KalamAI</span></Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/members/account"><Settings /> <span>Settings &amp; Privacy</span></Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contact"><HelpCircle /> <span>Help and Support</span></Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin"><Shield /> <span>Admin</span></Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut /> <span>Sign Out</span>
            </button>
          </form>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme */}
        <div className="flex items-center gap-2 px-1.5 py-1">
          <span className="text-xs text-muted-foreground">Mode:</span>
          <div className="flex gap-1">
            {THEMES.map((t) => {
              const Icon = t.icon;
              const active = mounted && theme === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-label={t.label}
                  aria-pressed={active}
                  onClick={() => mounted && setTheme(t.key)}
                  className={cn(
                    "grid size-8 place-items-center rounded-btn border transition-ui",
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
