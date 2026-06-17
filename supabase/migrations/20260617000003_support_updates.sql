-- Support updates: DB-backed posts for /support/updates, each with a shareable
-- 6-digit code page. Types: text, image, video (manual) + thankyou (system,
-- created by the payment webhook in a later sub-project). No drafts — every row
-- is live; public reads all rows, admin writes via is_admin().
-- support_settings holds the up-to-5 reusable thank-you images.
-- Reuses public.touch_updated_at() + public.is_admin() from earlier migrations.
-- Target: your OWN Supabase project. Run manually.

create table if not exists public.support_updates (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  type       text not null check (type in ('text','image','video','thankyou')),
  body       text not null default '',
  media      jsonb not null default '{}'::jsonb,
  author     jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_updates_created_idx
  on public.support_updates (created_at desc);

alter table public.support_updates enable row level security;

drop policy if exists support_updates_public_read on public.support_updates;
create policy support_updates_public_read on public.support_updates
  for select to anon, authenticated using (true);

drop policy if exists support_updates_admin_write on public.support_updates;
create policy support_updates_admin_write on public.support_updates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.support_updates to anon, authenticated;
grant insert, update, delete on public.support_updates to authenticated;

drop trigger if exists support_updates_touch_updated_at on public.support_updates;
create trigger support_updates_touch_updated_at before update on public.support_updates
  for each row execute function public.touch_updated_at();

-- Single-row settings table for the reusable thank-you images.
create table if not exists public.support_settings (
  id              int primary key default 1 check (id = 1),
  thankyou_images jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);
insert into public.support_settings (id) values (1) on conflict (id) do nothing;

alter table public.support_settings enable row level security;

drop policy if exists support_settings_public_read on public.support_settings;
create policy support_settings_public_read on public.support_settings
  for select to anon, authenticated using (true);

drop policy if exists support_settings_admin_write on public.support_settings;
create policy support_settings_admin_write on public.support_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.support_settings to anon, authenticated;
grant insert, update on public.support_settings to authenticated;

drop trigger if exists support_settings_touch_updated_at on public.support_settings;
create trigger support_settings_touch_updated_at before update on public.support_settings
  for each row execute function public.touch_updated_at();
