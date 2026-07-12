// Splits post text into plain + link tokens so the feed can render bare URLs as
// real anchors. Kept framework-free (no JSX) so it unit-tests without a DOM.
// Only http(s) URLs are matched — a scheme is required, so there's no bare-domain
// guessing and nothing to escape into an href.

export type LinkToken =
  | { type: "text"; value: string }
  | { type: "link"; href: string; text: string };

const URL_RE = /https?:\/\/[^\s]+/g;
// Trailing punctuation that's almost always prose, not part of the URL.
const TRAIL_RE = /[.,;:!?)\]}'"]+$/;

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
    if (start > last) out.push({ type: "text", value: input.slice(last, start) });
    out.push({ type: "link", href: url, text: url });
    if (trail) out.push({ type: "text", value: trail });
    last = start + m[0].length;
  }
  if (last < input.length) out.push({ type: "text", value: input.slice(last) });
  return out;
}
