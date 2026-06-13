import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.alias}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          color: "#0a0a0a",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "8px",
              background: "#0a0a0a",
              color: "#ffffff",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            SD
          </div>
          <div style={{ display: "flex", fontSize: "22px", letterSpacing: "0.12em", color: "#6b6b73" }}>
            {site.alias.toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "84px", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            {site.name}
          </div>
          <div style={{ display: "flex", marginTop: "24px", fontSize: "34px", color: "#3a3a38" }}>
            {site.tagline}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", color: "#6b6b73" }}>
          <span>{site.role}</span>
          <span>{site.domain}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
