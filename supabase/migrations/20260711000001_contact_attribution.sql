-- First-touch attribution on contact submissions.
-- All nullable: rows written before this migration, and visitors with
-- localStorage disabled, legitimately have no attribution.
alter table public.contacts
  add column if not exists first_landing_page text,
  add column if not exists referrer          text,
  add column if not exists ai_source         text,
  add column if not exists utm_source        text,
  add column if not exists utm_medium        text,
  add column if not exists utm_campaign      text,
  add column if not exists pages_seen        integer;

-- The two questions this table now has to answer fast:
--   "which page produces retainer leads?"  and  "did AI send them?"
create index if not exists contacts_first_landing_page_idx on public.contacts (first_landing_page);
create index if not exists contacts_ai_source_idx on public.contacts (ai_source) where ai_source is not null;
