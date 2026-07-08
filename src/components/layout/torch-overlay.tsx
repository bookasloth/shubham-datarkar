"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/**
 * Renders a full-screen darkness that follows the cursor with a warm diya
 * glow punched through it. Only active in the "torch" (extra dark) theme.
 * pointer-events-none so the page stays clickable underneath.
 */
export function TorchOverlay() {
  const { resolvedTheme } = useTheme();
  const ref = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (resolvedTheme !== "torch") return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--tx", `${e.clientX}px`);
        el.style.setProperty("--ty", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
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
    />
  );
}
