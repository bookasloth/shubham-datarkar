// Emits a non-destructive backfill that merges each entity's `seo` block into
// the DB `data` JSONB for services / products / case_studies. The content seed
// uses `on conflict do nothing`, so existing rows never pick up new fields on a
// re-seed — this patches them in place. `data || jsonb` merges at the top level;
// the `not (data ? 'seo')` guard makes it idempotent and never overwrites a
// seo block a human already entered in the admin.
import { services } from "../src/lib/data/services.ts";
import { products } from "../src/lib/data/products.ts";
import { caseStudies } from "../src/lib/data/case-studies.ts";
import fs from "node:fs";

const lit = (obj) => `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;

function rows(table, list) {
  const stmts = list
    .filter((r) => r.seo)
    .map(
      (r) =>
        `update public.${table} set data = data || ${lit({ seo: r.seo })} ` +
        `where slug = '${r.slug}' and not (data ? 'seo');`,
    );
  return `-- ${table}: ${stmts.length} rows\n${stmts.join("\n")}`;
}

const out = `-- Backfill per-entity SEO copy into existing content rows.
-- Non-destructive: JSONB-merges a "seo" key; skips any row that already has one.
-- Safe to run more than once. Run AFTER deploying the code that reads seo.
-- Tools are static (no DB) and need no backfill.

${rows("services", services)}

${rows("products", products)}

${rows("case_studies", caseStudies)}
`;

fs.writeFileSync("supabase/seed/backfill_content_seo.sql", out);
console.log("wrote supabase/seed/backfill_content_seo.sql");
