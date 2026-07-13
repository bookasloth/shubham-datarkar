import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { avatarUrl, avatarBg, compactNumber } from "@/lib/utils";
import { tokenizeLinks, prettyLabel } from "@/lib/community/linkify";
import { ensureShortLinks, SHORT_HOST } from "@/lib/community/short-link";
import { getPostByPublicId } from "@/lib/community/queries";

// Downloadable share card for a single community post. Instagram portrait
// (1080x1350, 4:5), flat grey, quote-card look: brand logo top-right · square
// rounded avatar with name/@handle stacked beside it · 3-dots · body with
// shortened link · engagement bar (fake, descending) · "Read More @" CTA.
// Same next/og (Satori) pipeline as the blog OG images, so no new deps. Runs on
// the default (nodejs) runtime so the DB read + short-link RPC work — do NOT
// switch to edge.

export const size = { width: 1080, height: 1350 };

// One const so the mark is swappable in one line.
const LOGO_URL = "https://website-assets.shubhamdatarkar.com/logos/favicon.png";

const BRAND = "#ff4800";
const BG = "#e8e8e8"; // flat grey — backdrop + card, no floating panel
const TEXT = "#171717";
const MUTED = "#6b6b70";

// Fake engagement — always 2 digits, descending left→right (likes highest).
// ponytail: static display numbers, not real post counts (share-card polish).
const FAKE = { like: 87, reply: 64, reblog: 42, bookmark: 21 };

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

// One engagement pill (icon + count).
function Stat({ d, n, color, fill }: { d: string; n: number; color: string; fill?: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "12px", color, fontSize: "32px", fontWeight: 700 }}>
      <Icon d={d} stroke={color} fill={fill ?? "none"} />
      {compactNumber(n)}
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
  const bodySize = text.length > 240 ? 44 : text.length > 140 ? 52 : text.length > 70 ? 60 : 68;
  // Links a touch smaller so a short /s/ link stays on one line.
  const linkSize = Math.min(bodySize - 6, 44);

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
          background: BG,
          color: TEXT,
          padding: "72px",
          fontFamily: "Plus Jakarta Sans",
        }}
      >
        {/* Brand logo — top-right corner (where the bird was) */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={LOGO_URL} width={80} height={80} style={{ width: "80px", height: "80px", objectFit: "contain" }} />
        </div>

        {/* Post skeleton — header (avatar · name/handle · 3-dots) · body · bar */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {/* header row */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px", width: "100%" }}>
            {/* next/og (Satori) renders this server-side, not to the DOM — next/image doesn't apply. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              src={avatarUrl(post.username)}
              width={112}
              height={112}
              style={{
                width: "112px",
                height: "112px",
                borderRadius: "24px",
                objectFit: "cover",
                background: avatarBg(post.username),
              }}
            />

            {/* name (+ always-orange tick) over @handle, centered to the avatar */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontWeight: 700, fontSize: "40px", letterSpacing: "-0.02em" }}>{name}</span>
                <svg width={32} height={32} viewBox="0 0 24 24" fill={BRAND} stroke="none">
                  <path d="M12 2l2.4 1.8 3 .2.9 2.9 2.4 1.8-1 2.9 1 2.9-2.4 1.8-.9 2.9-3 .2L12 22l-2.4-1.8-3-.2-.9-2.9L3.3 15.4l1-2.9-1-2.9 2.4-1.8.9-2.9 3-.2z" />
                  <path d="M9 12l2 2 4-4" fill="none" stroke={BG} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ color: MUTED, fontSize: "30px" }}>@{post.username}</span>
            </div>

            {/* 3-dots — far right */}
            <svg width={44} height={44} viewBox="0 0 24 24" fill={MUTED} stroke="none">
              <circle cx="5" cy="12" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="19" cy="12" r="1.7" />
            </svg>
          </div>

          {/* body + shortened links */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: "44px" }}>
            {text && (
              <div style={{ display: "flex", fontSize: `${bodySize}px`, lineHeight: 1.26, letterSpacing: "-0.025em" }}>
                {text}
              </div>
            )}
            {links.map((l, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  marginTop: text || i ? "18px" : "0px",
                  fontSize: `${linkSize}px`,
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  color: TEXT,
                  textDecoration: "underline",
                  textUnderlineOffset: "6px",
                }}
              >
                {l}
              </div>
            ))}
            {!text && links.length === 0 && (
              <div style={{ display: "flex", fontSize: "60px", letterSpacing: "-0.025em" }}>A post by {name}</div>
            )}
          </div>

          {/* engagement bar — fake 2-digit counts, descending left→right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "64px",
              marginTop: "48px",
              paddingTop: "32px",
              borderTop: "1px solid rgba(0,0,0,0.12)",
            }}
          >
            <Stat d={HEART} n={FAKE.like} color={BRAND} fill={BRAND} />
            <Stat d={REPLY} n={FAKE.reply} color={MUTED} />
            <Stat d={REBLOG} n={FAKE.reblog} color={BRAND} />
            <Stat d={BOOKMARK} n={FAKE.bookmark} color={MUTED} />
          </div>
        </div>

        {/* CTA — bold "Read More @" + normal domain */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "12px", fontSize: "34px" }}>
          <span style={{ display: "flex", fontWeight: 700, color: TEXT }}>Read More @</span>
          <span style={{ display: "flex", fontWeight: 400, color: MUTED }}>{site.domain}</span>
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
