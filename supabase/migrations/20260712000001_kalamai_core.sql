-- KalamAI: SEO/AEO/GEO content research + writing tool.
-- Gated module under /tools/kalamai. The analysis/article rows ARE the job
-- queue and the usage ledger in one — there is no separate ledger table, and
-- quota counts rows where status <> 'failed' (a failure IS the refund).

-- ============ quotas ============
-- Monthly limits keyed on the resolved role (see resolveKalamaiRole).
-- -1 = unlimited. Free members (signed-in, no membership) land on 'member'.
create table if not exists public.kalamai_quotas (
  role text primary key,
  analyses_limit int not null,
  articles_limit int not null
);

insert into public.kalamai_quotas (role, analyses_limit, articles_limit) values
  ('guest',   0,  0),
  ('member',  3,  1),
  ('premium', 30, 15),
  ('founder', 50, 25),
  ('admin',  -1, -1)
on conflict (role) do nothing;

-- ============ analyses (job + ledger row) ============
create table if not exists public.kalamai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  country text not null default 'IN',
  locale text not null default 'en',          -- language/region code (dedupe key)
  status text not null default 'queued'
    check (status in ('queued','crawling','extracting','analyzing','complete','failed')),
  progress int not null default 0,             -- 0..100, derived, stored for cheap polling
  crawl_cursor int not null default 0,         -- next index into serp_urls; the batch state machine
  serp_urls jsonb not null default '[]'::jsonb,        -- ordered top-30 organic URLs
  ai_overview_urls jsonb not null default '[]'::jsonb, -- cited-URL set (drives the 1.3x term weight)
  paa jsonb not null default '[]'::jsonb,              -- People Also Ask questions
  report jsonb,                                -- final brief (R4 output)
  low_confidence boolean not null default false,       -- < 20 successful crawls
  crawl_success_rate numeric(4,3),             -- logged so a rescue provider is a data decision
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- ponytail: no serp_raw / body_text columns. Extracted URLs + text are used
  --   in-memory and discarded. Add serp_raw back only if re-run debugging needs it.
);

create index if not exists kalamai_analyses_user_idx on public.kalamai_analyses (user_id, created_at desc);
create index if not exists kalamai_analyses_watchdog_idx on public.kalamai_analyses (status, updated_at);

drop trigger if exists kalamai_analyses_touch on public.kalamai_analyses;
create trigger kalamai_analyses_touch before update on public.kalamai_analyses
  for each row execute function public.touch_updated_at();

-- ============ crawled pages (R2/R3 input) ============
create table if not exists public.kalamai_pages (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.kalamai_analyses(id) on delete cascade,
  url text not null,
  rank int not null,
  ok boolean not null default false,           -- crawl succeeded
  title text,
  meta_description text,
  headings jsonb,                              -- ordered tree [{level, text}]
  word_count int,
  jsonld_types text[],                         -- schema @types found on the page
  ai_overview_cited boolean not null default false,
  created_at timestamptz not null default now(),
  unique (analysis_id, url)                     -- makes crawl-batch retries idempotent
);

-- ============ articles (writing job + ledger row) ============
create table if not exists public.kalamai_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid references public.kalamai_analyses(id) on delete set null,
  params jsonb not null default '{}'::jsonb,   -- word count, tone, audience, brand facts
  status text not null default 'queued'
    check (status in ('queued','outlining','drafting','reviewing','rewriting','scoring','complete','failed')),
  progress int not null default 0,
  stage_state jsonb not null default '{}'::jsonb, -- carries outline/draft/critique across step pokes
  blocks jsonb,                                -- final ContentBlock[]
  meta jsonb,                                  -- {title, description, faq, jsonld}
  score jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kalamai_articles_user_idx on public.kalamai_articles (user_id, created_at desc);
create index if not exists kalamai_articles_status_idx on public.kalamai_articles (user_id, status);

drop trigger if exists kalamai_articles_touch on public.kalamai_articles;
create trigger kalamai_articles_touch before update on public.kalamai_articles
  for each row execute function public.touch_updated_at();

-- ============ per-call token/cost log (cost dashboard source) ============
create table if not exists public.kalamai_llm_calls (
  id bigint generated always as identity primary key,
  analysis_id uuid references public.kalamai_analyses(id) on delete set null,
  article_id uuid references public.kalamai_articles(id) on delete set null,
  user_id uuid,
  stage text not null,                         -- 'R4','W1'..'W4'
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd numeric(10,6) not null default 0,
  ms int,                                       -- wall-clock, for the Hobby-ceiling watch
  created_at timestamptz not null default now()
);

create index if not exists kalamai_llm_calls_time_idx on public.kalamai_llm_calls (created_at desc);

-- ============ analytics events (mirrors resource_events) ============
create table if not exists public.kalamai_events (
  id bigint generated always as identity primary key,
  event text not null check (event in (
    'analysis_created','analysis_completed','analysis_failed',
    'article_created','article_completed','article_failed',
    'export','quota_hit','teaser_viewed'
  )),
  analysis_id uuid,
  article_id uuid,
  user_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kalamai_events_kind_idx on public.kalamai_events (event, created_at desc);

-- ============ capability seed ============
-- Both paid plans get use_kalamai. Free members are gated by resolved role +
-- kalamai_quotas, not by this capability (they hold no capabilities at all).
insert into public.plan_capabilities (plan_key, capability)
select p.key, 'use_kalamai'
from (values ('premium-monthly'), ('premium-yearly')) as p(key)
on conflict (plan_key, capability) do nothing;

-- ============ RLS ============
alter table public.kalamai_quotas enable row level security;
alter table public.kalamai_analyses enable row level security;
alter table public.kalamai_pages enable row level security;
alter table public.kalamai_articles enable row level security;
alter table public.kalamai_llm_calls enable row level security;
alter table public.kalamai_events enable row level security;

-- quotas: public read, admin write
create policy kalamai_quotas_public_read on public.kalamai_quotas
  for select to anon, authenticated using (true);
create policy kalamai_quotas_admin_all on public.kalamai_quotas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- analyses/articles: self read + admin read; all writes via service role only
create policy kalamai_analyses_self_read on public.kalamai_analyses
  for select to authenticated using (auth.uid() = user_id);
create policy kalamai_analyses_admin_read on public.kalamai_analyses
  for select to authenticated using (public.is_admin());
create policy kalamai_articles_self_read on public.kalamai_articles
  for select to authenticated using (auth.uid() = user_id);
create policy kalamai_articles_admin_read on public.kalamai_articles
  for select to authenticated using (public.is_admin());

-- kalamai_pages, kalamai_llm_calls, kalamai_events: no client policies (service-role only)
