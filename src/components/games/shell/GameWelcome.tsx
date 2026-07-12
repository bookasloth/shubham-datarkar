"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * First-visit onboarding for a game, remembered per game in localStorage.
 * On the player's first ever visit it opens the How-to-play modal once (via
 * `onHowTo`); a dismissible welcome strip stays until the player closes it.
 */
export function GameWelcome({
  game,
  greeting,
  howto,
  onHowTo,
}: {
  game: string;
  greeting: string;
  howto: string;
  onHowTo: () => void;
}) {
  const seenKey = `games:seen:${game}`;
  const dismissKey = `games:welcome-dismissed:${game}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(seenKey)) {
      localStorage.setItem(seenKey, "1");
      onHowTo(); // first visit only: pop How-to-play once
    }
    setShow(localStorage.getItem(dismissKey) !== "1");
    // Run once per game on mount; onHowTo is stable enough for this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  if (!show) return null;

  return (
    <div className="flex w-full items-start gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm">
      <div className="flex-1">
        <p className="font-medium text-foreground">{greeting}</p>
        <p className="mt-0.5 text-muted-foreground">
          {howto}{" "}
          <button onClick={onHowTo} className="font-medium text-foreground underline underline-offset-4">
            How to play
          </button>
        </p>
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
