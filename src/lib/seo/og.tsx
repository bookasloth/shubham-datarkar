import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/** Shared size/type for every per-segment opengraph-image route. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * One monochrome OG card, "title + key metric" layout, shared by every dynamic
 * segment (services, case studies, products, /me, /book). Matches the root OG
 * card's brand (white ground, ink text, SD mark). `metric`/`metricLabel` are the
 * "key metric" line; omit them for pages without one and the title stands alone.
 */
export function ogImage(input: {
  eyebrow: string;
  title: string;
  metric?: string;
  metricLabel?: string;
}) {
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
            {input.eyebrow.toUpperCase()}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: input.title.length > 42 ? "60px" : "76px",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {input.title}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          {input.metric ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ display: "flex", fontSize: "64px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                {input.metric}
              </span>
              {input.metricLabel ? (
                <span style={{ display: "flex", fontSize: "26px", color: "#6b6b73" }}>{input.metricLabel}</span>
              ) : null}
            </div>
          ) : (
            <span style={{ display: "flex", fontSize: "26px", color: "#6b6b73" }}>
              {input.metricLabel ?? site.name}
            </span>
          )}
          <span style={{ display: "flex", fontSize: "22px", color: "#6b6b73" }}>{site.domain}</span>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
