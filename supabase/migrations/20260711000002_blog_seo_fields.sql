-- Per-post SEO copy. All nullable: an unset column falls back to the post's
-- title/excerpt, which is exactly today's behaviour.
alter table public.posts
  add column if not exists seo_title      text,
  add column if not exists og_title       text,
  add column if not exists og_description text;

comment on column public.posts.seo_title is
  'Keyword <title> phrase, 15-40 chars, no brand name (the layout template appends it). Falls back to title.';
comment on column public.posts.og_title is
  'Social-card headline. Falls back to the branded full title.';
comment on column public.posts.og_description is
  'Social-card body. Falls back to excerpt.';
