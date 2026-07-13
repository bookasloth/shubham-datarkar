import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { avatarColor, compactNumber, timeAgo } from "@/lib/utils";
import { initialsOf } from "@/lib/support/config";
import { tokenizeLinks, prettyLabel } from "@/lib/community/linkify";
import { ensureShortLinks, SHORT_HOST } from "@/lib/community/short-link";
import { getPostByPublicId } from "@/lib/community/queries";

// Downloadable share card for a single community post. Instagram portrait
// (1080x1350, 4:5), dark, mirroring the real feed post-card skeleton
// (avatar-left · name+tick+handle+time row · body with shortened link · colored
// engagement bar). Same next/og (Satori) pipeline as the blog OG images, so no
// new deps. Runs on the default (nodejs) runtime so the DB read + short-link
// RPC work — do NOT switch to edge.

export const size = { width: 1080, height: 1350 };

const BRAND = "#ff4800";
const MUTED = "#8b8b93";

// One inline SVG icon (lucide path) — Satori renders <svg>/<path>.
function Icon({ d, fill = "none", stroke = MUTED, size = 40 }: { d: string; fill?: string; stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
const REPLY = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";
const REBLOG = "M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3";
const BOOKMARK = "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z";

// One engagement pill (icon + count), colored to match the lively feed look.
function Stat({ d, n, color, fill }: { d: string; n?: number; color: string; fill?: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "12px", color, fontSize: "34px" }}>
      <Icon d={d} stroke={color} fill={fill ?? "none"} />
      {n !== undefined ? compactNumber(n) : ""}
    </span>
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const post = await getPostByPublicId(id);
  if (!post) return new Response("Not found", { status: 404 });

  const name = post.displayName || post.username;

  // Same link-shortening the feed does on read, so the card shows the identical
  // shubhamdatarkar.com/s/{slug}. Split body into plain text + shortened links;
  // links render underlined on their own line(s) below the text.
  // ponytail: end-of-body links (the common auto-post/seed shape) reproduce the
  // feed exactly; a mid-text link gets moved to the bottom — fine for a card.
  const tokens = post.body ? tokenizeLinks(post.body) : [];
  const short = await ensureShortLinks(tokens.flatMap((t) => (t.type === "link" ? [t.href] : [])));
  const text = tokens.flatMap((t) => (t.type === "text" ? [t.value] : [])).join("").replace(/\s+/g, " ").trim();
  const links = tokens.flatMap((t) => {
    if (t.type !== "link") return [];
    const slug = short.get(t.href);
    return [slug ? `${SHORT_HOST}/s/${slug}` : prettyLabel(t.href)];
  });
  const bodySize = text.length > 200 ? 40 : text.length > 110 ? 48 : 56;
  const tick = post.badge === "gold" ? "#d4af37" : post.badge === "orange" ? BRAND : null;

  // Plus Jakarta Sans (site display font). Satori needs raw TTF bytes — the
  // next/font woff2 in .next can't be parsed, and Turbopack rejects
  // fetch(import.meta.url), so the two static weights live in /public and are
  // fetched over the same origin (works in dev + prod).
  const origin = new URL(req.url).origin;
  const [jakarta400, jakarta700] = await Promise.all([
    fetch(`${origin}/fonts/PlusJakartaSans-400.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/PlusJakartaSans-700.ttf`).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#e7e7ea",
          padding: "72px",
          fontFamily: "Plus Jakarta Sans",
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
              background: "#ffffff",
              color: "#0a0a0a",
              fontSize: "34px",
              fontWeight: 700,
            }}
          >
            {site.shortName}
          </div>
        </div>

        {/* Post skeleton — avatar left, content column (name row · body · bar) */}
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          <div style={{ display: "flex", gap: "28px", width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "108px",
                height: "108px",
                borderRadius: "999px",
                background: avatarColor(name),
                color: "#ffffff",
                fontSize: "44px",
                fontWeight: 700,
              }}
            >
              {initialsOf(name)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {/* name · tick · @handle · time */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "36px" }}>
                <span style={{ fontWeight: 700 }}>{name}</span>
                {tick && (
                  <svg width={32} height={32} viewBox="0 0 24 24" fill={tick} stroke="none">
                    <path d="M12 2l2.4 1.8 3 .2.9 2.9 2.4 1.8-1 2.9 1 2.9-2.4 1.8-.9 2.9-3 .2L12 22l-2.4-1.8-3-.2-.9-2.9L3.3 15.4l1-2.9-1-2.9 2.4-1.8.9-2.9 3-.2z" />
                    <path d="M9 12l2 2 4-4" fill="none" stroke="#0a0a0a" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span style={{ color: MUTED }}>@{post.username}</span>
                <span style={{ color: MUTED }}>· {timeAgo(post.createdAt)}</span>
              </div>

              {/* body + shortened links */}
              <div style={{ display: "flex", flexDirection: "column", marginTop: "20px" }}>
                {text && (
                  <div style={{ display: "flex", fontSize: `${bodySize}px`, lineHeight: 1.32 }}>{text}</div>
                )}
                {links.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      marginTop: text || i ? "10px" : "0px",
                      fontSize: `${bodySize}px`,
                      lineHeight: 1.32,
                      color: "#e7e7ea",
                      textDecoration: "underline",
                    }}
                  >
                    {l}
                  </div>
                ))}
                {!text && links.length === 0 && (
                  <div style={{ display: "flex", fontSize: "52px" }}>A post by {name}</div>
                )}
              </div>

              {/* engagement bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "56px",
                  marginTop: "40px",
                  paddingTop: "28px",
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <Stat d={HEART} n={post.upCount} color={BRAND} fill={BRAND} />
                <Stat d={REPLY} n={post.replyCount} color={MUTED} />
                <Stat d={REBLOG} n={post.reblogCount} color={BRAND} />
                <Stat d={BOOKMARK} n={post.bookmarkCount} color={BRAND} fill={BRAND} />
                <span style={{ display: "flex" }}>
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Link — bottom-left */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "26px", color: MUTED }}>
          <span style={{ display: "flex" }}>{site.domain}/community</span>
          <span style={{ display: "flex" }}>{site.name}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plus Jakarta Sans", data: jakarta400, weight: 400, style: "normal" },
        { name: "Plus Jakarta Sans", data: jakarta700, weight: 700, style: "normal" },
      ],
      headers: {
        "Content-Disposition": `attachment; filename="post-${id}.png"`,
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    },
  );
}
