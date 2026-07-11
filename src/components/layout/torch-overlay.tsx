"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/**
 * Full-screen darkness for the "torch" (extra dark) theme. A black sheet is
 * masked so a single warm hole opens at the cursor — the diya IS the cursor.
 * The diya carries an animated flame (jyoti) and a breathing aura.
 * pointer-events-none keeps the page clickable.
 *
 * The diya starts wherever the cursor already was when torch was entered (not
 * flashing in from a corner), because a global pointer listener records the
 * last position even outside torch.
 *
 * Aura + flame color follow IST clock: warm yellow-orange from 7 PM to 7 AM,
 * blue flame from 7 AM to 7 PM. IST = UTC+5:30.
 *
 * The diya is a real DOM element (not a CSS cursor) because Chrome does not
 * render SVG data-URI cursors.
 */

const AT_CURSOR = "var(--tx) var(--ty)";
// Transparent center (the reveal hole) fading to opaque black (the dark sheet).
const hole = (at: string) =>
  `radial-gradient(circle 150px at ${at}, transparent 0%, transparent 28%, #000 70%)`;

type Palette = {
  auraStrong: string;
  auraSoft: string;
  flameOuter: string;
  flameInner: string;
  glow: string;
};

const WARM: Palette = {
  auraStrong: "rgba(255, 150, 50, 0.28)",
  auraSoft: "rgba(255, 120, 30, 0.08)",
  flameOuter: "#ffb020",
  flameInner: "#fff2b0",
  glow: "rgba(255, 150, 50, 0.9)",
};

const BLUE: Palette = {
  auraStrong: "rgba(90, 160, 255, 0.3)",
  auraSoft: "rgba(50, 120, 255, 0.09)",
  flameOuter: "#3b82f6",
  flameInner: "#dbeafe",
  glow: "rgba(90, 160, 255, 0.9)",
};

// Warm 7 PM–7 AM IST, blue 7 AM–7 PM. Read once on render; a session rarely
// crosses the boundary, and the diya rebuilds on any re-entry to torch.
// ponytail: no live re-eval at the boundary — refresh covers it if it matters.
function warmNow() {
  const now = new Date();
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
  const hour = istMinutes / 60;
  return hour >= 19 || hour < 7;
}

function DiyaMark() {
  return (
    <>
      <div aria-hidden className="diya-aura" />
      <svg width="40" height="40" viewBox="0 0 40 40" className="diya-mark" aria-hidden>
        <ellipse cx="20" cy="31" rx="12" ry="4" fill="#a8641e" />
        <path d="M8 30 Q20 22 32 30 Q20 35 8 30Z" fill="#c8802a" />
        <g className="diya-flame">
          <path d="M20 6 C24 12 26 16 20 22 C14 16 16 12 20 6Z" fill="var(--flame-outer)" />
          <path
            className="diya-jyoti"
            d="M20 11 C22 15 22 18 20 21 C18 18 18 15 20 11Z"
            fill="var(--flame-inner)"
          />
        </g>
      </svg>
    </>
  );
}

export function TorchOverlay() {
  const { resolvedTheme } = useTheme();
  const ref = React.useRef<HTMLDivElement>(null);
  // Last known pointer position, tracked even outside torch so the diya can
  // start where the cursor already is (React ref: no re-render, no flash).
  const posRef = React.useRef({ x: -1000, y: -1000 });
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const torch = resolvedTheme === "torch";

  // Always-on cursor tracking. Updates CSS vars directly when torch is live
  // (cheap repaint, no React re-render) and always records the last position.
  React.useEffect(() => {
    const move = (e: PointerEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      const el = ref.current;
      if (el) {
        el.style.setProperty("--tx", `${e.clientX}px`);
        el.style.setProperty("--ty", `${e.clientY}px`);
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  if (!mounted || !torch) return null;

  const p = warmNow() ? WARM : BLUE;
  const mask = hole(AT_CURSOR);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        // Seed at the last known cursor position (kills the corner flash).
        ["--tx" as string]: `${posRef.current.x}px`,
        ["--ty" as string]: `${posRef.current.y}px`,
        ["--aura-strong" as string]: p.auraStrong,
        ["--aura-soft" as string]: p.auraSoft,
        ["--flame-outer" as string]: p.flameOuter,
        ["--flame-inner" as string]: p.flameInner,
        ["--diya-glow" as string]: p.glow,
      }}
    >
      {/* Dark sheet: masked so the single hole reveals the page beneath. */}
      <div
        className="absolute inset-0"
        style={{
          background: "#000",
          WebkitMaskImage: mask,
          maskImage: mask,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      />

      {/* Cursor diya: aura + flame, positioned by CSS var. */}
      <div style={{ position: "absolute", left: "var(--tx)", top: "var(--ty)" }}>
        <DiyaMark />
      </div>
    </div>
  );
}
