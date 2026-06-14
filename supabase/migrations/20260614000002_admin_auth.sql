-- Admin gate for RLS across content tables (posts, etc.).
-- Single-admin model: allowlist one email.
-- IMPORTANT: the email literal below must match your admin Auth user's email.
-- Target: your OWN Supabase project (NOT the BAS project). Run manually in the SQL editor.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') = 'bookasloth@gmail.com', false);
$$;

comment on function public.is_admin() is
  'True when the current authenticated user is the site admin. Used by RLS policies on content tables.';

grant execute on function public.is_admin() to anon, authenticated;
