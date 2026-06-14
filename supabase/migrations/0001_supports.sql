-- Migration 0001 — support module: supports table, RLS, public read views.
-- Run in Supabase SQL editor (Shubham's OWN project, ref oyzzgjrefkppqkxjccot).
-- Safe to re-run (idempotent where possible).

-- ───────────────────────────── table ─────────────────────────────
-- One row per support attempt. Server inserts as 'pending', webhook
-- flips to 'paid'/'failed'. Money columns store INR amounts.
create table if not exists public.supports (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text,
  email           text not null,
  message         text,
  coffee_units    int not null default 0 check (coffee_units >= 0),
  toffee_units    int not null default 0 check (toffee_units >= 0),
  currency        text not null default 'INR',
  base_amount     numeric not null check (base_amount >= 0),   -- displayed support total
  fee_amount      numeric not null default 0 check (fee_amount >= 0), -- cover-fee delta
  total_amount    numeric not null check (total_amount >= 0),  -- amount actually charged
  covers_fee      boolean not null default true,
  anonymous       boolean not null default false,
  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'failed')),
  zoho_session_id text,
  zoho_payment_id text
);

create index if not exists supports_status_created_idx
  on public.supports (status, created_at desc);
create index if not exists supports_email_idx
  on public.supports (lower(email));

-- ───────────────────────────── RLS ──────────────────────────────
-- Lock the base table completely. No policies for anon/authenticated
-- means default-deny — the public can never read raw rows (so email is
-- never exposed). The server uses the service-role key, which bypasses
-- RLS, for all inserts/updates.
alter table public.supports enable row level security;

-- ────────────────────── public read views ───────────────────────
-- security_invoker = off (definer): these run as the view owner and
-- read past the base-table RLS, but only expose curated, email-free
-- columns. This is the intended public surface for the support pages.

-- Recent supporters strip — latest paid supports. Name hidden if anonymous.
create or replace view public.public_supports_recent
  with (security_invoker = off) as
select
  id,
  created_at,
  case when anonymous then null else name end as display_name,
  coffee_units,
  toffee_units,
  total_amount,
  currency
from public.supports
where status = 'paid'
order by created_at desc;

-- Tier wall — lifetime totals per supporter, grouped by email.
-- Email is NOT selected; supporter_key is an opaque hash for React keys.
-- display_name shows a real name only if the supporter ever gave non-anon.
create or replace view public.public_supporter_tiers
  with (security_invoker = off) as
select
  md5(lower(email))                               as supporter_key,
  case when bool_and(anonymous) then null
       else max(name) filter (where not anonymous) end as display_name,
  sum(total_amount)                               as lifetime_amount,
  sum(coffee_units)                               as coffee_units,
  sum(toffee_units)                               as toffee_units,
  max(created_at)                                 as last_supported_at,
  count(*)                                        as support_count
from public.supports
where status = 'paid'
group by lower(email);

-- Headline stats — single row.
create or replace view public.public_support_stats
  with (security_invoker = off) as
select
  count(distinct lower(email))    as supporter_count,
  coalesce(sum(coffee_units), 0)  as coffees,
  coalesce(sum(toffee_units), 0)  as toffees,
  coalesce(sum(total_amount), 0)  as total_amount
from public.supports
where status = 'paid';

-- Expose the views (only) to the public PostgREST roles.
grant select on public.public_supports_recent  to anon, authenticated;
grant select on public.public_supporter_tiers  to anon, authenticated;
grant select on public.public_support_stats    to anon, authenticated;
