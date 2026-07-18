// Build the KalamAI background corpus (module 3a).
//
// Crawls SERP top-100 for each seed keyword, extracts + labels each page
// (rank <=10 => positive, 30-100 => negative), chunks + embeds, and stores in
// kalamai_corpus_pages + kalamai_chunks. REAL data only (Hard Rule 3): with no
// DataForSEO or Gemini creds the real run refuses and exits.
//
// Run (real):
//   npx tsx --env-file=.env.local scripts/kalamai/build-corpus.ts --keywords "a,b,c" --lang en --country IN
//   npx tsx --env-file=.env.local scripts/kalamai/build-corpus.ts --file scripts/kalamai/seeds.txt
// Offline pipeline smoke test (no network, no DB, fake HTML + fake embed):
//   npx tsx scripts/kalamai/build-corpus.ts --dry
//
// Reports crawl success rate, mean junk_ratio, positive/negative counts, and a
// sample of extracted text — the D8 gate to inspect before scaling 10 -> 500 -> 2000.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { crawlUrl, RobotsCache } from "@/lib/kalamai/crawl";
import { extractPage, type ExtractedPage } from "@/lib/kalamai/extract";
import { chunkText } from "@/lib/kalamai/chunk";
import { embedTexts, toPgVector, EMBED_MODEL, isFakeEmbed } from "@/lib/kalamai/embed";

const LOCATION: Record<string, string> = { IN: "India", US: "United States", GB: "United Kingdom" };
const POS_MAX = 10; // rank <= this => positive
const NEG_MIN = 30; // rank in [NEG_MIN, NEG_MAX] => negative
const NEG_MAX = 100;
const CRAWL_CONCURRENCY = 4;
const KEYWORD_DELAY_MS = 1500; // polite gap between keywords

type Arg = { keywords: string[]; lang: string; country: string; file?: string; dry: boolean };

function parseArgs(argv: string[]): Arg {
  const get = (k: string) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const kw = get("keywords");
  return {
    keywords: kw ? kw.split(",").map((s) => s.trim()).filter(Boolean) : [],
    lang: get("lang") ?? "en",
    country: get("country") ?? "IN",
    file: get("file"),
    dry: argv.includes("--dry"),
  };
}

async function fetchSerp100(keyword: string, lang: string, country: string): Promise<{ url: string; rank: number }[]> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DataForSEO credentials not configured");
  const auth = Buffer.from(`${login}:${password}`).toString("base64");
  const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      { keyword, location_name: LOCATION[country] ?? "India", language_code: lang, depth: NEG_MAX },
    ]),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}`);
  const json = (await res.json()) as { tasks?: { result?: { items?: Record<string, unknown>[] }[] }[] };
  const items = json.tasks?.[0]?.result?.[0]?.items ?? [];
  return items
    .filter((i) => i.type === "organic" && typeof i.url === "string")
    .map((i) => ({ url: i.url as string, rank: typeof i.rank_absolute === "number" ? i.rank_absolute : 0 }))
    .filter((o) => o.rank > 0)
    .sort((a, b) => a.rank - b.rank);
}

// Keep the top-10 and the 30-100 band; drop the ambiguous 11-29 middle.
function selectLabeled(serp: { url: string; rank: number }[]): { url: string; rank: number; isPositive: boolean }[] {
  return serp
    .filter((o) => o.rank <= POS_MAX || (o.rank >= NEG_MIN && o.rank <= NEG_MAX))
    .map((o) => ({ ...o, isPositive: o.rank <= POS_MAX }));
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

type CorpusResult = { ok: boolean; junkRatio: number; wordCount: number; sample: string };

async function processPage(
  db: SupabaseClient | null,
  target: { url: string; rank: number; isPositive: boolean },
  ctx: { keyword: string; lang: string; country: string },
  robots: RobotsCache,
  html?: string, // provided in --dry
): Promise<CorpusResult> {
  let page: ExtractedPage | null = null;
  try {
    const raw = html ?? (await crawlUrl(target.url, robots));
    if (raw) page = extractPage(raw);
  } catch {
    page = null;
  }

  const ok = !!page && page.wordCount >= 100;

  if (db) {
    // Upsert the page (unique by url), get its id, then replace its chunks.
    const { data: up } = await db
      .from("kalamai_corpus_pages")
      .upsert(
        {
          url: target.url,
          language: ctx.lang,
          country: ctx.country,
          keyword_seed: ctx.keyword,
          serp_rank: target.rank,
          is_positive: target.isPositive,
          ok,
          title: page?.title ?? null,
          meta_description: page?.metaDescription ?? null,
          headings: page?.headings ?? null,
          body_text: page?.bodyText ?? null,
          word_count: page?.wordCount ?? null,
          jsonld_types: page?.jsonldTypes ?? null,
          junk_ratio: page?.junkRatio ?? null,
        },
        { onConflict: "url" },
      )
      .select("id")
      .maybeSingle();

    const pageId = (up as { id: string } | null)?.id;
    if (pageId && ok && page) {
      await db.from("kalamai_chunks").delete().eq("corpus_page_id", pageId);
      const chunks = chunkText(page.bodyText);
      if (chunks.length) {
        const vectors = await embedTexts(chunks.map((c) => c.text), "RETRIEVAL_DOCUMENT");
        await db.from("kalamai_chunks").insert(
          chunks.map((c, i) => ({
            source_type: "corpus",
            corpus_page_id: pageId,
            chunk_index: c.index,
            text: c.text,
            token_count: c.tokenCount,
            embedding: toPgVector(vectors[i]),
            embedding_model: EMBED_MODEL,
          })),
        );
      }
    }
  }

  return { ok, junkRatio: page?.junkRatio ?? 0, wordCount: page?.wordCount ?? 0, sample: (page?.bodyText ?? "").slice(0, 300) };
}

const FAKE_HTML = (n: number) =>
  `<!doctype html><html><head><title>SEO Guide ${n}</title><meta name="description" content="d"></head><body>` +
  `<nav>Home Menu Subscribe</nav><main><article><h1>Guide ${n}</h1>` +
  Array.from({ length: 30 }, (_, i) => `<p>Paragraph ${i} about content strategy, keyword research and search optimisation for creators.</p>`).join("") +
  `</article></main><footer>contact privacy terms</footer></body></html>`;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.dry) {
    console.log("[dry] offline pipeline smoke test — no network, no DB writes\n");
    const robots = new RobotsCache();
    const targets = [
      { url: "https://example.com/a", rank: 3, isPositive: true },
      { url: "https://example.com/b", rank: 45, isPositive: false },
    ];
    const results = await Promise.all(targets.map((t, i) => processPage(null, t, { keyword: "content strategy", lang: "en", country: "IN" }, robots, FAKE_HTML(i))));
    report(results, targets.length);
    console.log(`\nembed mode: ${isFakeEmbed() ? "FAKE (no key)" : "REAL"}`);
    return;
  }

  // Real run: refuse fake data (Hard Rule 3).
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    console.error("Refusing to run: DataForSEO credentials missing. Set them in .env.local (Hard Rule 3: no synthetic corpus).");
    process.exit(1);
  }
  if (isFakeEmbed()) {
    console.error("Refusing to run: GEMINI_API_KEY missing (fake embeddings). Set it in .env.local (Hard Rule 3).");
    process.exit(1);
  }

  const keywords = args.file
    ? (await import("node:fs")).readFileSync(args.file, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
    : args.keywords;
  if (!keywords.length) {
    console.error("No keywords. Pass --keywords \"a,b,c\" or --file path.");
    process.exit(1);
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Building corpus: ${keywords.length} keyword(s), lang=${args.lang}, country=${args.country}\n`);
  const all: CorpusResult[] = [];
  let totalTargets = 0;

  for (const [ki, keyword] of keywords.entries()) {
    try {
      const serp = await fetchSerp100(keyword, args.lang, args.country);
      const labeled = selectLabeled(serp);
      totalTargets += labeled.length;
      const robots = new RobotsCache();
      const results = await mapLimit(labeled, CRAWL_CONCURRENCY, (t) =>
        processPage(db, t, { keyword, lang: args.lang, country: args.country }, robots),
      );
      all.push(...results);
      const okCount = results.filter((r) => r.ok).length;
      console.log(`[${ki + 1}/${keywords.length}] "${keyword}": ${labeled.length} pages, ${okCount} ok`);
    } catch (e) {
      console.error(`[${ki + 1}/${keywords.length}] "${keyword}" FAILED: ${(e as Error).message}`);
    }
    if (ki < keywords.length - 1) await new Promise((r) => setTimeout(r, KEYWORD_DELAY_MS));
  }

  report(all, totalTargets);
}

function report(results: CorpusResult[], totalTargets: number): void {
  const ok = results.filter((r) => r.ok);
  const rate = results.length ? ok.length / results.length : 0;
  const meanJunk = ok.length ? ok.reduce((s, r) => s + r.junkRatio, 0) / ok.length : 0;
  const meanWords = ok.length ? Math.round(ok.reduce((s, r) => s + r.wordCount, 0) / ok.length) : 0;
  console.log("\n===== D8 GATE REPORT =====");
  console.log(`targets: ${totalTargets}  crawled ok: ${ok.length}/${results.length}  success rate: ${(rate * 100).toFixed(1)}%`);
  console.log(`mean junk_ratio (ok pages): ${meanJunk.toFixed(3)}  mean word_count: ${meanWords}`);
  const sample = ok.find((r) => r.sample.length > 50);
  if (sample) console.log(`\nsample extracted text:\n"${sample.sample}..."`);
  console.log("==========================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
