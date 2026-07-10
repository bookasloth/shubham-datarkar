import "server-only";

const UA = "KalamAIBot/1.0 (+https://shubhamdatarkar.com/tools/kalamai)";
const CRAWL_TIMEOUT = 10_000;
const ROBOTS_TIMEOUT = 5_000;

export type Crawler = (url: string, robots?: RobotsCache) => Promise<string | null>;

// ponytail: naive robots.txt — honours Disallow in the `*` (or KalamAI) group by
// prefix, ignores Allow and wildcards, fails open. Upgrade to a real parser only
// if it demonstrably over-blocks.
function parseRobots(txt: string): string[] {
  const disallow: string[] = [];
  let active = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).toLowerCase().trim();
    const val = line.slice(idx + 1).trim();
    if (key === "user-agent") active = val === "*" || val.toLowerCase().includes("kalamai");
    else if (key === "disallow" && active && val) disallow.push(val);
  }
  return disallow;
}

/** Per-host robots.txt cache, scoped to one analysis run. */
export class RobotsCache {
  private cache = new Map<string, string[]>();

  async allows(url: string): Promise<boolean> {
    try {
      const u = new URL(url);
      let rules = this.cache.get(u.host);
      if (!rules) {
        rules = await this.fetchRules(u.origin);
        this.cache.set(u.host, rules);
      }
      return !rules.some((p) => u.pathname.startsWith(p));
    } catch {
      return true; // fail open
    }
  }

  private async fetchRules(origin: string): Promise<string[]> {
    try {
      const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(ROBOTS_TIMEOUT) });
      if (!res.ok) return [];
      return parseRobots(await res.text());
    } catch {
      return [];
    }
  }
}

/** Fetch a competitor page politely. Returns null on any failure — never throws. */
export const crawlUrl: Crawler = async (url, robots) => {
  try {
    if (robots && !(await robots.allows(url))) return null;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(CRAWL_TIMEOUT),
      redirect: "follow",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  }
};
