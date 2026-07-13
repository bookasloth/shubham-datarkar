import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { avatarColor, compactNumber } from "@/lib/utils";
import { initialsOf } from "@/lib/support/config";
import { getPostByPublicId } from "@/lib/community/queries";

// Downloadable share card for a single community post. Instagram portrait
// (1080x1350, 4:5). Same next/og (Satori) pipeline as the blog OG images, so no
// new deps. Monochrome to match the brand. Runs on the default (nodejs) runtime
// so the DB read works — do NOT switch to edge.

export const size = { width: 1080, height: 1350 };

// One inline SVG icon (lucide path), stroked, muted — Satori renders <svg>/<path>.
function Icon({ d, size = 34 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6b6b73"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
const REPLY = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";
const REBLOG = "M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const post = await getPostByPublicId(id);
  if (!post) return new Response("Not found", { status: 404 });

  const name = post.displayName || post.username;
  // Body carries the card. Collapse whitespace, cap length, ellipsise — then
  // shrink the type as it grows so it never overflows (mirrors the OG card).
  const raw = (post.body ?? "").replace(/\s+/g, " ").trim();
  const body = raw.length > 280 ? `${raw.slice(0, 279).trimEnd()}…` : raw;
  const bodySize = body.length > 200 ? 44 : body.length > 120 ? 56 : body.length > 60 ? 68 : 80;
  const tick = post.badge === "gold" ? "#d4af37" : post.badge === "orange" ? "#e8590c" : null;

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
          padding: "80px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo — top-right corner */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "76px",
              height: "76px",
              borderRadius: "14px",
              background: "#0a0a0a",
              color: "#ffffff",
              fontSize: "34px",
              fontWeight: 800,
            }}
          >
            {site.shortName}
          </div>
        </div>

        {/* Center — avatar, name, handle, content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "120px",
              height: "120px",
              borderRadius: "999px",
              background: avatarColor(name),
              color: "#ffffff",
              fontSize: "48px",
              fontWeight: 700,
            }}
          >
            {initialsOf(name)}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "28px" }}>
            <span style={{ fontSize: "38px", fontWeight: 700 }}>{name}</span>
            {tick && (
              <svg width={30} height={30} viewBox="0 0 24 24" fill={tick} stroke="none">
                <path d="M12 2l2.4 1.8 3 .2.9 2.9 2.4 1.8-1 2.9 1 2.9-2.4 1.8-.9 2.9-3 .2L12 22l-2.4-1.8-3-.2-.9-2.9L3.3 15.4l1-2.9-1-2.9 2.4-1.8.9-2.9 3-.2z" />
                <path d="M9 12l2 2 4-4" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div style={{ display: "flex", fontSize: "28px", color: "#6b6b73", marginTop: "4px" }}>
            @{post.username}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "48px",
              fontSize: `${bodySize}px`,
              fontWeight: 600,
              lineHeight: 1.28,
              letterSpacing: "-0.01em",
            }}
          >
            {body || `A post by ${name}`}
          </div>
        </div>

        {/* Bottom — engagement icons (center) + link (bottom-left) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "56px", color: "#6b6b73", fontSize: "30px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Icon d={HEART} />
              {compactNumber(post.upCount)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Icon d={REPLY} />
              {compactNumber(post.replyCount)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Icon d={REBLOG} />
              {compactNumber(post.reblogCount)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              borderTop: "1px solid #e6e6e9",
              paddingTop: "24px",
              fontSize: "26px",
              color: "#6b6b73",
            }}
          >
            {site.domain}/community
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Content-Disposition": `attachment; filename="post-${id}.png"`,
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    },
  );
}
