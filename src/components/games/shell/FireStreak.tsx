"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";

/**
 * Inline "N-day streak" badge that lives next to the game title.
 * Renders `count` flames in brand-orange; the last flame does a one-shot
 * burst + glow when `justWon` is true, using framer-motion the same way
 * WinBurst.tsx does elsewhere. Renders nothing when count = 0.
 */
export function FireStreak({ count, justWon }: { count: number; justWon?: boolean }) {
  const reduce = useReducedMotion();
  if (count <= 0) return null;

  // Cap visible flames so a huge streak doesn't push the title off screen.
  // The numeric count stays exact.
  const shown = Math.min(count, 4);

  return (
    <span
      className="inline-flex items-center gap-1 align-middle text-brand"
      aria-label={`${count}-day streak`}
      title={`${count}-day streak`}
    >
      {Array.from({ length: shown }).map((_, i) => {
        const isLast = i === shown - 1;
        const shouldBurst = isLast && justWon && !reduce;
        return shouldBurst ? (
          <motion.span
            key={i}
            initial={{ scale: 0.7, filter: "drop-shadow(0 0 0 var(--brand))" }}
            animate={{
              scale: [0.7, 1.6, 1],
              filter: [
                "drop-shadow(0 0 0 var(--brand))",
                "drop-shadow(0 0 12px var(--brand))",
                "drop-shadow(0 0 4px var(--brand))",
              ],
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="inline-flex"
          >
            <Flame className="size-4 fill-current" />
          </motion.span>
        ) : (
          <Flame key={i} className="size-4 fill-current" />
        );
      })}
      <span className="ml-0.5 text-sm font-semibold">{count}</span>
    </span>
  );
}
