-- Zoho Payments integration: encrypted credential storage + status metadata.
-- Target project: Shubham's OWN Supabase. NOT the BAS project.
-- Apply via your own project's SQL editor or `supabase db push`.
--
-- Secrets are stored encrypted in Supabase Vault (one JSON secret named
-- 'zoho_payments'), reachable ONLY through the service-role RPCs below.
-- The public.zoho_integration row holds non-secret status the admin UI reads.

-- Vault provides encrypted-at-rest secret storage.
create extension if not exists supabase_vault with schema vault cascade;

-- =====================================================================
-- Metadata: single-row table tracking mode + configured + last test.
-- No secret values here — only status the authenticated admin may read.
-- =====================================================================
create table if not exists public.zoho_integration (
  id                smallint primary key default 1,
  mode              text not null default 'sandbox' check (mode in ('sandbox', 'live')),
  configured        boolean not null default false,
  last_test_at      timestamptz,
  last_test_ok      boolean,
  last_test_message text,
  updated_at        timestamptz not null default now(),
  constraint zoho_integration_singleton check (id = 1)
);

insert into public.zoho_integration (id) values (1) on conflict (id) do nothing;

alter table public.zoho_integration enable row level security;

-- Authenticated admins may read status. No write policy exists, so only the
-- service-role client (which bypasses RLS) can mutate the row.
drop policy if exists "zoho_integration_authenticated_read" on public.zoho_integration;
create policy "zoho_integration_authenticated_read"
  on public.zoho_integration
  for select
  to authenticated
  using (true);

-- =====================================================================
-- RPCs (SECURITY DEFINER) — the only path to the Vault secret. The Vault
-- schema is not exposed through PostgREST, so these public wrappers are how
-- the service-role server client reads/writes the credentials. Execute is
-- granted to service_role only.
-- =====================================================================

-- Upsert the credentials JSON into the 'zoho_payments' vault secret.
create or replace function public.set_zoho_secret(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'zoho_payments';
  if v_id is null then
    perform vault.create_secret(p_payload::text, 'zoho_payments', 'Zoho Payments credentials (JSON)');
  else
    perform vault.update_secret(v_id, p_payload::text);
  end if;
end;
$$;

-- Return the decrypted credentials JSON (or null if not set).
create or replace function public.get_zoho_secret()
returns jsonb
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret::jsonb
  from vault.decrypted_secrets
  where name = 'zoho_payments'
  limit 1;
$$;

revoke all on function public.set_zoho_secret(jsonb) from public, anon, authenticated;
revoke all on function public.get_zoho_secret() from public, anon, authenticated;
grant execute on function public.set_zoho_secret(jsonb) to service_role;
grant execute on function public.get_zoho_secret() to service_role;
