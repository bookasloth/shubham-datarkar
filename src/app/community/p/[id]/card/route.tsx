import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { avatarUrl, avatarBg, compactNumber } from "@/lib/utils";
import { tokenizeLinks, prettyLabel } from "@/lib/community/linkify";
import { ensureShortLinks, SHORT_HOST } from "@/lib/community/short-link";
import { getPostByPublicId } from "@/lib/community/queries";

// Downloadable share card for a single community post. Instagram portrait
// (1080x1350, 4:5), X/Twitter-style dark quote card: circular real avatar with
// name/@handle beside it · "Sd" mark top-right · big body text · timestamp.
// Same next/og (Satori) pipeline as the blog OG images, so no new deps. Runs on
// the default (nodejs) runtime so the DB read + short-link RPC work — do NOT
// switch to edge.

export const size = { width: 1080, height: 1350 };

const BRAND = "#ff4800";
const GOLD = "#e0a516";
const BG = "#0d0d10"; // near-black backdrop
const TEXT = "#f5f5f5";
const MUTED = "#7a7a80";

// Body scales down as the post gets longer so short posts read huge and long
// ones still fit the 1350px canvas. ponytail: fixed buckets, not per-char fit.
function bodySize(len: number): number {
  if (len <= 90) return 78;
  if (len <= 180) return 58;
  if (len <= 300) return 46;
  return 38;
}

// Fake engagement — 2-digit, descending left→right (likes highest).
// ponytail: static display numbers, not real post counts (share-card polish).
const FAKE = { like: 87, reply: 64, reblog: 42, bookmark: 21 };

const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
const REPLY = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";
const REBLOG = "M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3";
const BOOKMARK = "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z";

// One engagement pill (icon + count) — grey outline icon, light count.
function Stat({ d, n }: { d: string; n: number }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "12px", color: TEXT, fontSize: "32px", fontWeight: 700 }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
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
  // `!== "link"` (not `=== "text"`) so a mention keeps its literal "@handle" in the
  // card body — every non-link token carries `value`.
  const text = tokens.flatMap((t) => (t.type !== "link" ? [t.value] : [])).join("").replace(/\s+/g, " ").trim();
  const links = tokens.flatMap((t) => {
    if (t.type !== "link") return [];
    const slug = short.get(t.href);
    return [slug ? `${SHORT_HOST}/s/${slug}` : prettyLabel(t.href)];
  });
  const body = bodySize(text.length);
  // Links a touch smaller so a short /s/ link stays on one line.
  const linkSize = Math.min(body - 6, 44);

  // "2:21 PM · July 21, 2026" in IST — the feed's own timezone.
  const d = new Date(post.createdAt);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(d);
  const date = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
  const stamp = `${time} · ${date}`;
  const avatar = post.avatarUrl || avatarUrl(post.username);

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
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: TEXT,
          padding: "96px 88px",
          fontFamily: "Plus Jakarta Sans",
        }}
      >
        {/* "Sd" mark — bordered square, pinned top-right corner */}
        <div
          style={{
            position: "absolute",
            top: "72px",
            right: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "76px",
            height: "76px",
            borderRadius: "14px",
            border: `2px solid ${TEXT}`,
            fontWeight: 700,
            fontSize: "40px",
            letterSpacing: "-0.03em",
          }}
        >
          Sd
        </div>

        {/* centered content group — header · body · timestamp · bar */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {/* header row — circular avatar · name/handle */}
        <div style={{ display: "flex", alignItems: "center", gap: "28px", width: "100%" }}>
          {/* next/og (Satori) renders this server-side, not to the DOM — next/image doesn't apply. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={avatar}
            width={112}
            height={112}
            style={{
              width: "112px",
              height: "112px",
              borderRadius: "56px",
              objectFit: "cover",
              background: avatarBg(post.username),
            }}
          />

          {/* name (+ always-orange tick) over @handle */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: "44px", letterSpacing: "-0.02em" }}>{name}</span>
              <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "3px" }}>
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span style={{ color: MUTED, fontSize: "32px" }}>@{post.username}</span>
          </div>
        </div>

        {/* body + shortened links */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "72px" }}>
          {text && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", fontWeight: 700, fontSize: `${body}px`, lineHeight: 1.18, letterSpacing: "-0.03em" }}>
              {text.split(/\s+/).map((w, i) => {
                const tag = /^#[^\s#]+$/.test(w);
                return (
                  <span
                    key={i}
                    style={{
                      display: "flex",
                      color: tag ? BRAND : TEXT,
                      // ~one space to the right; a hashtag gets double space on both sides.
                      marginRight: tag ? "0.5em" : "0.26em",
                      marginLeft: tag ? "0.26em" : "0",
                    }}
                  >
                    {w}
                  </span>
                );
              })}
            </div>
          )}
          {links.map((l, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                marginTop: text || i ? "20px" : "0px",
                fontSize: `${linkSize}px`,
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                color: BRAND,
              }}
            >
              {l}
            </div>
          ))}
          {!text && links.length === 0 && (
            <div style={{ display: "flex", fontWeight: 700, fontSize: "72px", letterSpacing: "-0.03em" }}>A post by {name}</div>
          )}
        </div>

        {/* timestamp */}
        <div style={{ display: "flex", marginTop: "48px", color: MUTED, fontSize: "34px", letterSpacing: "-0.01em" }}>
          {stamp}
        </div>

        {/* engagement bar — fake 2-digit counts, descending left→right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "64px",
            marginTop: "40px",
            paddingTop: "36px",
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <Stat d={HEART} n={FAKE.like} />
          <Stat d={REPLY} n={FAKE.reply} />
          <Stat d={REBLOG} n={FAKE.reblog} />
          <Stat d={BOOKMARK} n={FAKE.bookmark} />
        </div>
        </div>

        {/* CTA — bottom, centered */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "12px", fontSize: "34px" }}>
          <span style={{ display: "flex", fontWeight: 700, color: TEXT }}>Read More on</span>
          <span style={{ display: "flex", fontWeight: 400, color: MUTED }}>{site.domain}/community</span>
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
