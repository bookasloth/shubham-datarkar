import { ImageResponse } from "next/og";

// Downloadable share card for a tool RESULT — Instagram/LinkedIn portrait
// (1080x1350), dark + orange to match the OG cards. Params: tool (display name),
// score (0-100), label (what the score measures). Same Satori pipeline as the
// blog/OG images, so no new deps. Default (nodejs) runtime.
export const runtime = "nodejs";

const ORANGE = "#FF4D00";
const CHARCOAL = "#0E0E10";
const MUTED = "#9A9AA3";

function clampScore(raw: string | null): number {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}
function clean(raw: string | null, fallback: string, max: number): string {
  const s = (raw ?? "").replace(/[<>]/g, "").trim();
  return (s || fallback).slice(0, max);
}

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const score = clampScore(searchParams.get("score"));
  const label = clean(searchParams.get("label"), "Score", 28).toUpperCase();
  const tool = clean(searchParams.get("tool"), "Free tool", 40);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CHARCOAL,
          padding: "84px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* top: brand + eyebrow */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 13, background: ORANGE, color: "#fff", fontSize: 26, fontWeight: 800 }}>
              SD
            </div>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 3, color: ORANGE, fontWeight: 700 }}>
              {label}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>{tool}</div>
        </div>

        {/* middle: big score */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ display: "flex", fontSize: 340, fontWeight: 800, letterSpacing: -8, color: "#fff", lineHeight: 0.9 }}>{score}</span>
            <span style={{ display: "flex", fontSize: 96, fontWeight: 800, color: MUTED, marginLeft: 12 }}>/100</span>
          </div>
          <div style={{ display: "flex", width: "100%", height: 20, borderRadius: 20, background: "#26262b" }}>
            <div style={{ display: "flex", width: `${score}%`, height: 20, borderRadius: 20, background: ORANGE }} />
          </div>
        </div>

        {/* bottom: CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#fff" }}>Check yours — free</div>
          <div style={{ display: "flex", fontSize: 30, color: ORANGE, fontWeight: 700 }}>shubhamdatarkar.com/tools</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
