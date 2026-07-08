"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

// Cycle order: light -> dark -> torch (extra dark) -> light
const ORDER = ["light", "dark", "torch"] as const;
const NEXT: Record<string, string> = { light: "dark", dark: "torch", torch: "light" };

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // Hydration guard: theme is only known on the client (next-themes).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  // `theme` is "system" until resolved; fall back to resolvedTheme for the cycle.
  const current = theme && ORDER.includes(theme as (typeof ORDER)[number]) ? theme : resolvedTheme ?? "dark";
  const next = NEXT[current] ?? "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={mounted ? `Switch to ${next} mode` : "Toggle theme"}
      onClick={() => setTheme(next)}
    >
      {mounted ? (
        current === "torch" ? <Flame /> : current === "dark" ? <Sun /> : <Moon />
      ) : (
        <Sun className="opacity-0" />
      )}
    </Button>
  );
}
