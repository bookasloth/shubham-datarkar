// One-off: fetch an article's blocks and render to a standalone HTML file.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { blocksToHtml } from "@/lib/kalamai/serialize";

async function main() {
  const id = process.argv[process.argv.indexOf("--id") + 1];
  const out = process.argv[process.argv.indexOf("--out") + 1];
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.from("kalamai_articles").select("blocks, meta, score").eq("id", id).single();
  if (error) throw new Error(error.message);
  const a = data as { blocks: unknown; meta: { title?: string; description?: string }; score: { overall?: number } };
  const body = blocksToHtml(a.blocks as never);
  writeFileSync(out, `<h1>${a.meta?.title ?? ""}</h1>\n<p><em>${a.meta?.description ?? ""}</em> · score ${a.score?.overall ?? "?"}/100</p>\n${body}`);
  console.log(`wrote ${out}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
