// First-line explicit-content filter. Intentionally short: report + admin
// review (Plan 6) is the real moderation path, and image NSFW detection is a
// separate concern. Extend BLOCKED as needed.
// ponytail: word-boundary match, not substring — "Scunthorpe" must not trip it.
const BLOCKED = [
  "porn",
  "porno",
  "pornhub",
  "xxx",
  "nudes",
  "nudity",
  "onlyfans",
  "camgirl",
  "escort",
  "sexcam",
  "hentai",
];

const PATTERN = new RegExp(`\\b(${BLOCKED.join("|")})\\b`, "i");

export function containsBlocked(text: string): boolean {
  if (!text) return false;
  return PATTERN.test(text);
}
