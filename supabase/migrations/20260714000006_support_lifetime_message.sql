-- =====================================================================
-- Expose the supporter's latest note on the public support_lifetime view.
--
-- Feeds the "click a supporter → see the message they left" modal on
-- /support/supporters. Product decision: the note shows for EVERYONE,
-- including anonymous supporters (their NAME stays hidden — nulled above —
-- but the note itself is shown). Email is still never exposed.
--
-- CREATE OR REPLACE with the column appended at the end (allowed for views).
-- Replacing a view preserves existing grants; re-granted below to be safe.
-- =====================================================================
create or replace view public.support_lifetime as
select
  encode(digest(lower(email), 'sha256'), 'hex') as supporter_key,
  max(case when anonymous then null else name end) as name,
  sum(total_amount)  as lifetime_amount,
  sum(coffee_units)  as lifetime_coffees,
  sum(toffee_units)  as lifetime_toffees,
  count(*)           as support_count,
  max(created_at)    as last_supported_at,
  bool_and(anonymous) as anonymous,
  -- Latest non-null note across this supporter's paid rows.
  (array_remove(array_agg(message order by created_at desc), null))[1] as message
from public.supports
where status = 'paid'
group by lower(email);

comment on view public.support_lifetime is
  'Per-supporter lifetime aggregates for tiers. Keyed by sha256(email); email never exposed. Includes the latest note (shown for all, incl. anonymous).';

grant select on public.support_lifetime to anon, authenticated;
