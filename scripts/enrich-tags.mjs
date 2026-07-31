#!/usr/bin/env node
/**
 * One-off tag enrichment for blog posts.
 *
 * Problem: every published post carries exactly one coarse slug tag
 * (book-a-sloth / daily-log), so tag-based interlinking barely fires.
 * This scans each post's body for a curated topical vocabulary and proposes
 * 3-5 tags, keeping the existing bucket tag.
 *
 * It does NOT touch the DB (RLS + house rule: hand SQL to a human). It reads
 * via the anon REST API and writes UPDATE statements to a .sql file you review
 * and run in the Supabase SQL editor.
 *
 *   node scripts/enrich-tags.mjs            # dry run: summary only
 *   node scripts/enrich-tags.mjs --write    # also emit the .sql file
 *
 * ponytail: keyword-match, no LLM. Recall is only as good as VOCAB below —
 * synonyms it doesn't list are missed. Upgrade path if that bites: replace
 * pickTags() with a Haiku call (Anthropic key already in env for /community).
 */
import { readFileSync, writeFileSync } from "node:fs";

const MAX_TAGS = 5;

// tag -> match terms. Terms are matched case-insensitively as whole words;
// "-" matches a space or hyphen so "row-level-security" also hits "row level
// security". Keep terms specific — a term that matches everything tags nothing.
const VOCAB = {
  supabase: ["supabase"],
  "row-level-security": ["row-level-security", "row level security", "\\brls\\b"],
  auth: ["auth", "login", "sign-in", "sign up", "oauth", "session", "magic link"],
  nextjs: ["next.js", "nextjs", "app router", "server component", "\\bisr\\b", "revalidate"],
  vercel: ["vercel", "deploy", "deployment", "edge function", "cold start"],
  seo: ["\\bseo\\b", "sitemap", "search console", "meta tag", "canonical", "schema"],
  performance: ["performance", "latency", "\\bttfb\\b", "lighthouse", "cache", "caching"],
  payments: ["razorpay", "stripe", "payment", "checkout", "pricing", "subscription"],
  email: ["email", "smtp", "imap", "inbox", "newsletter", "resend"],
  games: ["\\bgame\\b", "wordle", "puzzle", "leaderboard", "streak"],
  community: ["community", "\\bfeed\\b", "reblog", "mention", "follow"],
  ai: ["\\bai\\b", "\\bllm\\b", "claude", "anthropic", "openai", "\\bgpt\\b", "prompt"],
  typescript: ["typescript", "\\btsc\\b", "type error", "type-safe"],
  database: ["postgres", "postgresql", "migration", "\\bsql\\b", "schema", "query"],
  security: ["security", "vulnerability", "\\bxss\\b", "\\bcsrf\\b", "\\bcsp\\b", "sanitiz"],
};

// Compile once. Escape regex metachars EXCEPT our intentional \b anchors and -.
function toRe(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]]/g, "\\$&").replace(/-/g, "[\\s-]+");
  return new RegExp(`(?<![\\w\\\\])\\b${escaped}\\b`, "i");
}
const COMPILED = Object.entries(VOCAB).map(([tag, terms]) => ({
  tag,
  res: terms.map((t) => (t.includes("\\b") ? new RegExp(t, "i") : toRe(t))),
}));

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trimStart().startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

/** Best-effort plain text from a post body (array of content blocks). */
function bodyText(body) {
  const out = [];
  const rich = (v) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) for (const n of v) out.push(typeof n === "string" ? n : (n?.text ?? ""));
  };
  const walk = (item) => {
    if (typeof item === "string") out.push(item);
    else if (item && typeof item === "object") {
      if ("text" in item) rich(item.text);
      for (const k of ["items", "cards", "stats", "metrics", "faq", "steps"]) {
        if (Array.isArray(item[k])) item[k].forEach(walk);
      }
      if ("q" in item) out.push(String(item.q ?? ""));
      if ("a" in item) rich(item.a);
    }
  };
  (Array.isArray(body) ? body : []).forEach(walk);
  return out.join(" ");
}

function pickTags(existing, text) {
  const hay = `${text}`;
  const found = COMPILED.filter(({ res }) => res.some((re) => re.test(hay))).map((c) => c.tag);
  // Keep the existing bucket tag(s) first, then topical, deduped, capped.
  return [...new Set([...(existing ?? []), ...found])].slice(0, MAX_TAGS);
}

// Postgres text[] literal: {a,b,"c d"} with quotes/backslashes escaped.
function pgArray(arr) {
  const els = arr.map((s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `'{${els.join(",")}}'`;
}

async function main() {
  const write = process.argv.includes("--write");
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY in .env.local");

  const res = await fetch(`${url}/rest/v1/posts?select=id,slug,title,tags,body&status=eq.published`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`REST error: ${JSON.stringify(rows)}`);

  const updates = [];
  const dist = {};
  for (const r of rows) {
    const before = Array.isArray(r.tags) ? r.tags : [];
    const after = pickTags(before, bodyText(r.body));
    for (const t of after) dist[t] = (dist[t] ?? 0) + 1;
    // Only emit when we actually added something.
    if (after.length > before.length) {
      updates.push({ id: r.id, slug: r.slug, before, after });
    }
  }

  const avgBefore = (rows.reduce((a, r) => a + (r.tags?.length ?? 0), 0) / rows.length).toFixed(2);
  const avgAfter = (rows.reduce((a, r) => a + pickTags(r.tags ?? [], bodyText(r.body)).length, 0) / rows.length).toFixed(2);

  console.log(`posts:            ${rows.length}`);
  console.log(`would enrich:     ${updates.length}`);
  console.log(`avg tags/post:    ${avgBefore} -> ${avgAfter}`);
  console.log(`unique tags:      ${Object.keys(dist).length}`);
  console.log(
    `tag distribution: ${Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(", ")}`,
  );
  console.log("\nsample (first 8):");
  for (const u of updates.slice(0, 8)) console.log(`  ${u.slug}: [${u.before}] -> [${u.after}]`);

  if (!write) {
    console.log("\nDry run. Re-run with --write to emit the .sql file.");
    return;
  }

  const sql = [
    "-- Blog tag enrichment. Review before running in the Supabase SQL editor.",
    `-- Generated from ${rows.length} published posts; ${updates.length} updated.`,
    "begin;",
    ...updates.map((u) => `update posts set tags = ${pgArray(u.after)} where id = '${u.id}'; -- ${u.slug}`),
    "commit;",
    "",
  ].join("\n");
  const outPath = new URL("../enrich-tags.generated.sql", import.meta.url);
  writeFileSync(outPath, sql);
  console.log(`\nWrote ${updates.length} UPDATEs -> ${outPath.pathname}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
