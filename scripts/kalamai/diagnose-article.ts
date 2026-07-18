// One diagnostic run: analysis → article end-to-end on the live prior, then dump
// the brief + blocks for a quality read. Uses live Serper + live Anthropic + prod
// Supabase (service role). NOT the fake providers — the whole point is real output.
//
//   npx tsx --env-file=.env.local scripts/kalamai/diagnose-article.ts --keyword "what is answer engine optimization"
//
// Requires ANTHROPIC_API_KEY + SERPER_API_KEY + Supabase service role in .env.local.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runStep } from "@/lib/kalamai/analysis-server";
import { runArticleStep } from "@/lib/kalamai/writing-server";

const OWNER_EMAIL = "bookasloth@gmail.com";
const MAX_STEPS = 40;

function arg(k: string, d?: string): string | undefined {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
}

async function ownerId(db: SupabaseClient): Promise<string> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const u = data.users.find((x) => x.email?.toLowerCase() === OWNER_EMAIL);
    if (u) return u.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`no auth user for ${OWNER_EMAIL}`);
}

async function drive(label: string, id: string, step: (id: string) => Promise<{ status: string; progress: number }>) {
  let last = "";
  for (let i = 0; i < MAX_STEPS; i++) {
    const { status, progress } = await step(id);
    if (status !== last) { console.log(`  ${label}: ${status} (${progress}%)`); last = status; }
    if (status === "complete") return "complete";
    if (status === "failed") return "failed";
  }
  return "timeout";
}

async function main() {
  const keyword = arg("keyword");
  if (!keyword) { console.error('Pass --keyword "..."'); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY missing → would run FAKE LLM. Set it in .env.local."); process.exit(1); }
  if (!process.env.SERPER_API_KEY && !process.env.DATAFORSEO_LOGIN) { console.error("No SERP provider creds."); process.exit(1); }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const uid = await ownerId(db);
  console.log(`owner ${uid}\nkeyword: "${keyword}"\n`);

  // Insert directly (bypass quota RPC — this is a diagnostic, not a user request).
  const ins = await db.from("kalamai_analyses").insert({ user_id: uid, keyword, country: "IN", locale: "en" }).select("id").single();
  if (ins.error) throw new Error(`insert analysis: ${ins.error.message}`);
  const analysisId = (ins.data as { id: string }).id;
  console.log(`analysis ${analysisId}`);

  const aStatus = await drive("analysis", analysisId, (id) => runStep(id));
  if (aStatus !== "complete") { console.error(`analysis ended: ${aStatus}`); process.exit(1); }

  const artIns = await db.from("kalamai_articles").insert({ user_id: uid, analysis_id: analysisId }).select("id").single();
  if (artIns.error) throw new Error(`insert article: ${artIns.error.message}`);
  const articleId = (artIns.data as { id: string }).id;
  console.log(`article ${articleId}`);

  const wStatus = await drive("article", articleId, (id) => runArticleStep(id));
  if (wStatus !== "complete") { console.error(`article ended: ${wStatus}`); process.exit(1); }

  // Dump for the quality read.
  const { data: a } = await db.from("kalamai_analyses").select("report, low_confidence").eq("id", analysisId).single();
  const { data: art } = await db.from("kalamai_articles").select("blocks, score, meta").eq("id", articleId).single();

  console.log("\n\n========== BRIEF / TERMS ==========");
  console.log(JSON.stringify((a as { report: unknown })?.report, null, 2));
  console.log("\n\n========== ARTICLE BLOCKS ==========");
  console.log(JSON.stringify((art as { blocks: unknown })?.blocks, null, 2));
  console.log("\n\n========== SCORE / META ==========");
  console.log(JSON.stringify({ score: (art as { score: unknown })?.score, meta: (art as { meta: unknown })?.meta }, null, 2));
  console.log(`\nanalysis=${analysisId} article=${articleId}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
