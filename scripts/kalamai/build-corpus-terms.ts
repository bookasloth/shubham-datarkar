// Build the KalamAI background term-frequency prior (corpus module 3b).
//
// Reads every ok kalamai_corpus_pages.body_text for a language, runs the SAME
// tokenizer distill uses, and writes kalamai_corpus_terms + kalamai_corpus_totals.
// This is the table distill's log-odds actually reads (analysis-server.loadBackground);
// build-corpus.ts (3a) only fills pages+chunks, so log-odds stays on a uniform prior
// until THIS runs. Recomputes the whole language from all current pages → idempotent.
//
// Run (real):
//   npx tsx --env-file=.env.local scripts/kalamai/build-corpus-terms.ts --lang en --min-count 2
// Offline smoke test (no DB, fake docs):
//   npx tsx scripts/kalamai/build-corpus-terms.ts --dry

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { backgroundFrequencies } from "@/lib/kalamai/text-tokens";

const PAGE_SIZE = 1000; // Supabase per-request row cap
const INSERT_BATCH = 1000;

type Arg = { lang: string; minCount: number; dry: boolean };

function parseArgs(argv: string[]): Arg {
  const get = (k: string) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    lang: get("lang") ?? "en",
    minCount: Number(get("min-count") ?? 1),
    dry: argv.includes("--dry"),
  };
}

async function loadBodies(db: SupabaseClient, lang: string): Promise<string[]> {
  const docs: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("kalamai_corpus_pages")
      .select("body_text")
      .eq("language", lang)
      .eq("ok", true)
      .not("body_text", "is", null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`load pages: ${error.message}`);
    const batch = (data ?? []) as { body_text: string | null }[];
    for (const r of batch) if (r.body_text) docs.push(r.body_text);
    if (batch.length < PAGE_SIZE) break;
  }
  return docs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.dry) {
    console.log("[dry] offline aggregation smoke test — no DB\n");
    const docs = [
      "content marketing is the practice of content strategy for creators and small business",
      "keyword research and search optimisation guide for content marketing beginners",
      "how to do content marketing on a budget: strategy, tools and keyword research",
    ];
    const { terms, totalTokens, docCount } = backgroundFrequencies(docs, args.minCount);
    report(terms, totalTokens, docCount, args.lang, args.minCount);
    return;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Refusing to run: Supabase service-role creds missing. Set them in .env.local.");
    process.exit(1);
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Aggregating background terms: lang=${args.lang}, min-count=${args.minCount}\n`);
  const docs = await loadBodies(db, args.lang);
  if (!docs.length) {
    console.error(`No ok corpus pages for lang=${args.lang}. Run build-corpus.ts first.`);
    process.exit(1);
  }

  const { terms, totalTokens, docCount } = backgroundFrequencies(docs, args.minCount);

  // Idempotent replace for this language.
  const del1 = await db.from("kalamai_corpus_terms").delete().eq("language", args.lang);
  if (del1.error) throw new Error(`clear terms: ${del1.error.message}`);
  const del2 = await db.from("kalamai_corpus_totals").delete().eq("language", args.lang);
  if (del2.error) throw new Error(`clear totals: ${del2.error.message}`);

  for (let i = 0; i < terms.length; i += INSERT_BATCH) {
    const rows = terms.slice(i, i + INSERT_BATCH).map((t) => ({ language: args.lang, ...t }));
    const { error } = await db.from("kalamai_corpus_terms").insert(rows);
    if (error) throw new Error(`insert terms [${i}]: ${error.message}`);
  }
  const totIns = await db
    .from("kalamai_corpus_totals")
    .insert({ language: args.lang, total_tokens: totalTokens, doc_count: docCount });
  if (totIns.error) throw new Error(`insert totals: ${totIns.error.message}`);

  report(terms, totalTokens, docCount, args.lang, args.minCount);
}

function report(
  terms: { term: string; count: number }[],
  totalTokens: number,
  docCount: number,
  lang: string,
  minCount: number,
): void {
  const top = [...terms].sort((a, b) => b.count - a.count).slice(0, 20);
  console.log("===== 3b BACKGROUND-TERMS REPORT =====");
  console.log(`lang: ${lang}  docs: ${docCount}  stored terms (count>=${minCount}): ${terms.length}  total_tokens: ${totalTokens}`);
  console.log(`\ntop 20 by count (eyeball for boilerplate leakage):`);
  for (const t of top) console.log(`  ${String(t.count).padStart(6)}  ${t.term}`);
  console.log("======================================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
