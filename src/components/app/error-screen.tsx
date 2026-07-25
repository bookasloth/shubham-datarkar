"use client";

import { useEffect, useState } from "react";

/**
 * The site's error screen for every non-404 failure (route error boundaries and
 * the root global-error). Deliberately self-contained with INLINE styles: it must
 * render even when the failure took out shared components or the root layout
 * (global-error.tsx has no access to globals.css / Tailwind). No imports beyond
 * React so nothing it depends on can be the thing that's broken.
 *
 * Design from pages/403.html: a random background on mount, a shrugging face, and
 * a blunt line. Plus a way out — retry (when the boundary gives a reset) and home.
 */

// Orange-weighted, like the source; a few off-palette colours for variety.
const COLORS = [
  "#FE5100", "#FE5100", "#FE5100", "#FE5100", "#FE5100",
  "#0F1111", "#1A1D24", "#F2F2F2", "#FF4D93", "#4AB765", "#FFCC1C", "#269CEF",
];
const LIGHT = new Set(["#F2F2F2", "#FFCC1C"]);

export function ErrorScreen({ reset }: { reset?: () => void }) {
  // Start on a fixed dark colour so server and first client render match, then
  // pick a random one after mount — Math.random in render would hydration-mismatch.
  const [bg, setBg] = useState("#0F1111");
  useEffect(() => {
    // Randomize only after mount — Math.random() during render would mismatch
    // the server HTML on hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBg(COLORS[Math.floor(Math.random() * COLORS.length)]);
  }, []);

  const fg = LIGHT.has(bg) ? "#000000" : "#FFFFFF";

  const screen: React.CSSProperties = {
    minHeight: "100vh",
    margin: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 5vw",
    background: bg,
    color: fg,
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
    transition: "background 0.4s ease, color 0.4s ease",
  };
  const link: React.CSSProperties = {
    color: fg,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    cursor: "pointer",
    fontWeight: 500,
  };

  return (
    <div style={screen}>
      <div style={{ maxWidth: 720, lineHeight: 1.4 }}>
        <div style={{ fontSize: "clamp(80px, 15vw, 130px)", marginBottom: 10 }}>( ._.)</div>
        <div style={{ fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 400, margin: "10px 0 25px" }}>
          I don&rsquo;t know WHAT the f*ck is going on.
        </div>
        <div style={{ fontSize: 16, marginBottom: 10 }}>Good luck searching for it online though.</div>
        <div style={{ fontSize: 15, opacity: 0.9, marginBottom: 10 }}>
          Here&rsquo;s a useless email that I will not reply on. Try another platform. Just kidding.
        </div>
        <div style={{ fontSize: 15, opacity: 0.9, marginBottom: 30 }}>
          Contact support at <strong>namaste@shubhamdatarkar.com</strong>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {reset && (
            <span role="button" tabIndex={0} onClick={reset} onKeyDown={(e) => e.key === "Enter" && reset()} style={link}>
              Try again
            </span>
          )}
          {/* A hard <a> nav (not next/link) on purpose: a full reload escapes
              whatever broke, and needs no router context — this may render from
              global-error, outside the app tree. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={link}>Take me home</a>
        </div>
      </div>
    </div>
  );
}
