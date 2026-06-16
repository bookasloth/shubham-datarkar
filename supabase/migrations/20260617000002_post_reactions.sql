-- Per-post reaction counters for blog posts. Counter only: never stores user
-- text, identity, or IP. All access via the service-role client (RLS bypass);
-- the apply_reaction RPC does the atomic -1 old / +1 new / toggle-off deltas.
-- Target: your OWN Supabase project. Run manually.

create table if not exists public.post_reactions (
  post_slug text not null,
  reaction  text not null check (reaction in
    ('love','fire','insightful','meh','confused','down')),
  count     int  not null default 0,
  primary key (post_slug, reaction)
);

alter table public.post_reactions enable row level security;
-- No anon/authenticated policy: counts are returned from the server action,
-- the browser never reads this table directly.

-- Atomic apply: decrement p_prev (if given), increment p_next (if given),
-- return the full count map for the post as jsonb.
create or replace function public.apply_reaction(
  p_slug text, p_next text, p_prev text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if p_prev is not null then
    update public.post_reactions set count = greatest(count - 1, 0)
      where post_slug = p_slug and reaction = p_prev;
  end if;
  if p_next is not null then
    insert into public.post_reactions (post_slug, reaction, count)
      values (p_slug, p_next, 1)
      on conflict (post_slug, reaction)
      do update set count = public.post_reactions.count + 1;
  end if;
  select coalesce(jsonb_object_agg(reaction, count), '{}'::jsonb)
    into result from public.post_reactions where post_slug = p_slug;
  return result;
end $$;

-- Lock the RPC to the service-role path only.
revoke all on function public.apply_reaction(text, text, text) from public, anon;
