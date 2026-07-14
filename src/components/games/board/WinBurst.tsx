"use client";

import * as React from "react";
import { ConfettiBurst, type ConfettiHandle } from "@/components/support/confetti-burst";

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
  return <ConfettiBurst ref={ref} />;
}
