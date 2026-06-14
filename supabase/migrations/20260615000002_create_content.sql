-- Content entities: case studies, projects, products, services, testimonials.
-- Uniform shape: the full typed object lives in `data` (jsonb), like posts.body.
-- Public reads = published rows; admin = full access via is_admin().
-- Reuses public.touch_updated_at() created in the posts migration.
-- Target: your OWN Supabase project. Run manually.

-- Generic builder, run per table below.
do $$
declare
  t text;
  tables text[] := array['case_studies', 'projects', 'products', 'services', 'testimonials'];
begin
  foreach t in array tables loop
    execute format($f$
      create table if not exists public.%I (
        id         uuid primary key default gen_random_uuid(),
        slug       text,
        data       jsonb not null default '{}'::jsonb,
        sort       integer not null default 0,
        published  boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    $f$, t);

    execute format(
      'create unique index if not exists %I on public.%I (slug) where slug is not null;',
      t || '_slug_idx', t);
    execute format(
      'create index if not exists %I on public.%I (sort);',
      t || '_sort_idx', t);

    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (published);',
      t || '_public_read', t);

    execute format('drop policy if exists %I on public.%I;', t || '_admin_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_admin());',
      t || '_admin_read', t);

    execute format('drop policy if exists %I on public.%I;', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
      t || '_admin_write', t);

    execute format('grant select on public.%I to anon, authenticated;', t);
    execute format('grant insert, update, delete on public.%I to authenticated;', t);

    execute format('drop trigger if exists %I on public.%I;', t || '_touch_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at();',
      t || '_touch_updated_at', t);
  end loop;
end $$;
