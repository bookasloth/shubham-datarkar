/**
 * Single source of truth for what a route IS.
 *
 * `sitemap.ts` and `discovery.ts` both consume this. Before it existed they each
 * had their own idea of which routes belonged in the sitemap, and they disagreed:
 * the sitemap emitted `/games/login` and `/members/account` while the audit
 * reported those same routes as "not in sitemap".
 */

export type PageType = "pillar" | "hub" | "utility" | "app";

/**
 * Subtrees that are entirely application UI, and that robots.txt disallows.
 *
 * Only these. App routes under public subtrees (`/games/login`,
 * `/members/account`) must stay crawlable: Googlebot cannot read a `noindex`
 * tag on a URL it is forbidden to fetch, so disallowing them would leave them
 * eligible for URL-only indexing from inbound links. They carry `noIndex`
 * metadata instead.
 */
export const ROBOTS_DISALLOW_PREFIXES = [
  "/admin",
  "/dashboard",
  "/login",
  "/settings",
  "/profile",
  "/success",
  "/search",
] as const;

/** Application routes sitting under an otherwise-public subtree. */
const APP_ROUTES = new Set([
  "/games/login",
  "/games/profile",
  // `/members` itself is the member dashboard: its page calls requireMember() and
  // its layout already serves `robots: { index: false }`. Classifying it as a hub
  // put an auth-gated, noindexed page into the sitemap — the same contradiction
  // PR #109 removed everywhere else.
  "/members",
  "/members/login",
  "/members/account",
  "/members/bookmarks",
  "/members/downloads",
  "/members/explore",
  "/members/latest",
  "/members/requests",
  "/members/tools",
  "/members/upgrade",
  "/community/compose",
  "/community/me",
  "/community/bookmarks",
  "/unsubscribe",
  "/subscriber-assets",
]);

const APP_PATTERNS = [
  /^\/games\/[^/]+\/(?:archive|results|leaderboard)$/,
  /^\/games\/[^/]+\/\[puzzle\]$/,
  /^\/members\/(?:tools|resources)\/\[slug\]$/,
  /^\/support\/updates\/\[code\]$/,
];

const UTILITY_ROUTES = new Set([
  "/contact",
  "/book",
  "/link",
  "/help",
  "/support",
  "/support/supporters",
  "/support/updates",
  "/privacy-policy",
  "/terms-of-use",
]);

// `/me` is the founder-story home, split out of `/` in PR #110. It is long-form
// content, not an index page, so it faces the pillar checks (word count,
// dedicated OG image) rather than falling through to the `hub` default.
const PILLAR_ROUTES = new Set(["/", "/me", "/about", "/my-story", "/philosophy", "/speaking", "/seo-expert-india"]);

const PILLAR_PATTERNS = [
  /^\/(?:services|products|case-studies)\/[^/]+$/,
  // A blog post is three segments deep; /blog/<category> is only two and is a hub.
  /^\/blog\/[^/]+\/[^/]+$/,
];

export function pageTypeOf(route: string): PageType {
  if (ROBOTS_DISALLOW_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`))) return "app";
  if (APP_ROUTES.has(route)) return "app";
  if (APP_PATTERNS.some((re) => re.test(route))) return "app";
  if (UTILITY_ROUTES.has(route)) return "utility";
  if (PILLAR_ROUTES.has(route)) return "pillar";
  if (PILLAR_PATTERNS.some((re) => re.test(route))) return "pillar";
  return "hub";
}

/** An app route is the private one. Never scored, never crawled. */
export function isPrivate(route: string): boolean {
  return pageTypeOf(route) === "app";
}

/**
 * Belongs in the sitemap. A route containing `[` is an unexpanded template, not
 * a URL — discovery expands the ones backed by a data source.
 */
export function isIndexable(route: string): boolean {
  if (route.includes("[")) return false;
  return pageTypeOf(route) !== "app";
}
