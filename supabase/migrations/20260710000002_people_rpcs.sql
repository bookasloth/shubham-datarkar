-- Unified People: aggregate every email across contacts, subscribers, supports,
-- and auth.users into one row per person; plus a per-person activity timeline.
-- Both are security-definer (they read auth.users) and admin-gated via is_admin().
-- Target: Shubham's OWN Supabase project. Run manually in the SQL editor.

-- ============ one row per distinct email across all behaviors ============
create or replace function public.get_people()
returns table (
  email             text,
  display_name      text,
  user_id           uuid,
  verified          boolean,
  contacted         boolean,
  contact_count     int,
  subscribed        boolean,
  donated           boolean,
  donation_total    numeric,
  is_gamer          boolean,
  plan_key          text,
  membership_status text,
  first_seen        timestamptz,
  last_seen         timestamptz
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  with c as (
    select lower(trim(email)) as email, count(*)::int as contact_count,
           min(created_at) as first_seen, max(created_at) as last_seen
    from public.contacts
    where email is not null and trim(email) <> '' group by 1
  ),
  s as (
    select lower(trim(email)) as email, bool_or(status = 'active') as subscribed,
           min(created_at) as first_seen, max(created_at) as last_seen
    from public.subscribers
    where email is not null and trim(email) <> '' group by 1
  ),
  d as (
    select lower(trim(email)) as email,
           bool_or(status = 'paid') as donated,
           coalesce(sum(total_amount) filter (where status = 'paid'), 0) as donation_total,
           min(created_at) as first_seen, max(created_at) as last_seen
    from public.supports
    where email is not null and trim(email) <> '' group by 1
  ),
  u as (
    select id as user_id, lower(trim(email)) as email,
           (email_confirmed_at is not null) as verified, created_at
    from auth.users
    where email is not null and trim(email) <> ''
  ),
  keys as (
    select email from c union select email from s
    union select email from d union select email from u
  )
  select
    k.email,
    coalesce(p.username, split_part(k.email, '@', 1)) as display_name,
    u.user_id,
    coalesce(u.verified, false) as verified,
    (c.email is not null) as contacted,
    coalesce(c.contact_count, 0) as contact_count,
    coalesce(s.subscribed, false) as subscribed,
    coalesce(d.donated, false) as donated,
    coalesce(d.donation_total, 0) as donation_total,
    exists (select 1 from public.game_results gr where gr.user_id = u.user_id) as is_gamer,
    m.plan_key,
    m.status as membership_status,
    least(c.first_seen, s.first_seen, d.first_seen, u.created_at) as first_seen,
    greatest(c.last_seen, s.last_seen, d.last_seen, u.created_at) as last_seen
  from keys k
  left join c on c.email = k.email
  left join s on s.email = k.email
  left join d on d.email = k.email
  left join u on u.email = k.email
  left join public.profiles p on p.id = u.user_id
  left join public.memberships m on m.user_id = u.user_id
  order by greatest(c.last_seen, s.last_seen, d.last_seen, u.created_at) desc nulls last;
end;
$$;

-- ============ per-person merged activity feed ============
create or replace function public.get_person_timeline(p_email text)
returns table (kind text, occurred_at timestamptz, title text, detail text)
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_email text := lower(trim(p_email));
  v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select id into v_uid from auth.users where lower(trim(email)) = v_email limit 1;

  return query
  select 'contact'::text, c.created_at,
         coalesce(nullif(c.project_type, ''), 'Contact message'), c.message
  from public.contacts c where lower(trim(c.email)) = v_email
  union all
  select 'newsletter'::text, s.created_at,
         case when s.status = 'active' then 'Subscribed' else 'Unsubscribed' end, s.source
  from public.subscribers s where lower(trim(s.email)) = v_email
  union all
  select 'donation'::text, d.created_at,
         d.status || ' - INR ' || d.total_amount::text, d.message
  from public.supports d where lower(trim(d.email)) = v_email
  union all
  select 'game'::text, coalesce(gr.completed_at, gr.updated_at),
         gr.game::text || ' #' || gr.puzzle_number::text, gr.status::text
  from public.game_results gr where v_uid is not null and gr.user_id = v_uid
  union all
  select 'membership'::text, m.created_at, m.plan_key, m.status
  from public.memberships m where v_uid is not null and m.user_id = v_uid
  order by 2 desc nulls last;
end;
$$;

-- ============ grants: admin-gated internally; authenticated may call ============
revoke all on function public.get_people() from public, anon;
revoke all on function public.get_person_timeline(text) from public, anon;
grant execute on function public.get_people() to authenticated;
grant execute on function public.get_person_timeline(text) to authenticated;
