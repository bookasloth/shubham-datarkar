-- Threaded comments for support updates. Each comment is by a verified commenter
-- (email proven via OTP — see comment_verifications). The email is stored for
-- reply notifications + tier resolution but is PRIVATE: RLS denies all client
-- access, and the server strips the email column before returning rows to the
-- page. parent_id gives unbounded threading; the UI caps the visual indent.
-- Reuses public.support_updates(code). Target: your OWN Supabase project.
-- Run manually.

create table if not exists public.support_comments (
  id          uuid primary key default gen_random_uuid(),
  update_code text not null references public.support_updates(code) on delete cascade,
  parent_id   uuid references public.support_comments(id) on delete cascade,
  name        text not null,
  email       text not null,
  tier        text,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists support_comments_code_idx
  on public.support_comments (update_code, created_at);
create index if not exists support_comments_parent_idx
  on public.support_comments (parent_id);

alter table public.support_comments enable row level security;
-- No policy on purpose: only the service-role client (RLS bypass) reads/writes,
-- and it strips the email column before returning rows to the browser.
revoke all on public.support_comments from anon, authenticated;
