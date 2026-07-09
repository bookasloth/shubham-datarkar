-- Members platform: resources, taxonomy, membership, member features.
-- Everything is a Resource. Type-specific data lives in meta jsonb.

-- ============ guard: park any pre-existing ad-hoc resources table ============
-- Prod had an unrelated `resources` table (no `search` column, not created by
-- any migration, unused by app code). `create table if not exists` would skip
-- ours and the search index would then fail with 42703. Rename it aside —
-- nothing is dropped; inspect/remove `resources_legacy` manually later.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'resources'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resources'
      and column_name = 'search'
  ) then
    alter table public.resources rename to resources_legacy;
  end if;
end $$;

-- ============ taxonomy ============
create table if not exists public.resource_types (
  key text primary key,
  label text not null,
  icon text,
  sort int not null default 0,
  active boolean not null default true
);

insert into public.resource_types (key, label, sort) values
  ('article','Article',1),('prompt','Prompt',2),('template','Template',3),
  ('workflow','Workflow',4),('tool','Tool',5),('checklist','Checklist',6),
  ('case-study','Case Study',7),('download','Download',8),('video','Video',9),
  ('snippet','Snippet',10)
on conflict (key) do nothing;

create table if not exists public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort int not null default 0,
  active boolean not null default true
);

insert into public.resource_categories (name, slug, sort) values
  ('AI','ai',1),('SEO','seo',2),('GEO','geo',3),('AEO','aeo',4),
  ('Copywriting','copywriting',5),('Ads','ads',6),('Analytics','analytics',7),
  ('Branding','branding',8),('Landing Pages','landing-pages',9),
  ('Email Marketing','email-marketing',10),('Social Media','social-media',11),
  ('Automation','automation',12),('Business','business',13),
  ('Product','product',14),('Development','development',15)
on conflict (slug) do nothing;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

-- ============ resources ============
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  excerpt text,
  cover_image text,
  type text not null references public.resource_types(key),
  category_id uuid references public.resource_categories(id) on delete set null,
  difficulty text check (difficulty in ('beginner','intermediate','advanced')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  visibility text not null default 'free' check (visibility in ('free','members','premium','hidden')),
  content jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  author text not null default 'Shubham Datarkar',
  reading_time int,
  view_count int not null default 0,
  download_count int not null default 0,
  bookmark_count int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'') || ' ' || coalesce(excerpt,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(content::text,'')), 'C')
  ) stored
);

create index if not exists resources_search_idx on public.resources using gin (search);
create index if not exists resources_list_idx on public.resources (status, visibility, published_at desc);
create index if not exists resources_type_idx on public.resources (type);
create index if not exists resources_category_idx on public.resources (category_id);

drop trigger if exists resources_touch on public.resources;
create trigger resources_touch before update on public.resources
  for each row execute function public.touch_updated_at();

create table if not exists public.resource_tag (
  resource_id uuid not null references public.resources(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (resource_id, tag_id)
);

-- ============ membership ============
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  amount int not null,               -- paise
  interval text not null check (interval in ('monthly','yearly')),
  razorpay_plan_id text,             -- filled from Razorpay dashboard
  active boolean not null default false,
  sort int not null default 0
);

insert into public.membership_plans (key, name, description, amount, interval, sort) values
  ('premium-monthly','Premium Monthly','Full access to everything, billed monthly', 9900, 'monthly', 1),
  ('premium-yearly','Premium Yearly','Full access to everything, billed yearly', 99900, 'yearly', 2)
on conflict (key) do nothing;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_key text not null references public.membership_plans(key),
  status text not null default 'pending' check (status in ('pending','active','cancelled','expired')),
  razorpay_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists memberships_touch on public.memberships;
create trigger memberships_touch before update on public.memberships
  for each row execute function public.touch_updated_at();

-- ============ member features ============
create table if not exists public.resource_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table if not exists public.resource_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  progress numeric(4,3) not null default 0 check (progress >= 0 and progress <= 1),
  completed boolean not null default false,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create index if not exists resource_progress_recent_idx
  on public.resource_progress (user_id, last_viewed_at desc);

create table if not exists public.member_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('template','prompt','tool','article','review')),
  title text not null,
  details text,
  status text not null default 'open' check (status in ('open','planned','shipped','declined')),
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  href text,
  active boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- Analytics events (views/downloads/bookmarks/search). Service-role only.
create table if not exists public.resource_events (
  id bigint generated always as identity primary key,
  resource_id uuid references public.resources(id) on delete cascade,
  user_id uuid,
  event text not null check (event in ('view','download','bookmark','search')),
  query text,
  created_at timestamptz not null default now()
);

create index if not exists resource_events_kind_idx on public.resource_events (event, created_at desc);

-- Comments: architecture only in V1 (no UI, no client policies).
create table if not exists public.resource_comments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.resource_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Interactive tool registry.
create table if not exists public.member_tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  component text not null,           -- key into the client component registry
  category_id uuid references public.resource_categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','live','archived')),
  sort int not null default 0
);

insert into public.member_tools (slug, name, description, component, status, sort) values
  ('utm-builder','UTM Link Builder','Build tagged campaign URLs and copy them in one click.','utm-builder','live',1)
on conflict (slug) do nothing;

-- ============ RPCs ============
create or replace function public.search_resources(q text, lim int default 20)
returns table (
  id uuid, slug text, title text, description text, type text,
  category_id uuid, difficulty text, visibility text, cover_image text,
  featured boolean, published_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.slug, r.title, r.description, r.type, r.category_id,
         r.difficulty, r.visibility, r.cover_image, r.featured, r.published_at
  from resources r
  where r.status = 'published' and r.visibility <> 'hidden'
    and (
      r.search @@ plainto_tsquery('english', q)
      or r.title ilike '%' || q || '%'
      or exists (
        select 1 from resource_tag rt join tags t on t.id = rt.tag_id
        where rt.resource_id = r.id and t.name ilike '%' || q || '%'
      )
    )
  order by ts_rank(r.search, plainto_tsquery('english', q)) desc,
           r.published_at desc nulls last
  limit lim;
$$;

create or replace function public.bump_resource_counter(rid uuid, kind text)
returns void language sql security definer set search_path = public as $$
  update resources set
    view_count = view_count + (kind = 'view')::int,
    download_count = download_count + (kind = 'download')::int,
    bookmark_count = greatest(0, bookmark_count
      + case when kind = 'bookmark' then 1 when kind = 'unbookmark' then -1 else 0 end)
  where id = rid;
$$;

revoke execute on function public.bump_resource_counter(uuid, text) from public, anon, authenticated;

-- ============ RLS ============
alter table public.resource_types enable row level security;
alter table public.resource_categories enable row level security;
alter table public.tags enable row level security;
alter table public.resources enable row level security;
alter table public.resource_tag enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.resource_bookmarks enable row level security;
alter table public.resource_progress enable row level security;
alter table public.member_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.resource_events enable row level security;
alter table public.resource_comments enable row level security;
alter table public.member_tools enable row level security;

-- taxonomy: public read, admin write
create policy resource_types_public_read on public.resource_types for select to anon, authenticated using (active);
create policy resource_types_admin_all on public.resource_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy resource_categories_public_read on public.resource_categories for select to anon, authenticated using (active);
create policy resource_categories_admin_all on public.resource_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tags_public_read on public.tags for select to anon, authenticated using (true);
create policy tags_admin_all on public.tags for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- resources + join: admin session CRUD; member-facing reads go through service role server-side
create policy resources_admin_all on public.resources for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy resource_tag_admin_all on public.resource_tag for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- membership: self read, admin read; writes via service role only
create policy membership_plans_public_read on public.membership_plans for select to anon, authenticated using (active);
create policy membership_plans_admin_all on public.membership_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy memberships_self_read on public.memberships for select to authenticated using (auth.uid() = user_id);
create policy memberships_admin_read on public.memberships for select to authenticated using (public.is_admin());

-- member features: self-scoped
create policy bookmarks_self_all on public.resource_bookmarks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy progress_self_all on public.resource_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy requests_self_read on public.member_requests for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy requests_self_insert on public.member_requests for insert to authenticated with check (auth.uid() = user_id);
create policy requests_admin_update on public.member_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- announcements: public read within active window, admin all
create policy announcements_public_read on public.announcements for select to anon, authenticated
  using (active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy announcements_admin_all on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tools: public read live, admin all
create policy member_tools_public_read on public.member_tools for select to anon, authenticated using (status = 'live');
create policy member_tools_admin_all on public.member_tools for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- resource_events, resource_comments: no client policies (service-role only)

-- ============ storage: private bucket for member downloads ============
insert into storage.buckets (id, name, public)
values ('member-files', 'member-files', false)
on conflict (id) do nothing;
-- No storage.objects policies: service-role only (signed URLs minted server-side after access check).
