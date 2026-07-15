-- =====================================================================
-- email_log — dedupe ledger for scheduled/branded emails (SP4 dispatcher).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- One row per (recipient, template_key, period) that has been sent. The
-- dispatcher claims a send by inserting first; a unique-violation (23505)
-- means it was already sent for that period, so the caller skips it. This
-- makes a re-run (or an overlapping cron invocation) safe without locks.
--
-- `period` is whatever granularity the template needs (a day "YYYY-MM-DD",
-- a month "YYYY-MM", an ISO week "YYYY-Www", etc. — see istParts()).
--
-- Table is fully locked (RLS on, no policies): only the service-role client
-- (supabaseAdmin, used by the cron route) ever touches it.
-- =====================================================================

create table if not exists public.email_log (
  id           bigint generated always as identity primary key,
  recipient    text not null,
  template_key text not null,
  period       text not null,
  created_at   timestamptz not null default now(),
  unique (recipient, template_key, period)
);

create index if not exists email_log_template_period_idx
  on public.email_log (template_key, period);

alter table public.email_log enable row level security;
-- No policies on purpose — service-role only (bypasses RLS).
