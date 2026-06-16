-- Contact form submissions + SMTP email integration.
-- Target project: Shubham's OWN Supabase. NOT the BAS project.
-- Apply via your own project's SQL editor or `supabase db push`.

create extension if not exists supabase_vault with schema vault cascade;

-- =====================================================================
-- Contact submissions. Written server-side (service-role); admin reads.
-- =====================================================================
create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  email         text not null,
  project_type  text,
  budget        text,
  message       text not null,
  status        text not null default 'new' check (status in ('new', 'read', 'archived')),
  notified      boolean not null default false,
  constraint contacts_message_len check (char_length(message) <= 5000)
);

create index if not exists contacts_created_at_idx on public.contacts (created_at desc);

alter table public.contacts enable row level security;

-- Authenticated admin may read. No public policy → inserts are service-role only.
drop policy if exists "contacts_authenticated_read" on public.contacts;
create policy "contacts_authenticated_read"
  on public.contacts
  for select
  to authenticated
  using (true);

-- =====================================================================
-- SMTP email integration: encrypted creds in Vault + status metadata.
-- =====================================================================
create table if not exists public.email_integration (
  id                smallint primary key default 1,
  configured        boolean not null default false,
  last_test_at      timestamptz,
  last_test_ok      boolean,
  last_test_message text,
  updated_at        timestamptz not null default now(),
  constraint email_integration_singleton check (id = 1)
);

insert into public.email_integration (id) values (1) on conflict (id) do nothing;

alter table public.email_integration enable row level security;

drop policy if exists "email_integration_authenticated_read" on public.email_integration;
create policy "email_integration_authenticated_read"
  on public.email_integration
  for select
  to authenticated
  using (true);

create or replace function public.set_email_secret(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'email_smtp';
  if v_id is null then
    perform vault.create_secret(p_payload::text, 'email_smtp', 'SMTP email credentials (JSON)');
  else
    perform vault.update_secret(v_id, p_payload::text);
  end if;
end;
$$;

create or replace function public.get_email_secret()
returns jsonb
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret::jsonb
  from vault.decrypted_secrets
  where name = 'email_smtp'
  limit 1;
$$;

revoke all on function public.set_email_secret(jsonb) from public, anon, authenticated;
revoke all on function public.get_email_secret() from public, anon, authenticated;
grant execute on function public.set_email_secret(jsonb) to service_role;
grant execute on function public.get_email_secret() to service_role;
