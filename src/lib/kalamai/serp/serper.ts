import "server-only";

import type { SerpProvider, SerpResult, SerpInput } from "./provider";

const ENDPOINT = "https://google.serper.dev/search";

type Organic = { link?: unknown; position?: unknown; title?: unknown };
type Paa = { question?: unknown };

/**
 * Parse Serper's /search response into the shared SerpResult. Pure + testable.
 * Serper has no AI Overview → aiOverviewUrls is always [] (degrades: the GEO
 * AI-cite weight just never fires; already handled downstream).
 */
export function parseSerper(json: unknown): SerpResult {
  const j = (json ?? {}) as { organic?: Organic[]; peopleAlsoAsk?: Paa[] };

  const organic: SerpResult["organic"] = [];
  for (const o of j.organic ?? []) {
    if (typeof o.link !== "string") continue;
    organic.push({
      url: o.link,
      rank: typeof o.position === "number" ? o.position : organic.length + 1,
      title: typeof o.title === "string" ? o.title : null,
    });
  }
  organic.sort((a, b) => a.rank - b.rank);

  const paa: string[] = [];
  for (const p of j.peopleAlsoAsk ?? []) if (typeof p.question === "string") paa.push(p.question);

  return { organic: organic.slice(0, 30), paa, aiOverviewUrls: [] };
}

export class SerperProvider implements SerpProvider {
  constructor(
    private readonly apiKey = process.env.SERPER_API_KEY,
    private readonly num = 30,
  ) {}

  async fetch(input: SerpInput): Promise<SerpResult> {
    if (!this.apiKey) throw new Error("SERPER_API_KEY not configured");
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "X-API-KEY": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        q: input.keyword,
        gl: input.country.toLowerCase(),
        hl: input.locale || "en",
        num: this.num,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Serper ${res.status}`);
    return parseSerper(await res.json());
  }
}
