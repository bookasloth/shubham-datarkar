"use client";

import * as React from "react";

/** Dot palette: 3 oranges, 3 reds, 3 yellows, 1 blue, 1 green, 1 magenta. */
const COLORS = [
  "#fb923c", "#f97316", "#fdba74",
  "#ef4444", "#dc2626", "#f87171",
  "#facc15", "#fde047", "#fef08a",
  "#3b82f6", "#22c55e", "#d946ef",
];

/**
 * Grey cover with soft colored dots drifting on random paths — each fades in,
 * crosses the area, then fades out at a random edge while others drift in.
 * Web Animations API: every loop picks a fresh target, so motion never repeats.
 * Honors prefers-reduced-motion (static scatter, no animation).
 */
export function CoverDrift({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-dot]"));
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      const r = root.getBoundingClientRect();
      dots.forEach((d) => {
        d.style.transform = `translate(${rand(0, r.width)}px, ${rand(0, r.height)}px)`;
        d.style.opacity = "0.6";
      });
      return;
    }

    const anims: Animation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    function step(d: HTMLElement) {
      d.getAnimations().forEach((x) => x.cancel()); // release the finished prior loop
      const r = root!.getBoundingClientRect();
      const pad = 36; // overshoot edges so dots visibly leave the area
      const fromT = d.style.transform || `translate(${rand(0, r.width)}px, ${rand(0, r.height)}px)`;
      const toX = rand(-pad, r.width + pad);
      const toY = rand(-pad, r.height + pad);
      const peak = rand(0.4, 0.8);

      const a = d.animate(
        [
          { transform: fromT, opacity: 0 },
          { opacity: peak, offset: 0.3 },
          { opacity: peak, offset: 0.7 },
          { transform: `translate(${toX}px, ${toY}px)`, opacity: 0 },
        ],
        { duration: rand(5500, 11000), easing: "ease-in-out", fill: "forwards" },
      );
      d.style.transform = `translate(${toX}px, ${toY}px)`;
      d.style.opacity = "0";
      a.onfinish = () => step(d);
      anims.push(a);
    }

    dots.forEach((d, i) => timers.push(setTimeout(() => step(d), i * 450)));

    return () => {
      anims.forEach((a) => a.cancel());
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div ref={ref} className={className} aria-hidden>
      {COLORS.map((c, i) => (
        <div
          key={i}
          data-dot
          className="absolute left-0 top-0 size-14 rounded-full opacity-0 will-change-transform"
          style={{ background: c, filter: "blur(15px)" }}
        />
      ))}
    </div>
  );
}
