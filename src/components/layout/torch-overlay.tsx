"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/**
 * Full-screen darkness that follows the cursor with a warm diya glow punched
 * through it, plus a diya (oil lamp) drawn AS the cursor. Only active in the
 * "torch" (extra dark) theme. pointer-events-none so the page stays clickable.
 *
 * The diya is a real DOM element (not a CSS cursor) because Chrome does not
 * render SVG data-URI cursors.
 */
export function TorchOverlay() {
  const { resolvedTheme } = useTheme();
  const ref = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (resolvedTheme !== "torch") return;
    // Direct CSS-var writes: cheap (repaint of the gradient + diya, no layout).
    const move = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--tx", `${e.clientX}px`);
      el.style.setProperty("--ty", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [resolvedTheme]);

  if (!mounted || resolvedTheme !== "torch") return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        // --tx/--ty default to center until the first pointer move.
        ["--tx" as string]: "50vw",
        ["--ty" as string]: "50vh",
        background: `radial-gradient(circle 190px at var(--tx) var(--ty), rgba(255,150,50,0.22), rgba(255,120,30,0.07) 42%, transparent 66%), radial-gradient(circle 240px at var(--tx) var(--ty), transparent 34%, rgba(0,0,0,0.86) 62%, #000 92%)`,
      }}
    >
      {/* Diya cursor: flame tip sits at the pointer (hotspot 20,6 in a 40px box). */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        style={{
          position: "absolute",
          left: "var(--tx)",
          top: "var(--ty)",
          transform: "translate(-20px, -6px)",
          filter: "drop-shadow(0 0 6px rgba(255,150,50,0.9))",
        }}
      >
        <ellipse cx="20" cy="31" rx="12" ry="4" fill="#a8641e" />
        <path d="M8 30 Q20 22 32 30 Q20 35 8 30Z" fill="#c8802a" />
        <path d="M20 6 C24 12 26 16 20 22 C14 16 16 12 20 6Z" fill="#ffb020" />
        <path d="M20 11 C22 15 22 18 20 21 C18 18 18 15 20 11Z" fill="#fff2b0" />
      </svg>
    </div>
  );
}
