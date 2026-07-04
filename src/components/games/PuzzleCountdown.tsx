"use client";

import { useEffect, useState } from "react";
import { msUntilNextPuzzle } from "@/lib/daily";
import { formatCountdown } from "@/lib/games/format-countdown";

/** Live "next puzzle in HH:MM:SS" timer. Client-only; ticks each second. */
export default function PuzzleCountdown({ className }: { className?: string }) {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMs(msUntilNextPuzzle());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Render a stable placeholder until mounted to avoid hydration mismatch.
  return (
    <span className={className}>
      Next puzzle in {ms === null ? "--:--:--" : formatCountdown(ms)}
    </span>
  );
}
