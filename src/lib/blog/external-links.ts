import type { Post } from "@/lib/data/types";

/**
 * Outbound contextual backlinks from blog prose to the founder's ventures —
 * Timewheel Internet (timewheel.co.in) and Book A Sloth (bookasloth.com).
 *
 * Reuses the internal autolinker: `buildExternalIndex` returns the same
 * `{ term, href }[]` shape `autolinkBlocks` consumes, so the blog page runs a
 * second `autolinkBlocks` pass with this index. The rich-text renderer already
 * renders any `https://` anchor as an external link (target=_blank, rel), so no
 * renderer change is needed.
 *
 * The href is chosen per-post: if the post's title/tags/excerpt mention a topic
 * with a dedicated landing page (a dentist post -> /for/dentists, an SEO post ->
 * /seo-company-in-nagpur), the link goes deep; otherwise it falls back to the
 * venture homepage. This gives topical deep links with zero edits to the DB-held
 * post bodies.
 *
 * ponytail: topic match is a keyword regex over post metadata, first match wins.
 * Upgrade path if it matters: an explicit per-post outbound-target column in the
 * editor.
 */

const TIMEWHEEL = "https://timewheel.co.in";
const BOOK_A_SLOTH = "https://bookasloth.com";

// [keyword regex, deep path]. Order = specificity; first match wins.
const TIMEWHEEL_TOPICS: [RegExp, string][] = [
  [/\bseo\b|search engine/, "/seo-company-in-nagpur"],
  [/web app/, "/web-app-development-company-in-nagpur"],
  [/shopify/, "/shopify-development-company-in-nagpur"],
  [/website design|web design/, "/website-design-company-in-nagpur"],
  [/web develop|website develop/, "/web-development-company-in-nagpur"],
  [/social media/, "/social-media-marketing-company-in-nagpur"],
  [/restaurant/, "/restaurant-marketing"],
  [/digital marketing|advertis|\bppc\b|google ads|meta ads/, "/digital-marketing-company-in-nagpur"],
];

const BOOK_A_SLOTH_TOPICS: [RegExp, string][] = [
  [/dentist|dental/, "/for/dentists"],
  [/doctor|clinic|physician|medical/, "/for/doctors"],
  [/lawyer|law firm|legal|advocate/, "/for/lawyers"],
  [/architect/, "/for/architects"],
  [/nutrition|dietician|dietitian/, "/for/nutritionists"],
  [/photograph/, "/for/photographers"],
  [/fitness|personal train|\bgym\b/, "/for/fitness"],
  [/tutor|coaching class|\btuition\b/, "/for/tutors"],
  [/salon|\bhair\b|makeup|beauty/, "/for/salon"],
  [/\bspa\b|massage|wellness/, "/for/spa"],
  [/astrolog|tarot/, "/for/astrologers"],
  [/freelanc|solopreneur/, "/for/freelancers"],
  [/life coach|\bcoach\b|coaching/, "/for/life-coaches"],
  [/\bevent\b|wedding/, "/for/events"],
  [/\bagenc/, "/for/agencies"],
];

function resolve(base: string, topics: [RegExp, string][], haystack: string): string {
  for (const [re, path] of topics) if (re.test(haystack)) return base + path;
  return `${base}/`;
}

/**
 * One external entry per venture, href resolved to the most relevant landing
 * page for this post. Longest term first so a multi-word brand matches before a
 * shorter one would (mirrors the internal index's ordering contract).
 */
export function buildExternalIndex(post: Post): { term: string; href: string }[] {
  const haystack = [post.title, post.excerpt, ...(post.tags ?? [])]
    .join(" ")
    .toLowerCase();
  return [
    { term: "book a sloth", href: resolve(BOOK_A_SLOTH, BOOK_A_SLOTH_TOPICS, haystack) },
    { term: "timewheel", href: resolve(TIMEWHEEL, TIMEWHEEL_TOPICS, haystack) },
  ];
}
