"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * First-visit onboarding strip for a game. The full guide now lives in the
 * rail's Guide card, so this is a one-line intro + dismiss — no modal pop-up.
 */
export function GameWelcome({
  game,
  greeting,
  howto,
}: {
  game: string;
  greeting: string;
  howto: string;
}) {
  const dismissKey = `games:welcome-dismissed:${game}`;
  // Default visible so the strip renders server-side / on first paint — the
  // instruction shows before the game finishes loading, and there's no post-
  // hydration pop-in. The effect only *hides* it for players who dismissed it.
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(dismissKey) === "1") setShow(false);
  }, [dismissKey]);

  if (!show) return null;

  return (
    <div className="flex w-full items-start gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm">
      <div className="flex-1">
        <p className="font-medium text-foreground">{greeting}</p>
        <p className="mt-0.5 text-muted-foreground">{howto}</p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(dismissKey, "1");
          setShow(false);
        }}
        aria-label="Dismiss welcome"
        className="rounded-btn p-1 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
