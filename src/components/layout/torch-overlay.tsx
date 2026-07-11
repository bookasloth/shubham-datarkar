"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

/**
 * Full-screen darkness for the "torch" (extra dark) theme. A black sheet is
 * masked so a warm hole opens at the cursor and at every diya the user has
 * placed by clicking — masks composite with `intersect`, so N holes = N reveals
 * (stacked black gradients cannot do this). Each diya draws an animated flame
 * (jyoti) and a breathing aura on top. pointer-events-none keeps the page
 * clickable. When the 7th diya lands, we fade out and flip to light mode.
 *
 * The diya is a real DOM element (not a CSS cursor) because Chrome does not
 * render SVG data-URI cursors.
 */

type Diya = { id: number; x: number; y: number };

const AT_CURSOR = "var(--tx) var(--ty)";
// Transparent center (the reveal hole) fading to opaque black (the dark sheet).
const hole = (at: string) =>
  `radial-gradient(circle 150px at ${at}, transparent 0%, transparent 28%, #000 70%)`;

const DIYA_LIMIT = 7;
const FADE_MS = 700;

function DiyaMark() {
  return (
    <>
      <div aria-hidden className="diya-aura" />
      <svg width="40" height="40" viewBox="0 0 40 40" className="diya-mark" aria-hidden>
        <ellipse cx="20" cy="31" rx="12" ry="4" fill="#a8641e" />
        <path d="M8 30 Q20 22 32 30 Q20 35 8 30Z" fill="#c8802a" />
        <g className="diya-flame">
          <path d="M20 6 C24 12 26 16 20 22 C14 16 16 12 20 6Z" fill="#ffb020" />
          <path d="M20 11 C22 15 22 18 20 21 C18 18 18 15 20 11Z" fill="#fff2b0" />
        </g>
      </svg>
    </>
  );
}

export function TorchOverlay() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const ref = React.useRef<HTMLDivElement>(null);
  const idRef = React.useRef(0);
  const [mounted, setMounted] = React.useState(false);
  const [placed, setPlaced] = React.useState<Diya[]>([]);
  const [fading, setFading] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const torch = resolvedTheme === "torch";

  // Reset per page — "reach 7 on one page" is scoped to the current route.
  React.useEffect(() => {
    setPlaced([]);
    setFading(false);
  }, [pathname]);

  // Cursor tracking (CSS vars: cheap repaint, no React re-render). Seeded
  // off-screen so the diya never flashes in the center before the first move.
  React.useEffect(() => {
    if (!torch) return;
    const move = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--tx", `${e.clientX}px`);
      el.style.setProperty("--ty", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [torch]);

  // Click anywhere -> leave a lit diya there (page stays clickable: no preventDefault).
  React.useEffect(() => {
    if (!torch) return;
    const click = (e: MouseEvent) => {
      setPlaced((prev) => [...prev, { id: idRef.current++, x: e.clientX, y: e.clientY }]);
    };
    window.addEventListener("click", click);
    return () => window.removeEventListener("click", click);
  }, [torch]);

  // 7 diyas -> fade the darkness, then flip to light mode.
  React.useEffect(() => {
    if (placed.length < DIYA_LIMIT) return;
    setFading(true);
    const t = window.setTimeout(() => setTheme("light"), FADE_MS);
    return () => window.clearTimeout(t);
  }, [placed.length, setTheme]);

  if (!mounted || !torch) return null;

  const mask = [hole(AT_CURSOR), ...placed.map((d) => hole(`${d.x}px ${d.y}px`))].join(",");

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        // Off-screen until the first pointer move (kills the center flash).
        ["--tx" as string]: "-1000px",
        ["--ty" as string]: "-1000px",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      {/* Dark sheet: masked so each hole reveals the page beneath. */}
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

      {/* Placed diyas: aura + flame, positioned by px. */}
      {placed.map((d) => (
        <div key={d.id} style={{ position: "absolute", left: d.x, top: d.y }}>
          <DiyaMark />
        </div>
      ))}

      {/* Cursor diya: aura + flame, positioned by CSS var. */}
      <div style={{ position: "absolute", left: "var(--tx)", top: "var(--ty)" }}>
        <DiyaMark />
      </div>
    </div>
  );
}
