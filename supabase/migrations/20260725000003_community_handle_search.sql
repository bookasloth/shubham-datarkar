-- =====================================================================
-- /community — @mention autocomplete: handle search RPC (PR C, §4).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- Prefix-only search over profiles for the composer's @mention dropdown.
--   - prefix match (p_q || '%'), so it's index-friendly and searching '%' can't
--     dump the table
--   - '_' and '%' in the input are escaped before concatenation, so a handle
--     containing them can't turn into a wildcard
--   - exact-prefix-on-username ranks above display-name matches
--   - granted to AUTHENTICATED ONLY — a logged-out visitor has no composer, and
--     this is a user-enumeration surface
--
-- New standalone function, so a plain create-or-replace (no drop, nothing else
-- depends on it). Additive to 20260725000001_community_social_layer.sql.
-- =====================================================================

create or replace function public.community_handle_search(p_q text, p_limit int default 8)
returns table (username text, display_name text, avatar_url text, badge text)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    -- Escape LIKE metacharacters so "a_b" / "a%b" match literally, not as
    -- wildcards. \ is the default escape char.
    select replace(replace(replace(trim(p_q), '\', '\\'), '%', '\%'), '_', '\_') as term
  )
  select pr.username, pr.display_name, pr.avatar_url, public.community_badge(pr.id)
  from public.profiles pr, q
  where not pr.banned
    and pr.username is not null
    and q.term <> ''
    and (pr.username ilike q.term || '%' or pr.display_name ilike q.term || '%')
  order by (pr.username ilike q.term || '%') desc, length(pr.username), pr.username
  limit least(greatest(p_limit, 1), 10);
$$;

grant execute on function public.community_handle_search(text, int) to authenticated;
