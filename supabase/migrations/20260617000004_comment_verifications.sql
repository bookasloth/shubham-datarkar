-- Transient OTP store for commenter email verification. Service-role only:
-- no anon/authenticated policy, so the OTP hash is never readable by clients.
-- One active OTP per email (pk on email). Target: your OWN Supabase project.
-- Run manually.

create table if not exists public.comment_verifications (
  email        text primary key,
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     int not null default 0,
  last_sent_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.comment_verifications enable row level security;
-- No policy on purpose: only the service-role client (RLS bypass) touches this.

revoke all on public.comment_verifications from anon, authenticated;
