-- =====================================================================
-- /community — feed SEED (owner build-in-public backfill).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). NOT the BAS project.
-- Apply MANUALLY via the SQL editor. Idempotent — safe to re-run.
-- Depends on 20260710000001_community_schema.sql and public.posts (blog).
--
-- What it does: inserts owner-authored ("build in public") text posts to
-- populate an empty feed — one per published blog post, per case study, per
-- game, plus a handful of platform milestones. All authored by the founder
-- profile (is_founder = true), backdated so the timeline reads organically.
-- No fabricated users, votes or replies.
--
-- Idempotency: blog rows reuse the blog post's own id; static rows use fixed
-- '5eed...' ids. Both `on conflict (id) do nothing`, so re-running is a no-op.
-- It seeds only — it never updates a post whose source later changes.
--
-- ROLLBACK (run to undo the entire seed):
--   delete from public.community_posts
--   where (id::text like '5eed%')
--      or id in (select id from public.posts where status = 'published');
-- =====================================================================

do $$
declare
  owner uuid;
begin
  select id into owner
  from public.profiles
  where is_founder = true
  order by id
  limit 1;

  if owner is null then
    raise notice 'community_seed: no founder profile (is_founder = true) — nothing seeded.';
    return;
  end if;

  -- ---------- Blog: every published post -> one announcement ----------
  -- Body is truncated to fit 500 chars WITHOUT ever cutting the trailing URL.
  insert into public.community_posts (id, user_id, type, body, created_at)
  select
    p.id,
    owner,
    'text',
    left(
      'New on the blog: ' || p.title ||
      case when coalesce(p.excerpt, '') <> '' then '. ' || p.excerpt else '' end,
      greatest(
        500 - length(' https://shubhamdatarkar.com/blog/' || p.category || '/' || p.slug),
        0
      )
    ) || ' https://shubhamdatarkar.com/blog/' || p.category || '/' || p.slug,
    coalesce(p.published_at, p.created_at)
  from public.posts p
  where p.status = 'published'
  on conflict (id) do nothing;

  -- ---------- Case studies + games + platform milestones (fixed rows) ----------
  -- Dates are hand-spread: client case studies over prior months (the work
  -- predates the site feature), games + platform milestones over Jun–Jul 2026.
  insert into public.community_posts (id, user_id, type, body, created_at)
  select v.id, owner, 'text', v.body, v.created_at::timestamptz
  from (values
    -- Case studies (/case-studies/{slug})
    ('5eed0001-0000-4000-8000-000000000001'::uuid,
     'Case study: tripled organic traffic (292 to 889 visits/mo) for Everything Powerlifting with a content-led SEO engine and product-page optimisation. https://shubhamdatarkar.com/case-studies/everything-powerlifting-seo',
     '2026-06-20T10:30:00+05:30'),
    ('5eed0002-0000-4000-8000-000000000002'::uuid,
     'Case study: took a Dubai bakery from invisible to ranking #1 for 40+ local searches — online orders up 212%. Local SEO end to end. https://shubhamdatarkar.com/case-studies/occasion-cakes-local-seo',
     '2026-05-18T11:00:00+05:30'),
    ('5eed0003-0000-4000-8000-000000000003'::uuid,
     'Case study: cut cost-per-install 34% for a real-money gaming app with a compliant hook library and a weekly creative-testing matrix. https://shubhamdatarkar.com/case-studies/khiladi-adda-gaming-ua',
     '2026-04-22T09:45:00+05:30'),
    ('5eed0004-0000-4000-8000-000000000004'::uuid,
     'Case study: grew a beloved vada shop from 7 to 19 outlets in 12 months with a productised franchise funnel. https://shubhamdatarkar.com/case-studies/dhawade-vadewale-franchise',
     '2026-03-15T18:20:00+05:30'),
    ('5eed0005-0000-4000-8000-000000000005'::uuid,
     'Case study: sold plotted land by turning plots into life stories — 2.6x qualified site visits, junk leads halved. https://shubhamdatarkar.com/case-studies/stone-and-acres-land-stories',
     '2026-02-28T16:10:00+05:30'),
    ('5eed0006-0000-4000-8000-000000000006'::uuid,
     'Case study: turned Meta clicks into customers for a custom-art brand — ROAS from 1.6x to 4.4x by fixing the post-click funnel. https://shubhamdatarkar.com/case-studies/corart-meta-lead-gen',
     '2026-06-05T13:00:00+05:30'),

    -- Games (/games/{game})
    ('5eed0007-0000-4000-8000-000000000007'::uuid,
     'Launched Alfazy — a daily word game. New puzzle every day, streaks and a leaderboard. https://shubhamdatarkar.com/games/alfazy',
     '2026-07-05T20:00:00+05:30'),
    ('5eed0008-0000-4000-8000-000000000008'::uuid,
     'Hit and Blow is live — crack the secret 4-digit code, one guess at a time. A fresh puzzle daily. https://shubhamdatarkar.com/games/hit-and-blow',
     '2026-07-08T20:00:00+05:30'),
    ('5eed0009-0000-4000-8000-000000000009'::uuid,
     'Third game shipped: Integra. A daily number-logic puzzle. https://shubhamdatarkar.com/games/integra',
     '2026-07-12T20:00:00+05:30'),

    -- Platform milestones
    ('5eed0010-0000-4000-8000-000000000010'::uuid,
     'Opened up the community — a public feed to build in the open. Post, poll, react, follow along. https://shubhamdatarkar.com/community',
     '2026-07-10T12:00:00+05:30'),
    ('5eed0011-0000-4000-8000-000000000011'::uuid,
     'The members platform is live: a marketing operating system with resources, tools and member-only drops. https://shubhamdatarkar.com/members',
     '2026-07-07T10:00:00+05:30'),
    ('5eed0012-0000-4000-8000-000000000012'::uuid,
     'Shipped KalamAI — a gated SEO, AEO and GEO research and writing tool. https://shubhamdatarkar.com/tools/kalamai',
     '2026-07-01T15:30:00+05:30'),
    ('5eed0013-0000-4000-8000-000000000013'::uuid,
     'Ran a full red-team security audit on the site and shipped the remediations — fail-closed admin, tighter row-level security, durable rate limiting.',
     '2026-07-11T09:00:00+05:30'),
    ('5eed0014-0000-4000-8000-000000000014'::uuid,
     'Rebuilt the homepage around one idea: getting found by AI answer engines, not just search. https://shubhamdatarkar.com',
     '2026-06-28T14:00:00+05:30'),
    ('5eed0015-0000-4000-8000-000000000015'::uuid,
     'New national SEO landing page went up. https://shubhamdatarkar.com/seo-expert-india',
     '2026-06-15T11:30:00+05:30'),
    ('5eed0016-0000-4000-8000-000000000016'::uuid,
     'The blog is now fully database-driven and I am writing in public — shipping notes, experiments and playbooks. https://shubhamdatarkar.com/blog',
     '2026-06-10T09:30:00+05:30')
  ) as v(id, body, created_at)
  on conflict (id) do nothing;

  raise notice 'community_seed: done (author %).', owner;
end $$;
