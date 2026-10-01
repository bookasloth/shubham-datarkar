-- Measurable consultation funnel: booking conversions + fuller paid attribution.
-- Target project: Shubham's OWN Supabase. NOT the BAS project.
-- Apply via your own project's SQL editor or `supabase db push`.

-- =====================================================================
-- 1. Extend contact attribution with the paid-click fields that make
--    Instagram Reels / Google Ads attribution possible.
-- =====================================================================
alter table public.contacts
  add column if not exists utm_content text,
  add column if not exists utm_term    text,
  add column if not exists fbclid      text,
  add column if not exists gclid       text;

-- =====================================================================
-- 2. Consultation bookings. Written server-side by the bookasloth webhook
--    (service-role); admin reads. One row per completed booking, keyed by the
--    scheduler's own id so retries don't double-count.
-- =====================================================================
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  external_id   text not null unique,        -- bookasloth booking id (idempotency)
  name          text,
  email         text,
  source        text,                        -- convenience: 'instagram', etc.
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  fbclid        text,
  gclid         text,
  landing_page  text,
  referrer      text,
  ai_source     text,
  booked_at     timestamptz,                 -- when the call is scheduled for
  event_id      text,                        -- shared Pixel/CAPI dedup id
  raw           jsonb                         -- full webhook payload, for audit
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
-- "how many bookings came from Instagram Reels?" → this index answers it fast.
create index if not exists bookings_utm_source_idx on public.bookings (utm_source) where utm_source is not null;

alter table public.bookings enable row level security;

-- Authenticated admin may read. No public/insert policy → writes are service-role only.
drop policy if exists "bookings_authenticated_read" on public.bookings;
create policy "bookings_authenticated_read"
  on public.bookings
  for select
  to authenticated
  using (true);
