-- Linktree-style /link page: categories of links, admin-managed, publicly readable.
-- Public reads = published rows; admin = full access via is_admin().
-- Reuses public.touch_updated_at() created in the posts migration.
-- Target: your OWN Supabase project. Run manually.

create table if not exists public.link_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  sort       integer not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.link_categories(id) on delete cascade,
  title       text not null,
  url         text not null,
  color       text not null default '#ffffff',
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists link_categories_sort_idx on public.link_categories (sort);
create index if not exists links_category_sort_idx on public.links (category_id, sort);

-- RLS: link_categories
alter table public.link_categories enable row level security;

drop policy if exists link_categories_public_read on public.link_categories;
create policy link_categories_public_read on public.link_categories
  for select to anon, authenticated using (published);

drop policy if exists link_categories_admin_read on public.link_categories;
create policy link_categories_admin_read on public.link_categories
  for select to authenticated using (public.is_admin());

drop policy if exists link_categories_admin_write on public.link_categories;
create policy link_categories_admin_write on public.link_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.link_categories to anon, authenticated;
grant insert, update, delete on public.link_categories to authenticated;

drop trigger if exists link_categories_touch_updated_at on public.link_categories;
create trigger link_categories_touch_updated_at
  before update on public.link_categories
  for each row execute function public.touch_updated_at();

-- RLS: links
alter table public.links enable row level security;

drop policy if exists links_public_read on public.links;
create policy links_public_read on public.links
  for select to anon, authenticated using (published);

drop policy if exists links_admin_read on public.links;
create policy links_admin_read on public.links
  for select to authenticated using (public.is_admin());

drop policy if exists links_admin_write on public.links;
create policy links_admin_write on public.links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.links to anon, authenticated;
grant insert, update, delete on public.links to authenticated;

drop trigger if exists links_touch_updated_at on public.links;
create trigger links_touch_updated_at
  before update on public.links
  for each row execute function public.touch_updated_at();

-- Seed data: 6 categories, 30 links, from reference bio page.
do $$
declare
  cat_start     uuid;
  cat_work      uuid;
  cat_resources uuid;
  cat_shop      uuid;
  cat_social    uuid;
  cat_games     uuid;
begin
  insert into public.link_categories (name, slug, sort)
    values ('Start', 'start', 0)
    on conflict (slug) do update set name = excluded.name, sort = excluded.sort
    returning id into cat_start;

  insert into public.link_categories (name, slug, sort)
    values ('Work', 'work', 1)
    on conflict (slug) do update set name = excluded.name, sort = excluded.sort
    returning id into cat_work;

  insert into public.link_categories (name, slug, sort)
    values ('Resources', 'resources', 2)
    on conflict (slug) do update set name = excluded.name, sort = excluded.sort
    returning id into cat_resources;

  insert into public.link_categories (name, slug, sort)
    values ('Shop', 'shop', 3)
    on conflict (slug) do update set name = excluded.name, sort = excluded.sort
    returning id into cat_shop;

  insert into public.link_categories (name, slug, sort)
    values ('Social', 'social', 4)
    on conflict (slug) do update set name = excluded.name, sort = excluded.sort
    returning id into cat_social;

  insert into public.link_categories (name, slug, sort)
    values ('Games', 'games', 5)
    on conflict (slug) do update set name = excluded.name, sort = excluded.sort
    returning id into cat_games;

  -- Re-runnable seed: clear existing links for these categories before inserting.
  delete from public.links
   where category_id in (cat_start, cat_work, cat_resources, cat_shop, cat_social, cat_games);

  -- Start
  insert into public.links (category_id, title, url, color, sort) values
    (cat_start, 'Fix Your Funnel in 30 Minutes', 'https://shubhamdatarkar.com/consult', '#FE5100', 0),
    (cat_start, 'Steal My SEO System (Blueprint)', 'https://tools.shubhamdatarkar.com/seo-systems.html', '#FF4D93', 1),
    (cat_start, 'Join Growth Newsletter', 'https://shubhamdatarkar.com/subscribe', '#269CEF', 2),
    (cat_start, 'Get Free Website Audit', 'https://tools.shubhamdatarkar.com/audit-website.html', '#2d9948', 3),
    (cat_start, 'Watch My Strategy Breakdown', 'https://youtube.com/@sndatarkar', '#FFCC1C', 4);

  -- Work
  insert into public.links (category_id, title, url, color, sort) values
    (cat_work, 'The Kalamwala''s Blog', 'https://shubhamdatarkar.com', '#000000', 0),
    (cat_work, 'Video Production', 'https://rajmudramudramedia.com', '#FE5100', 1),
    (cat_work, 'Digital Marketing', 'https://theboguscompany.com', '#2d9948', 2),
    (cat_work, 'Software Development', 'https://timewheel.co.in', '#FF4D93', 3),
    (cat_work, 'Creative Advertising', 'https://www.thegreyhawks.com/portfolio', '#269CEF', 4);

  -- Resources
  insert into public.links (category_id, title, url, color, sort) values
    (cat_resources, 'Marketing Frameworks', 'https://tools.shubhamdatarkar.com/marketing-frameworks.html', '#269CEF', 0),
    (cat_resources, 'Growth Playbooks', 'https://tools.shubhamdatarkar.com/growth-playbooks.html', '#FF4D93', 1),
    (cat_resources, 'Startup Tools', 'https://tools.shubhamdatarkar.com/startup-tools.html', '#2d9948', 2),
    (cat_resources, 'SEO Checklists', 'https://tools.shubhamdatarkar.com/seo-checklist.html', '#FFCC1C', 3),
    (cat_resources, 'Ad Copy Library', 'https://tools.shubhamdatarkar.com/ad-copy-library.html', '#FE5100', 4);

  -- Shop
  insert into public.links (category_id, title, url, color, sort) values
    (cat_shop, 'SEO Blueprint (Paid)', '#', '#FE5100', 0),
    (cat_shop, 'Growth Course', 'https://courses.shubhamdatarkar.com', '#FF4D93', 1),
    (cat_shop, 'Templates Bundle', 'https://shop.shubhamdatarkar.com/templates.html', '#269CEF', 2),
    (cat_shop, 'Funnel Kits', 'https://shop.shubhamdatarkar.com/funnle-kits.html', '#2d9948', 3),
    (cat_shop, 'Private Community', 'https://community.shubhamdatarkar.com/welcome.html', '#FFCC1C', 4);

  -- Social
  insert into public.links (category_id, title, url, color, sort) values
    (cat_social, 'LinkedIn', 'https://linkedin.com/in/sndatarkar', '#0A66C2', 0),
    (cat_social, 'Twitter', 'https://x.com/sndatarkar', '#000000', 1),
    (cat_social, 'YouTube', 'https://youtube.com/@sndatarkar', '#FF0000', 2),
    (cat_social, 'Instagram', 'https://instagram.com/sndatarkar', '#E1306C', 3),
    (cat_social, 'Facebook', 'https://facebook.com/sndatarkar', '#1877F2', 4);

  -- Games
  insert into public.links (category_id, title, url, color, sort) values
    (cat_games, 'Tic Tac Toe', 'https://fun.shubhamdatarkar.com/tic-tac-toe.html', '#E53935', 0),
    (cat_games, '2048', 'https://fun.shubhamdatarkar.com/2048.html', '#7F00FF', 1),
    (cat_games, 'Wordle', 'https://fun.shubhamdatarkar.com/wordle.html', '#00BCD4', 2),
    (cat_games, 'Bulls and Cow', 'https://fun.shubhamdatarkar.com/bulls-and-cow.html', '#FFCBA4', 3),
    (cat_games, 'Guess the Face', 'https://fun.shubhamdatarkar.com/guess-the-face.html', '#FF00FF', 4);
end $$;
