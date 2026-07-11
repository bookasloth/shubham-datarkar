"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { UserRound, Sparkles, Shield, LogOut, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth/actions";

const THEMES = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "torch", label: "Torch" },
] as const;

export function ProfileMenu({
  displayName, email, isAdmin, isPremium,
}: {
  displayName: string; email: string; isAdmin: boolean; isPremium: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);
  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent text-xs font-medium text-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium text-foreground">{displayName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/members/account"><UserRound /> <span>Account</span></Link>
        </DropdownMenuItem>
        {!isPremium && (
          <DropdownMenuItem asChild>
            <Link href="/members/upgrade"><Sparkles /> <span>Become a Member</span></Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin"><Shield /> <span>Admin</span></Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.key}
            onSelect={(e) => { e.preventDefault(); if (mounted) setTheme(t.key); }}
          >
            <span className="flex w-4 justify-center">
              {mounted && theme === t.key ? <Check className="size-4" /> : null}
            </span>
            <span>{t.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut /> <span>Log out</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
