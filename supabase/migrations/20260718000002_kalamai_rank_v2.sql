-- KalamAI v2 (rank/search/distill/corpus) schema.
-- Adds: pgvector, weekly SERP cache, fail-closed rupee+SERP budget ledgers,
-- persistent labeled corpus, chunk embeddings, cached log-odds term signals,
-- versioned rank model, score-snapshot drift history. Extends kalamai_quotas
-- (rupee + daily caps) and the quota RPC. Idempotent; safe to re-run.
--
-- Economics [Q11]: KalamAI is member-facing with ZERO per-article revenue, so
-- quota is denominated in rupees of LLM spend and enforced fail-closed at both
-- global and per-user level. Count caps are kept as a secondary ceiling.

create extension if not exists vector;

-- ============ quota columns [C, Q7/Q11] ============
-- monthly_spend_inr_limit is the PRIMARY economic gate (-1 = unlimited).
-- analyses_daily_limit is a coarse per-day rate guard.
alter table public.kalamai_quotas
  add column if not exists monthly_spend_inr_limit numeric not null default 0,
  add column if not exists analyses_daily_limit int not null default 0;

-- Seeds are ILLUSTRATIVE — calibrate against real kalamai_llm_calls logs, not guesses.
-- Free member ~= 1-2 analyses/mo (brief ~= Rs.10 each). ceiling counts kept from _core.
update public.kalamai_quotas set monthly_spend_inr_limit = 0,    analyses_daily_limit = 0  where role = 'guest';
update public.kalamai_quotas set monthly_spend_inr_limit = 30,   analyses_daily_limit = 1  where role = 'member';
update public.kalamai_quotas set monthly_spend_inr_limit = 400,  analyses_daily_limit = 15 where role = 'premium';
update public.kalamai_quotas set monthly_spend_inr_limit = 800,  analyses_daily_limit = 25 where role = 'founder';
update public.kalamai_quotas set monthly_spend_inr_limit = -1,   analyses_daily_limit = -1 where role = 'admin';

-- ============ weekly SERP cache [C, Q7A] ============
-- cache_key = lower(keyword)|language|country|ISO-week. TTL = bucket rollover.
create table if not exists public.kalamai_serp_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  keyword text not null,
  language text not null,
  country text not null,
  week_bucket text not null,          -- ISO year-week, e.g. 2026-W29
  serp jsonb not null,                -- {organic[], paa[], aiOverviewUrls[]}
  source text not null default 'dataforseo',
  fetched_at timestamptz not null default now()
);

-- ============ budget ledgers (fail-closed) [C, Q7/Q11] ============
-- One global row per month. serp_cap in CALLS (Rs.2000 / Rs.0.25 = 8000).
-- llm_cap_inr in RUPEES (PLACEHOLDER 5000 -- owner sign-off + calibrate).
create table if not exists public.kalamai_global_budget (
  month_bucket text primary key,      -- YYYY-MM
  serp_calls int not null default 0,
  serp_cap int not null default 8000,
  llm_spend_inr numeric not null default 0,
  llm_cap_inr numeric not null default 5000
);

create table if not exists public.kalamai_user_budget (
  user_id uuid not null,
  month_bucket text not null,         -- YYYY-MM
  llm_spend_inr numeric not null default 0,
  primary key (user_id, month_bucket)
);

-- ============ persistent labeled background corpus [D8] ============
create table if not exists public.kalamai_corpus_pages (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  language text not null,
  country text not null,
  keyword_seed text not null,
  serp_rank int,
  is_positive boolean,                -- rank<=10 true; 30-100 false; adjacent null
  ok boolean not null default false,
  title text,
  meta_description text,
  headings jsonb,
  body_text text,
  word_count int,
  jsonld_types text[],
  junk_ratio numeric(4,3),            -- extraction QA (risk 2)
  fetched_at timestamptz not null default now()
);
create index if not exists kalamai_corpus_lang_idx on public.kalamai_corpus_pages (language, country);
create index if not exists kalamai_corpus_label_idx on public.kalamai_corpus_pages (is_positive);

-- ============ chunk embeddings [C, Q4 model pinning] ============
create table if not exists public.kalamai_chunks (
  id bigint generated always as identity primary key,
  source_type text not null check (source_type in ('corpus','competitor','draft')),
  corpus_page_id uuid references public.kalamai_corpus_pages(id) on delete cascade,
  analysis_id uuid references public.kalamai_analyses(id) on delete cascade,
  article_id uuid references public.kalamai_articles(id) on delete cascade,
  chunk_index int not null,
  text text not null,
  token_count int not null,
  embedding vector(768),              -- text-embedding-004 = 768 dims
  embedding_model text not null,      -- pinned per row; model change invalidates vectors
  created_at timestamptz not null default now()
);
create index if not exists kalamai_chunks_analysis_idx on public.kalamai_chunks (analysis_id);
create index if not exists kalamai_chunks_corpus_idx on public.kalamai_chunks (corpus_page_id);
create index if not exists kalamai_chunks_article_idx on public.kalamai_chunks (article_id);
-- ANN index; any vector search MUST also carry a WHERE filter + LIMIT (unbounded = full corpus scan).
create index if not exists kalamai_chunks_embedding_idx on public.kalamai_chunks
  using hnsw (embedding vector_cosine_ops);

-- ============ cached per-analysis log-odds term signals [C, Q12] ============
-- Written once at distill (R3); every rescore reads this instead of recomputing corpus.
create table if not exists public.kalamai_term_signals (
  id bigint generated always as identity primary key,
  analysis_id uuid not null references public.kalamai_analyses(id) on delete cascade,
  term text not null,
  ngram int not null,
  z numeric,                          -- weighted log-odds z-score
  delta numeric,                      -- log-odds ratio
  doc_freq int not null,              -- competitors containing term
  coverage numeric not null,          -- doc_freq / n_competitors (>= 0.60 to be here)
  freq_lo numeric,                    -- Q1 * L/1000 target count
  freq_hi numeric,                    -- Q3 * L/1000 target count
  created_at timestamptz not null default now(),
  unique (analysis_id, term)
);
create index if not exists kalamai_term_signals_analysis_idx on public.kalamai_term_signals (analysis_id);

-- ============ versioned rank model + calibration [C, Q9] ============
create table if not exists public.kalamai_rank_model (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  kind text not null check (kind in ('learned','hand_tuned')),
  feature_names text[] not null,
  coefficients numeric[] not null,
  feature_means numeric[],            -- standardization
  feature_stds numeric[],
  intercept numeric not null,
  platt_a numeric,
  platt_b numeric,
  auc numeric,
  auc_no_wordcount numeric,
  wordcount_corr numeric,
  trained_at timestamptz,
  active boolean not null default false,
  notes text
);
create index if not exists kalamai_rank_model_active_idx on public.kalamai_rank_model (active);

-- ============ score snapshots (drift + both scorers + score-at-publish) [C, Q12/Q13] ============
create table if not exists public.kalamai_score_snapshots (
  id bigint generated always as identity primary key,
  article_id uuid references public.kalamai_articles(id) on delete cascade,
  analysis_id uuid references public.kalamai_analyses(id) on delete set null,
  user_id uuid,
  scorer text not null check (scorer in ('v1_checklist','v2_rank')),
  model_version int,
  overall int not null,
  features jsonb,
  subscores jsonb,
  word_count int,
  at_publish boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists kalamai_snap_article_idx on public.kalamai_score_snapshots (article_id, created_at desc);
create index if not exists kalamai_snap_user_idx on public.kalamai_score_snapshots (user_id, created_at desc);
create index if not exists kalamai_snap_publish_idx on public.kalamai_score_snapshots (article_id) where at_publish;

-- ============ budget RPCs (service-role only) ============

-- Atomic fail-closed SERP reservation. Returns new call count, or -1 if over cap.
create or replace function public.kalamai_reserve_serp_call(p_month text)
returns int language plpgsql security definer set search_path = public as $$
declare v_calls int;
begin
  insert into kalamai_global_budget (month_bucket) values (p_month)
    on conflict (month_bucket) do nothing;
  update kalamai_global_budget
    set serp_calls = serp_calls + 1
    where month_bucket = p_month and serp_calls < serp_cap
    returning serp_calls into v_calls;
  return coalesce(v_calls, -1);       -- null = no row matched = over cap
end $$;

-- Record actual LLM spend (rupees) into both global + per-user ledgers.
create or replace function public.kalamai_record_llm_spend(p_user uuid, p_month text, p_inr numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into kalamai_global_budget (month_bucket) values (p_month)
    on conflict (month_bucket) do nothing;
  update kalamai_global_budget set llm_spend_inr = llm_spend_inr + p_inr
    where month_bucket = p_month;
  insert into kalamai_user_budget (user_id, month_bucket, llm_spend_inr)
    values (p_user, p_month, p_inr)
    on conflict (user_id, month_bucket)
    do update set llm_spend_inr = kalamai_user_budget.llm_spend_inr + excluded.llm_spend_inr;
end $$;

revoke execute on function public.kalamai_reserve_serp_call(text) from public, anon, authenticated;
revoke execute on function public.kalamai_record_llm_spend(uuid, text, numeric) from public, anon, authenticated;

-- ============ extended quota RPC: + daily guard + rupee gate ============
-- Order: dedupe -> concurrency -> daily -> hourly -> GLOBAL rupee (at_capacity)
--        -> USER rupee (quota_exceeded) -> count ceiling (quota_exceeded) -> insert.
create or replace function public.kalamai_check_and_consume(
  p_user        uuid,
  p_role        text,
  p_kind        text,
  p_keyword     text default null,
  p_country     text default null,
  p_locale      text default null,
  p_analysis_id uuid default null
) returns table (id uuid, outcome text)
language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_used  int;
  v_conc  int;
  v_hour  int;
  v_day   int;
  v_daily int;
  v_hit   uuid;
  v_month text := to_char(now(), 'YYYY-MM');
  v_spend_cap numeric;
  v_spend numeric;
  v_g_spend numeric;
  v_g_cap numeric;
begin
  perform pg_advisory_xact_lock(hashtext('kalamai:' || p_user::text));

  -- Rupee caps apply to both kinds (both spend LLM tokens).
  select monthly_spend_inr_limit, analyses_daily_limit
    into v_spend_cap, v_daily from kalamai_quotas where role = p_role;
  v_spend_cap := coalesce(v_spend_cap, 0);
  v_daily := coalesce(v_daily, 0);

  -- Global LLM cap (fail closed) -> at_capacity (not the user's fault, no upsell).
  select llm_spend_inr, llm_cap_inr into v_g_spend, v_g_cap
    from kalamai_global_budget where month_bucket = v_month;
  if v_g_cap is not null and v_g_cap >= 0 and coalesce(v_g_spend,0) >= v_g_cap then
    outcome := 'at_capacity'; return next; return;
  end if;

  -- Per-user rupee cap (fail closed) -> quota_exceeded (drives upgrade prompt).
  if v_spend_cap = 0 then outcome := 'quota_exceeded'; return next; return; end if;
  if v_spend_cap > 0 then
    select llm_spend_inr into v_spend from kalamai_user_budget
      where user_id = p_user and month_bucket = v_month;
    if coalesce(v_spend,0) >= v_spend_cap then
      outcome := 'quota_exceeded'; return next; return;
    end if;
  end if;

  if p_kind = 'analysis' then
    select a.id into v_hit from kalamai_analyses a
    where a.user_id = p_user
      and lower(a.keyword) = lower(coalesce(p_keyword, ''))
      and a.country = coalesce(p_country, 'IN')
      and a.locale = coalesce(p_locale, 'en')
      and a.status <> 'failed'
      and a.created_at > now() - interval '10 minutes'
    order by a.created_at desc limit 1;
    if v_hit is not null then id := v_hit; outcome := 'deduped'; return next; return; end if;

    select count(*) into v_conc from kalamai_analyses
      where user_id = p_user and status in ('queued','crawling','extracting','analyzing');
    if v_conc >= 3 then outcome := 'too_many_concurrent'; return next; return; end if;

    -- Daily guard [C, Q7B].
    if v_daily >= 0 then
      select count(*) into v_day from kalamai_analyses
        where user_id = p_user and created_at >= date_trunc('day', now());
      if v_day >= v_daily then outcome := 'rate_limited'; return next; return; end if;
    end if;

    select count(*) into v_hour from kalamai_analyses
      where user_id = p_user and created_at > now() - interval '1 hour';
    if v_hour >= 10 then outcome := 'rate_limited'; return next; return; end if;

    -- Count ceiling (secondary; rupee gate is primary).
    select analyses_limit into v_limit from kalamai_quotas where role = p_role;
    v_limit := coalesce(v_limit, 0);
    if v_limit = 0 then outcome := 'quota_exceeded'; return next; return; end if;
    if v_limit > 0 then
      select count(*) into v_used from kalamai_analyses
        where user_id = p_user and status <> 'failed'
          and created_at >= date_trunc('month', now());
      if v_used >= v_limit then outcome := 'quota_exceeded'; return next; return; end if;
    end if;

    insert into kalamai_analyses (user_id, keyword, country, locale)
      values (p_user, p_keyword, coalesce(p_country,'IN'), coalesce(p_locale,'en'))
      returning kalamai_analyses.id into id;
    outcome := 'created'; return next; return;

  else
    select count(*) into v_conc from kalamai_articles
      where user_id = p_user and status not in ('complete','failed');
    if v_conc >= 3 then outcome := 'too_many_concurrent'; return next; return; end if;

    select count(*) into v_hour from kalamai_articles
      where user_id = p_user and created_at > now() - interval '1 hour';
    if v_hour >= 10 then outcome := 'rate_limited'; return next; return; end if;

    select articles_limit into v_limit from kalamai_quotas where role = p_role;
    v_limit := coalesce(v_limit, 0);
    if v_limit = 0 then outcome := 'quota_exceeded'; return next; return; end if;
    if v_limit > 0 then
      select count(*) into v_used from kalamai_articles
        where user_id = p_user and status <> 'failed'
          and created_at >= date_trunc('month', now());
      if v_used >= v_limit then outcome := 'quota_exceeded'; return next; return; end if;
    end if;

    insert into kalamai_articles (user_id, analysis_id)
      values (p_user, p_analysis_id)
      returning kalamai_articles.id into id;
    outcome := 'created'; return next; return;
  end if;
end $$;

revoke execute on function public.kalamai_check_and_consume(uuid, text, text, text, text, text, uuid)
  from public, anon, authenticated;

-- ============ RLS ============
alter table public.kalamai_serp_cache      enable row level security;
alter table public.kalamai_global_budget   enable row level security;
alter table public.kalamai_user_budget     enable row level security;
alter table public.kalamai_corpus_pages    enable row level security;
alter table public.kalamai_chunks          enable row level security;
alter table public.kalamai_term_signals    enable row level security;
alter table public.kalamai_rank_model      enable row level security;
alter table public.kalamai_score_snapshots enable row level security;

-- All new tables service-role only (no policy) EXCEPT score_snapshots self-read.
drop policy if exists kalamai_snap_self_read on public.kalamai_score_snapshots;
create policy kalamai_snap_self_read on public.kalamai_score_snapshots
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists kalamai_snap_admin_read on public.kalamai_score_snapshots;
create policy kalamai_snap_admin_read on public.kalamai_score_snapshots
  for select to authenticated using (public.is_admin());
