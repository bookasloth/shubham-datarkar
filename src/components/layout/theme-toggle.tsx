"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { warmNow, WARM_TINT, COOL_TINT } from "@/lib/torch/warm-now";

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
  // Touch devices skip torch (the diya game needs a cursor + hover): dark -> light.
  const coarse = mounted && window.matchMedia("(hover: none)").matches;
  const next = coarse && current === "dark" ? "light" : NEXT[current] ?? "dark";

  // Beacon tint: the Flame is the relight target in torch, lit warm at night /
  // cool by day so it stands out as the one point of color in the dark.
  const flameTint = warmNow() ? WARM_TINT : COOL_TINT;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={mounted ? `Switch to ${next} mode` : "Toggle theme"}
      onClick={() => setTheme(next)}
      data-torch-relight
    >
      {mounted ? (
        current === "torch" ? (
          <Flame style={{ color: flameTint }} />
        ) : current === "dark" ? (
          <Sun />
        ) : (
          <Moon />
        )
      ) : (
        <Sun className="opacity-0" />
      )}
    </Button>
  );
}
