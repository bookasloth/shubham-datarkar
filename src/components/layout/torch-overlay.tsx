"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { warmNow } from "@/lib/torch/warm-now";

/**
 * Full-screen darkness for the "torch" (extra dark) theme. A black sheet is
 * masked so a single warm hole opens at the cursor — the diya IS the cursor.
 * The diya carries an animated flame (jyoti) and a breathing aura.
 *
 * THE GAME: flick the cursor very fast and the jyoti blows out. The reveal
 * collapses to a faint ember and the flame is gone — you're near-blind. To
 * relight, grope the diya over the theme-toggle beacon (the blue/orange Flame
 * icon, `data-torch-relight`), which is the only lit thing left in the dark.
 *
 * A faint warm trail lags behind the diya, like a flame leaving warmth.
 *
 * Aura + flame + trail color follow IST clock (warm night / cool day) via
 * warmNow(). Read once on render; a session rarely crosses the boundary.
 *
 * Touch devices have no cursor and no hover, so the whole mechanic is dead
 * there — we fall the theme back to plain "dark".
 *
 * The diya is a real DOM element (not a CSS cursor) because Chrome does not
 * render SVG data-URI cursors.
 */

const AT_CURSOR = "var(--tx) var(--ty)";
// Lit: wide warm reveal. Ember: small dim reveal so you can still grope toward
// the beacon (fully black would make relighting impossible by design).
const litHole = (at: string) =>
  `radial-gradient(circle 150px at ${at}, transparent 0%, transparent 28%, #000 70%)`;
const emberHole = (at: string) =>
  `radial-gradient(circle 80px at ${at}, transparent 0%, transparent 22%, #000 82%)`;

// A hard flick snuffs the flame. Needs BOTH: high speed (px/ms) AND real
// travel in the sample. The distance gate is the important one — high-refresh
// pointers fire sub-ms apart, so a slow drag can spike dist/dt without ever
// covering ground. Requiring real distance kills those false positives.
// ponytail: calibration knobs — real pointers/DPI vary, tune if too touchy.
const EXTINGUISH_SPEED = 6;
const EXTINGUISH_MIN_DIST = 60;

type Palette = {
  auraStrong: string;
  auraSoft: string;
  flameOuter: string;
  flameInner: string;
  glow: string;
  trail: string;
};

const WARM: Palette = {
  auraStrong: "rgba(255, 150, 50, 0.28)",
  auraSoft: "rgba(255, 120, 30, 0.08)",
  flameOuter: "#ffb020",
  flameInner: "#fff2b0",
  glow: "rgba(255, 150, 50, 0.9)",
  trail: "rgba(255, 150, 50, 0.10)",
};

const BLUE: Palette = {
  auraStrong: "rgba(90, 160, 255, 0.3)",
  auraSoft: "rgba(50, 120, 255, 0.09)",
  flameOuter: "#3b82f6",
  flameInner: "#dbeafe",
  glow: "rgba(90, 160, 255, 0.9)",
  trail: "rgba(90, 160, 255, 0.10)",
};

function DiyaMark({ lit }: { lit: boolean }) {
  return (
    <>
      {lit && <div aria-hidden className="diya-aura" />}
      <svg width="40" height="40" viewBox="0 0 40 40" className="diya-mark" aria-hidden>
        <ellipse cx="20" cy="31" rx="12" ry="4" fill="#a8641e" />
        <path d="M8 30 Q20 22 32 30 Q20 35 8 30Z" fill="#c8802a" />
        {lit ? (
          <g className="diya-flame">
            <path d="M20 6 C24 12 26 16 20 22 C14 16 16 12 20 6Z" fill="var(--flame-outer)" />
            <path
              className="diya-jyoti"
              d="M20 11 C22 15 22 18 20 21 C18 18 18 15 20 11Z"
              fill="var(--flame-inner)"
            />
          </g>
        ) : (
          // Snuffed: a dim ember at the wick + a thin wisp of smoke.
          <>
            <circle className="diya-ember" cx="20" cy="24" r="2.4" fill="#ff7a1a" />
            <path
              className="diya-smoke"
              d="M20 22 C22 18 18 16 20 12"
              fill="none"
              stroke="rgba(200,200,200,0.35)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </>
  );
}

export function TorchOverlay() {
  const { resolvedTheme, setTheme } = useTheme();
  const ref = React.useRef<HTMLDivElement>(null);
  // Last known pointer position + timestamp, tracked even outside torch so the
  // diya can start where the cursor already is and so we can measure velocity.
  const posRef = React.useRef({ x: -1000, y: -1000, t: 0 });
  const [mounted, setMounted] = React.useState(false);
  // Flame state. litRef mirrors it so the (once-bound) pointer handler reads
  // the current value without re-subscribing.
  const [lit, setLit] = React.useState(true);
  const litRef = React.useRef(true);
  litRef.current = lit;
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const torch = resolvedTheme === "torch";

  // Touch devices: no cursor, no hover — the diya can never move or relight, so
  // torch would be a permanently black screen. Fall back to plain dark.
  React.useEffect(() => {
    if (!mounted || !torch) return;
    if (window.matchMedia("(hover: none)").matches) setTheme("dark");
  }, [mounted, torch, setTheme]);

  // Always-on pointer tracking. Updates CSS vars directly when torch is live
  // (cheap repaint, no React re-render), records last position, and measures
  // velocity to snuff / relight the flame.
  React.useEffect(() => {
    const move = (e: PointerEvent) => {
      const prev = posRef.current;
      const dt = prev.t ? e.timeStamp - prev.t : 0;
      const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      posRef.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };

      const el = ref.current;
      if (el) {
        el.style.setProperty("--tx", `${e.clientX}px`);
        el.style.setProperty("--ty", `${e.clientY}px`);
      }

      // A hard flick blows the jyoti out: fast AND covering real ground.
      if (litRef.current && dt > 0 && dist > EXTINGUISH_MIN_DIST && dist / dt > EXTINGUISH_SPEED) {
        setLit(false);
        return;
      }
      // Snuffed: relight by dragging the diya over the beacon (theme toggle).
      // elementFromPoint ignores the pointer-events-none overlay and returns
      // whatever is beneath — relight only when that's a [data-torch-relight].
      if (!litRef.current) {
        const under = document.elementFromPoint(e.clientX, e.clientY);
        if (under?.closest("[data-torch-relight]")) setLit(true);
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  if (!mounted || !torch) return null;

  const p = warmNow() ? WARM : BLUE;
  const mask = (lit ? litHole : emberHole)(AT_CURSOR);

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
        ["--trail-color" as string]: p.trail,
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

      {/* Subtle warm trail: lags behind the diya (CSS transition on left/top),
          a faint smear of leftover warmth. Gone when the flame is out. */}
      {lit && <div aria-hidden className="diya-trail" style={{ left: "var(--tx)", top: "var(--ty)" }} />}

      {/* Cursor diya: aura + flame (or ember), positioned by CSS var. */}
      <div style={{ position: "absolute", left: "var(--tx)", top: "var(--ty)" }}>
        <DiyaMark lit={lit} />
      </div>
    </div>
  );
}
