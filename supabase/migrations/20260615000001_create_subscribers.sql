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
