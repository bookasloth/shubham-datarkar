"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative art for the blog featured-post panel. Blog posts never carry a
 * thumbnail, so instead of one static pattern we cycle through seven distinct
 * monochrome, theme-aware designs (pure CSS/SVG — no images). Crossfades every
 * 30s; holds on the first design when reduced motion is preferred.
 */

const COUNT = 7;
const ROTATE_MS = 30_000;
/** Monochrome ink derived from the theme foreground. */
const INK = (pct: number) => `color-mix(in srgb, var(--foreground) ${pct}%, transparent)`;

export function BlogHeroArt({ className }: { className?: string }) {
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((p) => (p + 1) % COUNT), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("relative overflow-hidden bg-muted/40 text-foreground", className)} aria-hidden>
      {Array.from({ length: COUNT }).map((_, idx) => (
        <div
          key={idx}
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{ opacity: idx === i ? 1 : 0 }}
        >
          <Design index={idx} />
        </div>
      ))}
    </div>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className="size-full"
      stroke="currentColor"
      fill="none"
    >
      {children}
    </svg>
  );
}

function Design({ index }: { index: number }) {
  switch (index) {
    // 1 — Dot grid
    case 0:
      return (
        <div
          className="size-full"
          style={{
            backgroundImage: `radial-gradient(${INK(22)} 1.5px, transparent 1.5px)`,
            backgroundSize: "22px 22px",
          }}
        />
      );

    // 2 — Diagonal hatching
    case 1:
      return (
        <div
          className="size-full"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${INK(14)} 0 1px, transparent 1px 14px)`,
          }}
        />
      );

    // 3 — Fine grid with a radial spotlight
    case 2:
      return (
        <div
          className="size-full"
          style={{
            backgroundImage: `radial-gradient(ellipse at 30% 30%, ${INK(10)} 0%, transparent 60%), linear-gradient(to right, ${INK(8)} 1px, transparent 1px), linear-gradient(to bottom, ${INK(8)} 1px, transparent 1px)`,
            backgroundSize: "100% 100%, 30px 30px, 30px 30px",
          }}
        />
      );

    // 4 — Concentric rings
    case 3:
      return (
        <Svg>
          {Array.from({ length: 9 }).map((_, r) => (
            <circle key={r} cx="200" cy="200" r={24 + r * 26} strokeOpacity={0.12} strokeWidth={1.5} />
          ))}
        </Svg>
      );

    // 5 — Contour waves
    case 4:
      return (
        <Svg>
          {Array.from({ length: 11 }).map((_, r) => {
            const y = 20 + r * 36;
            return (
              <path
                key={r}
                d={`M0 ${y} C 100 ${y - 24}, 300 ${y + 24}, 400 ${y}`}
                strokeOpacity={0.12}
                strokeWidth={1.5}
              />
            );
          })}
        </Svg>
      );

    // 6 — Plus-mark lattice
    case 5:
      return (
        <Svg>
          {Array.from({ length: 8 }).flatMap((_, ry) =>
            Array.from({ length: 8 }).map((__, rx) => {
              const x = 25 + rx * 50;
              const y = 25 + ry * 50;
              return (
                <path
                  key={`${rx}-${ry}`}
                  d={`M${x - 6} ${y} H${x + 6} M${x} ${y - 6} V${y + 6}`}
                  strokeOpacity={0.16}
                  strokeWidth={1.5}
                />
              );
            }),
          )}
        </Svg>
      );

    // 7 — Abstract bars (growth/equalizer)
    case 6: {
      const heights = [120, 190, 90, 240, 150, 300, 110, 210, 170, 260];
      return (
        <Svg>
          {heights.map((h, b) => (
            <rect
              key={b}
              x={16 + b * 38}
              y={400 - h}
              width={20}
              height={h}
              fill="currentColor"
              fillOpacity={0.08}
              stroke="none"
            />
          ))}
        </Svg>
      );
    }

    default:
      return null;
  }
}
