-- Seed case study: Everything Powerlifting (D2C strength gear, content-led SEO).
-- Public case-study pages read from public.case_studies (data jsonb).
-- Metrics are from Semrush (Oct 2025 -> Jul 2026 snapshots). No client quote yet.
-- Target: your OWN Supabase project. Run manually. Idempotent on slug.

insert into public.case_studies (slug, data, sort, published)
values (
  'everything-powerlifting-seo',
  $json$
  {
    "slug": "everything-powerlifting-seo",
    "client": "Everything Powerlifting",
    "sector": "D2C · Strength Gear",
    "title": "Tripling organic traffic for a powerlifting-gear brand",
    "heroMetric": { "value": "3x", "label": "Organic traffic / month" },
    "context": {
      "industry": "D2C · Strength Gear",
      "timeline": "9 months",
      "budget": "Ongoing retainer",
      "services": ["SEO", "Content", "Funnel"]
    },
    "problem": "Everything Powerlifting made gear serious lifters wanted — but organic search barely knew it existed. ~290 visits a month, ~100 ranking keywords, and zero paid traffic meant growth depended entirely on organic they weren't capturing. The questions their athletes Googled mid-workout went to everyone else.",
    "constraints": [
      "A low-authority domain (Authority Score 9) in a competitive gear niche.",
      "No paid traffic — organic had to carry growth alone.",
      "Commercial product terms crowded by established retailers."
    ],
    "strategy": "Win the questions before the purchase. Build a content engine around what lifters actually search — squat pain, deadlift variations, workout math — then rank product pages for high-intent commercial terms and interlink readers into the shop.",
    "execution": [
      "Built a blog/news engine targeting lifter informational intent (squat pain, deadlift types, calories burned).",
      "Optimised product pages for commercial head terms — 'deadlift shoes', 'squat shoes'.",
      "Interlinked informational articles into matching product pages to convert readers.",
      "Added schema and technical fixes to win image and rich-result SERP features."
    ],
    "results": [
      { "kpi": "Organic traffic / mo", "before": "292", "after": "889", "delta": "+205%" },
      { "kpi": "Organic keywords", "before": "100", "after": "887", "delta": "9x" },
      { "kpi": "Ranking keywords tracked", "before": "18", "after": "80", "delta": "+344%" },
      { "kpi": "'deadlift shoes' (2.9K vol)", "before": "#5", "after": "#2", "delta": "Top 2" }
    ],
    "learnings": "Informational content — the questions lifters ask mid-set — built the top-of-funnel that product-page SEO alone never could. Interlinking turned those readers into shoppers. AI engines followed too: cited pages nearly tripled (42 → 123) as the library grew.",
    "featured": true,
    "seo": {
      "title": "SEO Case Study: D2C Strength Gear (3x Organic Traffic)",
      "description": "How a powerlifting-gear brand tripled organic traffic (292 → 889/mo) and grew from 100 to 887 ranking keywords with a content-led SEO engine and product-page optimisation."
    }
  }
  $json$::jsonb,
  (select coalesce(max(sort), 0) + 1 from public.case_studies),
  true
)
on conflict (slug) where slug is not null do update
  set data = excluded.data,
      published = true;
