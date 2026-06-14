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
