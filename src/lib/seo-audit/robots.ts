// robots.txt parsing for the audit. Two jobs: (1) is a given path crawlable by
// search engines, (2) are the major AI crawlers blocked. The AI-crawler result
// is a READINESS signal only — being allowed never guarantees a citation, and
// the report copy must say so (spec §13, §26).
//
// ponytail: prefix-match Disallow within a user-agent group; ignores Allow
// overrides and wildcard patterns. Real robots files rarely need more for a
// readiness read; upgrade to a full matcher only if it demonstrably misreads.

export type RobotsInfo = {
  fetched: boolean;
  groups: Record<string, string[]>; // user-agent (lowercased) -> Disallow prefixes
  sitemaps: string[];
};

// User agents whose access we report on. Names as they appear in robots.txt.
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Amazonbot",
  "Bytespider",
  "Meta-ExternalAgent",
] as const;

export function parseRobotsInfo(txt: string | null): RobotsInfo {
  if (txt == null) return { fetched: false, groups: {}, sitemaps: [] };
  const groups: Record<string, string[]> = {};
  const sitemaps: string[] = [];
  let currentAgents: string[] = [];
  let sawDirective = false;

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).toLowerCase().trim();
    const val = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      // Consecutive User-agent lines share the following rule block.
      if (sawDirective) currentAgents = [];
      sawDirective = false;
      const ua = val.toLowerCase();
      currentAgents.push(ua);
      groups[ua] ??= [];
    } else if (key === "disallow") {
      sawDirective = true;
      if (val) for (const ua of currentAgents) (groups[ua] ??= []).push(val);
    } else if (key === "allow") {
      sawDirective = true; // parsed for grouping only (Allow overrides ignored)
    } else if (key === "sitemap") {
      if (val) sitemaps.push(val);
    }
  }
  return { fetched: true, groups, sitemaps };
}

/** Disallow prefixes that apply to `ua`, falling back to the `*` group. */
function rulesFor(info: RobotsInfo, ua: string): string[] {
  const key = ua.toLowerCase();
  return info.groups[key] ?? info.groups["*"] ?? [];
}

/** Whether `path` is crawlable by `ua`. Fails open when robots.txt was absent. */
export function robotsAllows(info: RobotsInfo, path: string, ua = "*"): boolean {
  if (!info.fetched) return true;
  const rules = rulesFor(info, ua);
  if (rules.includes("/")) return false; // blanket block
  return !rules.some((p) => p !== "" && path.startsWith(p));
}

/** Per-AI-crawler root access. `allowed=false` means that crawler is blocked from `/`. */
export function aiCrawlerAccess(info: RobotsInfo): { name: string; allowed: boolean }[] {
  return AI_CRAWLERS.map((name) => ({ name, allowed: robotsAllows(info, "/", name) }));
}
