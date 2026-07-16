// Splits post text into plain + link + mention tokens so the feed can render bare
// URLs as real anchors and @handles as profile links. Kept framework-free (no JSX)
// so it unit-tests without a DOM.
// Only http(s) URLs are matched — a scheme is required, so there's no bare-domain
// guessing and nothing to escape into an href.

export type LinkToken =
  | { type: "text"; value: string }
  // `value` is the literal "@handle" as typed. Every token except `link` carries
  // it, so a caller that only special-cases links (the OG card route) renders a
  // mention as plain text instead of dropping it.
  | { type: "mention"; handle: string; value: string }
  | { type: "link"; href: string; text: string };

const URL_RE = /https?:\/\/[^\s]+/g;
// Trailing punctuation that's almost always prose, not part of the URL.
const TRAIL_RE = /[.,;:!?)\]}'"]+$/;

// Handles must tolerate the charset `handle_new_user` can actually mint, which is
// `lower(email-local-part) || '_' || md5(...)` — so dots, plus and dashes all reach
// profiles.username even though the /games/profile rename form is stricter
// ([a-z0-9_]{3,20}). Matching only [a-z0-9_] would truncate "shubham.datarkar_a1b2"
// to "@shubham" and link to a user that doesn't exist.
// The leading (^|\s) is what keeps "mail me at foo@bar.com" from parsing as a
// mention of @bar.com — an @ mid-token is an email, not a handle.
const MENTION_RE = /(^|\s)@([a-z0-9][a-z0-9._+-]{2,29})/gi;
// A handle can't end in punctuation, so "ping @sam." mentions @sam and leaves ".".
const HANDLE_TRAIL_RE = /[._+-]+$/;

export function tokenizeLinks(input: string): LinkToken[] {
  const out: LinkToken[] = [];
  let last = 0;
  for (const m of input.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    let url = m[0];
    const trail = url.match(TRAIL_RE)?.[0] ?? "";
    if (trail) url = url.slice(0, -trail.length);
    // If trimming ate everything meaningful, treat the match as plain text.
    if (!/^https?:\/\/\S/.test(url)) continue;
    if (start > last) pushText(out, input.slice(last, start));
    out.push({ type: "link", href: url, text: url });
    if (trail) pushText(out, trail);
    last = start + m[0].length;
  }
  if (last < input.length) pushText(out, input.slice(last));
  return out;
}

/** Split a plain run into text + mention tokens. Only ever sees the gaps between
 *  links, so a URL containing "/@handle" is already consumed and can't match. */
function pushText(out: LinkToken[], value: string): void {
  let last = 0;
  for (const m of value.matchAll(MENTION_RE)) {
    const lead = m[1];
    // Offset past the leading whitespace the pattern had to capture to prove the
    // @ starts a word — that space belongs to the preceding text token.
    const start = (m.index ?? 0) + lead.length;
    let handle = m[2];
    const trail = handle.match(HANDLE_TRAIL_RE)?.[0] ?? "";
    if (trail) handle = handle.slice(0, -trail.length);
    if (handle.length < 3) continue;
    if (start > last) out.push({ type: "text", value: value.slice(last, start) });
    out.push({ type: "mention", handle: handle.toLowerCase(), value: `@${handle}` });
    last = start + 1 + handle.length;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
}

/** Distinct lowercased handles mentioned in a body — the notify recipient list. */
export function mentionedHandles(input: string): string[] {
  return [
    ...new Set(
      tokenizeLinks(input).flatMap((t) => (t.type === "mention" ? [t.handle] : [])),
    ),
  ];
}

// Display label for a URL when no short slug is available (RPC hiccup, or the
// URL isn't http(s)): drop scheme + www and cap the length so the feed never
// paints a giant raw URL. The href stays the full URL — this only shortens text.
export function prettyLabel(url: string, max = 42): string {
  const bare = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return bare.length > max ? bare.slice(0, max - 1) + "…" : bare;
}
