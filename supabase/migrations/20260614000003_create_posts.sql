-- Blog posts. body = ContentBlock[] (jsonb), unchanged from the static shape.
-- Public visibility is time-based: published_at <= now(). Drafts have null
-- published_at; scheduled posts have a future published_at and appear automatically.
-- Target: your OWN Supabase project. Run manually in the SQL editor.

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  excerpt      text not null default '',
  category     text not null,
  tags         text[] not null default '{}',
  words        integer not null default 0 check (words >= 0),
  featured     boolean not null default false,
  body         jsonb not null default '[]'::jsonb,
  status       text not null default 'draft'
                 check (status in ('draft', 'published', 'scheduled')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.posts is
  'Blog posts. Public reads via RLS (published_at <= now()); admin full access via is_admin().';

create index if not exists posts_visible_idx
  on public.posts (published_at desc)
  where published_at is not null;
create index if not exists posts_category_idx on public.posts (category);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.posts enable row level security;

-- Public: only visible posts (published or past-scheduled).
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select
  to anon, authenticated
  using (published_at is not null and published_at <= now());

-- Admin: full read.
drop policy if exists posts_admin_read on public.posts;
create policy posts_admin_read on public.posts
  for select
  to authenticated
  using (public.is_admin());

-- Admin: write (insert/update/delete).
drop policy if exists posts_admin_write on public.posts;
create policy posts_admin_write on public.posts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
