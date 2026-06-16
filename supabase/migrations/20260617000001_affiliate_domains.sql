-- Affiliate domain allowlist (non-secret config). Links in article content
-- pointing at these domains render as affiliate (Sponsored + rel=sponsored).
-- Target: your OWN Supabase project. Run manually.

create table if not exists public.affiliate_domains (
  id         uuid primary key default gen_random_uuid(),
  domain     text not null unique,
  created_at timestamptz not null default now()
);

-- Seed with the previous hardcoded defaults.
insert into public.affiliate_domains (domain)
values ('amzn.to'), ('amazon.in'), ('amazon.com')
on conflict (domain) do nothing;

alter table public.affiliate_domains enable row level security;

-- Authenticated admins read. Writes + the public render path go through the
-- service-role client (RLS bypass); no public/anon policy.
drop policy if exists affiliate_domains_authenticated_read on public.affiliate_domains;
create policy affiliate_domains_authenticated_read
  on public.affiliate_domains
  for select
  to authenticated
  using (true);
