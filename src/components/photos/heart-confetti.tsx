"use client";

import * as React from "react";
import { Heart } from "lucide-react";

/**
 * A short burst of small heart particles that float up and fade, fired when a
 * photo is liked. Particles are Lucide `Heart` icons (never emoji) tinted with
 * design tokens: most in `--brand` (the sanctioned interaction accent), a few in
 * `--muted-foreground` for depth. Positions, drift, size, and timing are
 * randomized per burst. The layer is `pointer-events:none` and unmounts itself
 * after the animation, so it never traps clicks or leaks nodes.
 */

const PARTICLE_COUNT = 36;
const LIFETIME_MS = 1300;

type Particle = {
  id: number;
  left: number; // % offset from center origin
  drift: number; // px horizontal drift
  rise: number; // px upward travel
  size: number; // px icon size
  delay: number; // ms
  duration: number; // ms
  rotate: number; // deg
  brand: boolean; // brand vs muted tint
};

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => {
    const duration = 900 + Math.random() * 400;
    return {
      id,
      left: (Math.random() - 0.5) * 60,
      drift: (Math.random() - 0.5) * 160,
      rise: 90 + Math.random() * 120,
      size: 10 + Math.random() * 14,
      delay: Math.random() * 150,
      duration,
      rotate: (Math.random() - 0.5) * 90,
      // ~3/4 brand, 1/4 muted for a monochrome-with-accent feel.
      brand: Math.random() > 0.25,
    };
  });
}

export function HeartConfetti({ onDone }: { onDone?: () => void }) {
  // Generate once per mount; each fire is a fresh <HeartConfetti key=...>.
  const [particles] = React.useState(makeParticles);

  React.useEffect(() => {
    const t = window.setTimeout(() => onDone?.(), LIFETIME_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10"
      style={{ transform: "translate(-50%, -50%)" }}
    >
      <style>{confettiCss}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          className="heart-confetti-particle"
          style={
            {
              "--drift": `${p.drift}px`,
              "--rise": `-${p.rise}px`,
              "--rot": `${p.rotate}deg`,
              "--dur": `${p.duration}ms`,
              "--delay": `${p.delay}ms`,
              left: `${p.left}px`,
              color: p.brand ? "var(--brand)" : "var(--muted-foreground)",
            } as React.CSSProperties
          }
        >
          <Heart size={p.size} fill="currentColor" strokeWidth={0} />
        </span>
      ))}
    </div>
  );
}

const confettiCss = `
.heart-confetti-particle {
  position: absolute;
  top: 0;
  opacity: 0;
  will-change: transform, opacity;
  animation: heart-confetti-float var(--dur) var(--ease-out-quint, cubic-bezier(0.22,1,0.36,1)) var(--delay) forwards;
}
@keyframes heart-confetti-float {
  0% { transform: translate(0, 0) rotate(0deg) scale(0.4); opacity: 0; }
  15% { opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(var(--drift), var(--rise)) rotate(var(--rot)) scale(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .heart-confetti-particle { animation-duration: 1ms; opacity: 0; }
}
`;
