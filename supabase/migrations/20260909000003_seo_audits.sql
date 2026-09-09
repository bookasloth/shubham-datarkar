-- Public SEO + AI-visibility audit tool: job rows + analytics events.
-- All writes go through service-role in the server routes; there are no anon
-- policies, so the tables are not reachable via PostgREST from the browser.
-- A specific audit is read back by the server route using its unguessable uuid.

create table if not exists public.seo_audits (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  domain text not null,
  status text not null default 'queued',        -- queued|discovering|crawling|scoring|ready|analyzing|complete|failed
  progress int not null default 0,
  report_status text not null default 'free',    -- free|unlocked
  locked_at timestamptz,
  page_budget int not null default 12,
  crawl_cursor int not null default 0,
  urls jsonb not null default '[]'::jsonb,        -- discovered {url,class,priority}[]
  pages jsonb not null default '[]'::jsonb,       -- crawled per-page signals
  scores jsonb,                                   -- {seo,ai,overall,color,categories}
  findings jsonb,                                 -- deterministic + (post-unlock) LLM findings
  report jsonb,                                   -- opportunities, topic map, action plan (post-unlock)
  email text,
  industry text,
  location text,
  page_count int,
  lead_score int,
  lead_bucket text,                               -- HOT|WARM|COLD
  crawl_ms int,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_audits_domain_idx on public.seo_audits (domain);
create index if not exists seo_audits_created_idx on public.seo_audits (created_at desc);

create table if not exists public.seo_audit_events (
  id bigint generated always as identity primary key,
  event text not null,                            -- audit_started|audit_completed|audit_failed|email_gate_viewed|email_submitted|report_generated|report_opened|cta_clicked
  audit_id uuid references public.seo_audits(id) on delete set null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seo_audit_events_audit_idx on public.seo_audit_events (audit_id);

alter table public.seo_audits enable row level security;
alter table public.seo_audit_events enable row level security;
-- Intentionally no policies: service-role bypasses RLS; anon/auth get nothing.
