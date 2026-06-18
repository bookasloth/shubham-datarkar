import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { getPublishedPost } from "@/lib/blog/queries";

// Per-post OG card. Reads the post title from the DB, so it renders at request
// time (uncached data). Monochrome, matching the root /opengraph-image.
export const alt = `${site.name} — Blog`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug, category } = await params;
  const post = await getPublishedPost(slug);
  const title = post?.title ?? "Essays, playbooks & teardowns";
  const label = (post?.category ?? category).toUpperCase();
  // Shrink the headline as it gets longer so it never overflows the card.
  const titleSize = title.length > 90 ? 52 : title.length > 55 ? 64 : 78;

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
          <div style={{ display: "flex", fontSize: "20px", letterSpacing: "0.18em", color: "#6b6b73" }}>
            {label}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "20px",
              fontSize: `${titleSize}px`,
              fontWeight: 800,
              lineHeight: 1.07,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", color: "#6b6b73" }}>
          <span>{site.name}</span>
          <span>{site.domain}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
