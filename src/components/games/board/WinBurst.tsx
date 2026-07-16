"use client";

import * as React from "react";
import { ConfettiBurst, type ConfettiHandle } from "@/components/support/confetti-burst";

/** Games run the burst slower than /support does — a win is savoured, not punctuated. */
const TIME_SCALE = 0.7;

/**
 * How long a board must keep <WinBurst/> mounted. Unmounting cancels the rAF loop
 * and clears the canvas, so anything shorter than the burst's own flight time cuts
 * the celebration off mid-air.
 */
export const WIN_BURST_MS = 4000;

/**
 * Shared win celebration — the same two-cannon burst the /support profile card
 * fires on click, except here it auto-fires the moment it mounts. Boards render
 * it only once the game is won, so mounting IS the trigger.
 */
export function WinBurst() {
  const ref = React.useRef<ConfettiHandle>(null);
  React.useEffect(() => {
    ref.current?.fire();
  }, []);
  return <ConfettiBurst ref={ref} timeScale={TIME_SCALE} />;
}
