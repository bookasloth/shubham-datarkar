-- ============================================================
-- FULL SCHEMA SETUP — Shubham's OWN Supabase (ref oyzzgjrefkppqkxjccot)
-- NOT the BAS project. Paste whole file into Supabase SQL editor, Run once.
-- Idempotent (IF NOT EXISTS / OR REPLACE) — safe to re-run.
-- ============================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: supabase/migrations/20260614000001_create_supports.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Support module: persisted supports + public-safe derived views.
-- Target project: Shubham's OWN Supabase (ref oyzzgjrefkppqkxjccot). NOT the BAS project.
-- Apply via your own project's SQL editor or `supabase db push`.

-- digest() (used by support_lifetime.supporter_key) lives in pgcrypto.
create extension if not exists pgcrypto;

-- =====================================================================
-- Table: supports
-- One row per support attempt. Created 'pending' by the session route,
-- flipped to 'paid'/'failed' by the Zoho webhook. Service-role writes only.
-- =====================================================================
create table if not exists public.supports (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- supporter-provided
  name            text,                       -- optional display name
  email           text not null,              -- receipt; NEVER exposed publicly
  message         text,                       -- <=250 chars (enforced below)

  -- items
  coffee_units    integer not null default 0 check (coffee_units >= 0),
  toffee_units    integer not null default 0 check (toffee_units >= 0),

  -- money (INR, whole rupees but numeric for safety)
  currency        text    not null default 'INR',
  base_amount     numeric(12,2) not null check (base_amount >= 0),  -- display total
  fee_amount      numeric(12,2) not null default 0 check (fee_amount >= 0),
  total_amount    numeric(12,2) not null check (total_amount >= 0),  -- charged
  covers_fee      boolean not null default true,
  anonymous       boolean not null default false,

  -- lifecycle
  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'failed')),
  zoho_session_id text,
  zoho_payment_id text,

  constraint supports_message_len check (message is null or char_length(message) <= 250),
  constraint supports_has_units   check (coffee_units > 0 or toffee_units > 0)
);

comment on table public.supports is
  'Creator supports (Coffees/Toffees). Public reads go through views only; base table is service-role write + locked from anon/auth.';

-- Indexes for the derived reads (wall, strip, stats grouped by email).
create index if not exists supports_paid_created_idx
  on public.supports (created_at desc) where status = 'paid';
create index if not exists supports_paid_email_idx
  on public.supports (email) where status = 'paid';
create unique index if not exists supports_zoho_session_idx
  on public.supports (zoho_session_id) where zoho_session_id is not null;

-- =====================================================================
-- RLS: lock the base table. No anon/authenticated policies => no access.
-- The service-role key bypasses RLS, so the server routes can read/write.
-- Public reads are served exclusively by the views below.
-- =====================================================================
alter table public.supports enable row level security;
-- (intentionally no CREATE POLICY: anon + authenticated get zero rows)

-- =====================================================================
-- View: public_supporters
-- Paid rows, anonymized. Email never selected. Name hidden when anonymous.
-- Owned by the migration role => bypasses base-table RLS, exposing only
-- these safe columns. Newest first.
-- =====================================================================
create or replace view public.public_supporters as
select
  id,
  created_at,
  case when anonymous then null else name end as name,
  coffee_units,
  toffee_units,
  base_amount,
  total_amount,
  anonymous
from public.supports
where status = 'paid'
order by created_at desc;

comment on view public.public_supporters is
  'Public-safe paid supporters. No email; name nulled when anonymous.';

-- =====================================================================
-- View: support_lifetime
-- Per-supporter lifetime totals (grouped by email) for tier computation.
-- Email is the grouping key but is NOT exposed; a stable anonymous hash is.
-- =====================================================================
create or replace view public.support_lifetime as
select
  encode(digest(lower(email), 'sha256'), 'hex') as supporter_key,
  max(case when anonymous then null else name end) as name,
  sum(total_amount)  as lifetime_amount,
  sum(coffee_units)  as lifetime_coffees,
  sum(toffee_units)  as lifetime_toffees,
  count(*)           as support_count,
  max(created_at)    as last_supported_at,
  bool_and(anonymous) as anonymous
from public.supports
where status = 'paid'
group by lower(email);

comment on view public.support_lifetime is
  'Per-supporter lifetime aggregates for tiers. Keyed by sha256(email); email itself never exposed.';

-- =====================================================================
-- View: support_stats
-- Single-row headline metrics for the StatsBar.
-- =====================================================================
create or replace view public.support_stats as
select
  count(distinct lower(email))           as supporters_total,
  coalesce(sum(coffee_units), 0)         as coffees_total,
  coalesce(sum(toffee_units), 0)         as toffees_total,
  coalesce(sum(total_amount), 0)         as raised_total
from public.supports
where status = 'paid';

comment on view public.support_stats is
  'Headline metrics derived from paid supports.';

-- Public read access to the derived views only.
grant select on public.public_supporters to anon, authenticated;
grant select on public.support_lifetime  to anon, authenticated;
grant select on public.support_stats      to anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: supabase/migrations/20260614000002_admin_auth.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Admin gate for RLS across content tables (posts, etc.).
-- Single-admin model: allowlist one email.
-- IMPORTANT: the email literal below must match your admin Auth user's email.
-- Target: your OWN Supabase project (NOT the BAS project). Run manually in the SQL editor.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') = 'bookasloth@gmail.com', false);
$$;

comment on function public.is_admin() is
  'True when the current authenticated user is the site admin. Used by RLS policies on content tables.';

grant execute on function public.is_admin() to anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: supabase/migrations/20260614000003_create_posts.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Blog posts. body = ContentBlock[] (jsonb), unchanged from the static shape.
-- Public visibility is time-based: published_at <= now(). Drafts have null
-- published_at; scheduled posts have a future published_at and appear automatically.
-- Target: your OWN Supabase project. Run manually in the SQL editor.

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  excerpt      text not null default '',
  category     text not null,
  tags         text[] not null default '{}',
  words        integer not null default 0 check (words >= 0),
  featured     boolean not null default false,
  body         jsonb not null default '[]'::jsonb,
  status       text not null default 'draft'
                 check (status in ('draft', 'published', 'scheduled')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.posts is
  'Blog posts. Public reads via RLS (published_at <= now()); admin full access via is_admin().';

create index if not exists posts_visible_idx
  on public.posts (published_at desc)
  where published_at is not null;
create index if not exists posts_category_idx on public.posts (category);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.posts enable row level security;

-- Public: only visible posts (published or past-scheduled).
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select
  to anon, authenticated
  using (published_at is not null and published_at <= now());

-- Admin: full read.
drop policy if exists posts_admin_read on public.posts;
create policy posts_admin_read on public.posts
  for select
  to authenticated
  using (public.is_admin());

-- Admin: write (insert/update/delete).
drop policy if exists posts_admin_write on public.posts;
create policy posts_admin_write on public.posts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: supabase/migrations/20260615000001_create_subscribers.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Newsletter subscribers. Anon can INSERT (signup); only admin can read.
-- Dedupe on lower(email). Target: your OWN Supabase project. Run manually.

create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  source     text,
  status     text not null default 'active' check (status in ('active', 'unsubscribed')),
  created_at timestamptz not null default now()
);

comment on table public.subscribers is
  'Newsletter signups. Anon insert only; admin read. Email deduped case-insensitively.';

create unique index if not exists subscribers_email_lower_idx
  on public.subscribers (lower(email));

alter table public.subscribers enable row level security;

-- Anon (and authed visitors) may sign up: INSERT only, no read.
drop policy if exists subscribers_public_insert on public.subscribers;
create policy subscribers_public_insert on public.subscribers
  for insert
  to anon, authenticated
  with check (true);

-- Admin: read all.
drop policy if exists subscribers_admin_read on public.subscribers;
create policy subscribers_admin_read on public.subscribers
  for select
  to authenticated
  using (public.is_admin());

-- Admin: update/delete (e.g. mark unsubscribed).
drop policy if exists subscribers_admin_write on public.subscribers;
create policy subscribers_admin_write on public.subscribers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant insert on public.subscribers to anon, authenticated;
grant select, update, delete on public.subscribers to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: supabase/migrations/20260615000002_create_content.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Content entities: case studies, projects, products, services, testimonials.
-- Uniform shape: the full typed object lives in `data` (jsonb), like posts.body.
-- Public reads = published rows; admin = full access via is_admin().
-- Reuses public.touch_updated_at() created in the posts migration.
-- Target: your OWN Supabase project. Run manually.

-- Generic builder, run per table below.
do $$
declare
  t text;
  tables text[] := array['case_studies', 'projects', 'products', 'services', 'testimonials'];
begin
  foreach t in array tables loop
    execute format($f$
      create table if not exists public.%I (
        id         uuid primary key default gen_random_uuid(),
        slug       text,
        data       jsonb not null default '{}'::jsonb,
        sort       integer not null default 0,
        published  boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    $f$, t);

    execute format(
      'create unique index if not exists %I on public.%I (slug) where slug is not null;',
      t || '_slug_idx', t);
    execute format(
      'create index if not exists %I on public.%I (sort);',
      t || '_sort_idx', t);

    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (published);',
      t || '_public_read', t);

    execute format('drop policy if exists %I on public.%I;', t || '_admin_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_admin());',
      t || '_admin_read', t);

    execute format('drop policy if exists %I on public.%I;', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
      t || '_admin_write', t);

    execute format('grant select on public.%I to anon, authenticated;', t);
    execute format('grant insert, update, delete on public.%I to authenticated;', t);

    execute format('drop trigger if exists %I on public.%I;', t || '_touch_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at();',
      t || '_touch_updated_at', t);
  end loop;
end $$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: supabase/migrations/20260615000003_supports_admin_read.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Admin read access to the supports base table (for the payments dashboard).
-- Public still reads only the email-free views; this grants the authenticated
-- admin full row access (incl. email + pending/failed) via is_admin().
-- Target: your OWN Supabase project. Run manually.

grant select on public.supports to authenticated;

drop policy if exists supports_admin_read on public.supports;
create policy supports_admin_read on public.supports
  for select
  to authenticated
  using (public.is_admin());

