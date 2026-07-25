-- =====================================================================
-- /community — "N New Notes" pill: count new rows since a watermark (PR F, §8).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- Returns how many feed-eligible root posts arrived after p_since, capped at 50
-- (an uncapped count is a full scan for a number nobody reads past "50+").
--
-- The filters MUST match community_feed's `rows_` CTE, or the pill promises
-- posts the feed then won't show:
--   - root, live (publish_at due), not hidden, author not banned
--   - mute (unconditional), audience (everyone / self / followed)
--   - p_following: only people the viewer follows (the Following tab)
-- Plus two the feed doesn't need:
--   - created strictly after the watermark
--   - EXCLUDE the viewer's own posts — your own note surfacing as "1 New Note"
--     is a bug that looks like one.
--
-- New standalone function → plain create-or-replace, additive to
-- 20260725000001_community_social_layer.sql.
-- =====================================================================

create or replace function public.community_new_count(
  p_since     timestamptz,
  p_following boolean default false
)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select least(count(*), 50)::int
  from public.community_posts r
  join public.profiles actor on actor.id = r.user_id
  where r.parent_id is null
    and r.created_at > p_since
    and r.user_id <> auth.uid()          -- never count your own
    and not r.hidden
    and not actor.banned
    and r.publish_at is not null and r.publish_at <= now()
    and not exists (select 1 from public.community_mutes m
                    where m.muter_id = auth.uid() and m.muted_id = r.user_id)
    and (r.audience = 'everyone'
         or r.user_id = auth.uid()
         or exists (select 1 from public.community_follows fa
                    where fa.follower_id = auth.uid() and fa.followee_id = r.user_id))
    and (not p_following or exists (select 1 from public.community_follows f
                                    where f.follower_id = auth.uid()
                                      and f.followee_id = r.user_id));
$$;

-- authenticated only: a logged-out visitor gets the random preview, not a live
-- feed, so there is nothing to poll.
grant execute on function public.community_new_count(timestamptz, boolean) to authenticated;
