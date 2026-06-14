// Throwaway connection check: anon-key read against the public views.
// Run: node scripts/verify-supabase.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Parse .env.local manually (plain node doesn't load Next env files).
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

for (const view of ["public_support_stats", "public_supports_recent", "public_supporter_tiers"]) {
  const { data, error } = await supabase.from(view).select("*").limit(3);
  if (error) console.log(`FAIL ${view}: ${error.message}`);
  else console.log(`OK   ${view}: ${JSON.stringify(data)}`);
}
