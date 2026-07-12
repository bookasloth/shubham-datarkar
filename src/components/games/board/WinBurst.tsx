"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Shared win celebration — a short burst of confetti, no extra dependency.
 * Render it briefly (a ~1.5s window) when a game is won; it plays once on
 * mount and cleans itself up. Decorative, so it renders nothing when the
 * viewer prefers reduced motion.
 */
export function WinBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  const colors = ["#16a34a", "#7c3aed", "#d4af37", "var(--foreground)"];
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    x: (i / 28) * 320 - 160 + ((i * 37) % 40) - 20,
    delay: (i % 7) * 0.03,
    color: colors[i % colors.length],
    rot: (i * 53) % 360,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex justify-center overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-1/3 h-2 w-2 rounded-[1px]"
          style={{ background: p.color }}
          initial={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
          animate={{ opacity: 0, y: 360, x: p.x, rotate: p.rot }}
          transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
