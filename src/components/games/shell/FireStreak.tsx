"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";

/**
 * Inline "N-day streak" badge that lives next to the game title.
 * Renders one brand-orange flame plus the exact count; the flame does a
 * one-shot burst + glow when `justWon` is true, using framer-motion the same
 * way WinBurst.tsx does elsewhere. Renders nothing when count = 0.
 */
export function FireStreak({ count, justWon }: { count: number; justWon?: boolean }) {
  const reduce = useReducedMotion();
  if (count <= 0) return null;

  const shouldBurst = justWon && !reduce;

  return (
    <span
      className="inline-flex items-center gap-1 align-middle text-brand"
      aria-label={`${count}-day streak`}
      title={`${count}-day streak`}
    >
      {shouldBurst ? (
        <motion.span
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
        <Flame className="size-4 fill-current" />
      )}
      <span className="ml-0.5 text-sm font-semibold">{count}</span>
    </span>
  );
}
