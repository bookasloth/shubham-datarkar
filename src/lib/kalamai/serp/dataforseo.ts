import "server-only";

import type { SerpProvider, SerpResult, SerpInput } from "./provider";

const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";

// Minimal country -> DataForSEO location_name map. The keyword usually carries
// the city ("... in Nagpur"), so country-level location is enough for v1.
const LOCATION_BY_COUNTRY: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
};

/** Walk an arbitrary node and collect every string under a `url` key. */
function collectUrls(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const v of node) collectUrls(v, out);
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "url" && typeof v === "string" && /^https?:\/\//.test(v)) out.add(v);
      else collectUrls(v, out);
    }
  }
}

type Item = Record<string, unknown>;

// ponytail: field paths follow DataForSEO's documented SERP Advanced shape but
// are unverified against a live response — confirm on the first real call
// (the AI-Overview block in particular varies by keyword).
export function parseDataForSeo(json: unknown): SerpResult {
  const task = (json as { tasks?: { status_code?: number; status_message?: string; result?: { items?: Item[] }[] }[] })
    ?.tasks?.[0];
  // Task-level error returns HTTP 200 with a non-20000 status (e.g. 40201 account
  // paused). Throw so it fails the analysis loudly instead of caching an empty SERP.
  if (task && typeof task.status_code === "number" && task.status_code !== 20000) {
    throw new Error(`DataForSEO task ${task.status_code}: ${task.status_message ?? "error"}`);
  }
  const items = (task?.result?.[0]?.items ?? []) as Item[];

  const organic: SerpResult["organic"] = [];
  const paa: string[] = [];
  const aiUrls = new Set<string>();

  for (const it of items) {
    const type = it.type;
    if (type === "organic" && typeof it.url === "string") {
      organic.push({
        url: it.url,
        rank: typeof it.rank_absolute === "number" ? it.rank_absolute : organic.length + 1,
        title: typeof it.title === "string" ? it.title : null,
      });
    } else if (type === "people_also_ask") {
      for (const q of (it.items as Item[] | undefined) ?? []) {
        const t = q.title ?? q.question;
        if (typeof t === "string") paa.push(t);
      }
    } else if (type === "ai_overview") {
      collectUrls(it, aiUrls);
    }
  }

  organic.sort((a, b) => a.rank - b.rank);
  return { organic: organic.slice(0, 30), paa, aiOverviewUrls: [...aiUrls] };
}

export class DataForSeoProvider implements SerpProvider {
  constructor(
    private readonly login = process.env.DATAFORSEO_LOGIN,
    private readonly password = process.env.DATAFORSEO_PASSWORD,
  ) {}

  async fetch(input: SerpInput): Promise<SerpResult> {
    if (!this.login || !this.password) throw new Error("DataForSEO credentials not configured");
    const auth = Buffer.from(`${this.login}:${this.password}`).toString("base64");
    const body = [
      {
        keyword: input.keyword,
        location_name: LOCATION_BY_COUNTRY[input.country] ?? "India",
        language_code: input.locale || "en",
        depth: 30,
        people_also_ask_click_depth: 1,
        load_async_ai_overview: true,
      },
    ];

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`DataForSEO ${res.status}`);
    return parseDataForSeo(await res.json());
  }
}
