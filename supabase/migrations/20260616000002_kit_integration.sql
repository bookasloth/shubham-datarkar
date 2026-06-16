-- Kit (ConvertKit) integration: encrypted API key storage + status metadata.
-- Target project: Shubham's OWN Supabase. NOT the BAS project.
-- Apply via your own project's SQL editor or `supabase db push`.
--
-- Mirrors the Zoho integration: secret (API key + form id) lives encrypted in
-- Supabase Vault (secret 'kit_email'), reached only via service-role RPCs;
-- public.kit_integration holds non-secret status for the admin UI.

create extension if not exists supabase_vault with schema vault cascade;

create table if not exists public.kit_integration (
  id                smallint primary key default 1,
  configured        boolean not null default false,
  last_test_at      timestamptz,
  last_test_ok      boolean,
  last_test_message text,
  updated_at        timestamptz not null default now(),
  constraint kit_integration_singleton check (id = 1)
);

insert into public.kit_integration (id) values (1) on conflict (id) do nothing;

alter table public.kit_integration enable row level security;

drop policy if exists "kit_integration_authenticated_read" on public.kit_integration;
create policy "kit_integration_authenticated_read"
  on public.kit_integration
  for select
  to authenticated
  using (true);

create or replace function public.set_kit_secret(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'kit_email';
  if v_id is null then
    perform vault.create_secret(p_payload::text, 'kit_email', 'Kit (ConvertKit) credentials (JSON)');
  else
    perform vault.update_secret(v_id, p_payload::text);
  end if;
end;
$$;

create or replace function public.get_kit_secret()
returns jsonb
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret::jsonb
  from vault.decrypted_secrets
  where name = 'kit_email'
  limit 1;
$$;

revoke all on function public.set_kit_secret(jsonb) from public, anon, authenticated;
revoke all on function public.get_kit_secret() from public, anon, authenticated;
grant execute on function public.set_kit_secret(jsonb) to service_role;
grant execute on function public.get_kit_secret() to service_role;
