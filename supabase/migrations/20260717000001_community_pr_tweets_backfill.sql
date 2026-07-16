-- =====================================================================
-- /community — PR tweet backfill: genesis post, reworked PR-post bodies,
-- backdated PR posts for both repos since /community launch (2026-07-10).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- Everything is fenced to user_id = community_owner_id(): no other member's
-- row can be touched by construction.
--
-- 1. DELETE 4 existing auto-posts (pipeline-revealing or smoke-test copy).
-- 2. UPDATE 9 existing auto-post bodies in place (UUID PK unchanged, so
--    votes/replies/bookmarks survive).
-- 3. INSERT the genesis post at explicit public_id 202600000000, backdated
--    1 hour before the current oldest post (the assign trigger only fills
--    public_id when NULL, so the explicit value sticks).
-- 4. INSERT 114 backdated PR posts in merge order (the live sequence hands
--    out ascending public_ids). auto_key uses the current pr:{repo}#{n}
--    format; ON CONFLICT (auto_key) DO NOTHING makes re-runs no-ops.
-- =====================================================================

begin;

-- ---------- 1. deletes ----------
-- chore date bump, body admits webhook smoke test
delete from public.community_posts
 where auto_key = 'pr:206' and user_id = public.community_owner_id();
-- pipeline reveal - current live body says 'PR auto-post tweets'
delete from public.community_posts
 where auto_key = 'pr:207' and user_id = public.community_owner_id();
-- pipeline reveal - multi-repo auto-posts
delete from public.community_posts
 where auto_key = 'pr:210' and user_id = public.community_owner_id();
-- pipeline reveal - PR carries own tweet
delete from public.community_posts
 where auto_key = 'pr:bookasloth/shubham-datarkar#212' and user_id = public.community_owner_id();

-- ---------- 2. body rewrites ----------
update public.community_posts set body = 'Main had been quietly red — four tests failing on a clean checkout. Fixed each at the end that was actually wrong: two were bad tests, two were bad code. 468 of 468 green.'
 where auto_key = 'pr:211' and user_id = public.community_owner_id();
update public.community_posts set body = 'The Book A Sloth blog index was a wall of text while every post page already had generated art. The cards now borrow it — the featured post gets a split card, the grid gets art bands. Also /blogs finally goes to /blog.'
 where auto_key = 'pr:bookasloth/book-a-sloth#381' and user_id = public.community_owner_id();
update public.community_posts set body = 'Games UI cleanup, part one: the duplicate top nav is gone (the sidebar already had Play, Archive and Leaderboard), boards are five tabs from Today to Best streak, and the archive grid and share card got their pass. Ten of thirteen review items down.'
 where auto_key = 'pr:bookasloth/shubham-datarkar#213' and user_id = public.community_owner_id();
update public.community_posts set body = 'Solving a puzzle from the archive never counted — not recorded at all, no fire, no Solved filter match. It was blocked on purpose, because recording used to be welded to streaks. Unwelded: archive solves count as solved now, and streaks still only come from dailies.'
 where auto_key = 'pr:bookasloth/shubham-datarkar#214' and user_id = public.community_owner_id();
update public.community_posts set body = 'Average solve time always showed a dash because no board ever sent a time. The obvious fix was a stopwatch in the browser — wrong, because solve time breaks leaderboard ties, and whoever holds the stopwatch decides the tiebreak. The server times you now.'
 where auto_key = 'pr:bookasloth/shubham-datarkar#215' and user_id = public.community_owner_id();
update public.community_posts set body = 'A crawler that doesn''t run JavaScript saw /blogs answer 200 like a real page — the app only redirected after it booted. Vercel answers with a 301 before the app even loads now. Google gets a straight answer.'
 where auto_key = 'pr:bookasloth/book-a-sloth#382' and user_id = public.community_owner_id();
update public.community_posts set body = 'A two-day streak drew two flames next to the puzzle title — the badge was multiplying the icon, capped at four. One flame plus the count now.'
 where auto_key = 'pr:bookasloth/shubham-datarkar#216' and user_id = public.community_owner_id();
update public.community_posts set body = 'Your streak died the second you looked at it. Schrödinger''s Alfazy: the win only survived while you never checked. Fixed.'
 where auto_key = 'pr:bookasloth/shubham-datarkar#217' and user_id = public.community_owner_id();
update public.community_posts set body = 'Archive boards showed the streak flame as if winning there would extend your streak. It won''t — archives never touch streaks — so the badge only shows on the daily board.'
 where auto_key = 'pr:bookasloth/shubham-datarkar#218' and user_id = public.community_owner_id();

-- ---------- 3. genesis (public_id 202600000000) ----------
insert into public.community_posts (user_id, type, body, auto_key, public_id, created_at)
select public.community_owner_id(), 'text',
       'Finally, a social network that can''t ban me. I checked with the owner.',
       'genesis', 202600000000,
       coalesce((select min(created_at) from public.community_posts), now()) - interval '1 hour'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;

-- ---------- 4. backdated PR posts (merge order) ----------
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Everyone said don''t build a social network. Anyway, mine has rotten-egg downvotes and yours doesn''t.', 'pr:bookasloth/shubham-datarkar#104', '2026-07-10T03:51:14Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Locked myself out of my own admin. The two bouncers at my door kept handing me to each other. Fired one. I''m back in.', 'pr:bookasloth/shubham-datarkar#105', '2026-07-10T04:38:10Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'If the games kept logging you out for no reason: there was a reason. I was eating your cookies mid-redirect. Sorry. Fixed.', 'pr:bookasloth/shubham-datarkar#106', '2026-07-10T05:36:22Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'My SEO dashboard flunked all 104 pages. Turns out it was grading the essays without opening them. 570 of the failures were the dashboard''s.', 'pr:bookasloth/shubham-datarkar#108', '2026-07-10T11:12:32Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Closed a small injection risk in how the site embeds structured data. Boring on purpose. Fixed.', 'pr:bookasloth/shubham-datarkar#107', '2026-07-10T11:15:50Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The sitemap spent weeks personally inviting Google to the login page. My audit swore it wasn''t happening. Both replaced by one list that can''t lie.', 'pr:bookasloth/shubham-datarkar#109', '2026-07-10T12:32:00Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Rewrote my homepage. The old hero pitched premium services to ''startups just getting started'' — people it priced out in the same sentence. The new front door sells to people who can actually walk through it.', 'pr:bookasloth/shubham-datarkar#110', '2026-07-10T13:23:08Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'I''d left Google a do-not-index note, then locked the door it needed to open to read it. That''s what robots.txt Disallow does to a noindex tag. 37 routes untangled.', 'pr:bookasloth/shubham-datarkar#111', '2026-07-10T16:26:27Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'New tool taking shape here: KalamAI, an SEO research and writing engine. Phase 1 cost exactly zero in API calls, because the foundation is just discipline and Postgres.', 'pr:bookasloth/shubham-datarkar#112', '2026-07-10T16:48:14Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Google thought there were a hundred of me — every page introduced a brand-new Shubham. Merged all hundred into one guy with an @id. Existential crisis, resolved in JSON.', 'pr:bookasloth/shubham-datarkar#113', '2026-07-10T17:52:39Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Hand-wrote titles and descriptions for 32 pages today. Nobody will ever compliment a meta description. Google reads every one.', 'pr:bookasloth/shubham-datarkar#115', '2026-07-10T17:53:29Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'KalamAI''s research engine is alive: reads the SERP, crawls the competition, does the math, writes the brief. Exactly one AI call in the whole pipeline. The rest is arithmetic older than I am.', 'pr:bookasloth/shubham-datarkar#114', '2026-07-10T17:54:45Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Someone subscribed to my newsletter as an entire YouTube channel URL. The regex said ''looks like an email to me.'' The regex has been replaced. The channel has not been notified.', 'pr:bookasloth/shubham-datarkar#116', '2026-07-10T18:52:46Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'This site''s extra-dark theme now hands you a diya. Carry it with your cursor, leave lit lamps where you click, and the seventh one turns the whole page to morning.', 'pr:bookasloth/shubham-datarkar#117', '2026-07-11T05:29:07Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Sunrise was instant — seventh diya and the page slammed to white like a fridge door opening. Now the light builds warm, holds, then breaks like an actual dawn.', 'pr:bookasloth/shubham-datarkar#118', '2026-07-11T06:09:10Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Ran a security audit against my own site. Fixed all ten findings. That''s the whole tweet — security notes don''t belong on a feed.', 'pr:bookasloth/shubham-datarkar#120', '2026-07-11T06:56:00Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'New page: SEO Expert in India. No fake stars, no bought reviews, no schema tricks. If I can''t rank this honestly, why would you hire me? Watch it climb.', 'pr:bookasloth/shubham-datarkar#119', '2026-07-11T07:18:02Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Site search now slips a hosting deal in as the second result. First-person copy, my actual referral link, never on an empty query. The search bar has a side hustle.', 'pr:bookasloth/shubham-datarkar#122', '2026-07-11T07:54:06Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Changed one word on one badge. ''Recommendation'' is now ''Deal''. I will be taking the rest of the day off.', 'pr:bookasloth/shubham-datarkar#123', '2026-07-11T08:01:26Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The community rail now runs designed house ads instead of dashed placeholders. First advertiser: me. Second: a hosting company. Ad sales team of one, fully booked.', 'pr:bookasloth/shubham-datarkar#124', '2026-07-11T08:16:57Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Torch mode, take three: one diya riding the cursor, blue flame by day, warm after 7PM IST. The seven-lamp sunrise? Shipped it at 5:29 this morning. Killed it by 8:31. Craftsmanship.', 'pr:bookasloth/shubham-datarkar#126', '2026-07-11T08:31:36Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Until this morning, forgetting your password here was permanent. No reset link — that email was just gone. There''s a reset now, plus magic links, so the site forgives.', 'pr:bookasloth/shubham-datarkar#125', '2026-07-11T08:33:36Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The site had three different login pages for the same account. Why? Couldn''t tell you. It''s one now, and the other two just quietly redirect.', 'pr:bookasloth/shubham-datarkar#128', '2026-07-11T08:37:21Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Hid the ConvertKit panel from my admin. It''s been doing nothing for months. Now it does nothing invisibly.', 'pr:bookasloth/shubham-datarkar#129', '2026-07-11T10:42:51Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Members, Community, Games and Account each had their own idea of what this site looks like. Gave them one shell — one top bar, one sidebar, one Cmd-K search. It finally feels like one product.', 'pr:bookasloth/shubham-datarkar#130', '2026-07-11T11:28:06Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Got tired of logging into Hostinger webmail, so I built my inbox straight into the admin. Read and reply only — no folders, no search, I know. It''s enough.', 'pr:bookasloth/shubham-datarkar#132', '2026-07-11T12:28:05Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Turns out new subscribers were getting... nothing. The welcome email existed, fully designed — I just never wired it to send. Wired now. Sorry to the quiet weeks of signups.', 'pr:bookasloth/shubham-datarkar#131', '2026-07-11T12:29:58Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The admin can now send campaign emails: pick a template, test to myself first, then send to everyone — behind a confirm checkbox that shows exactly how many people I''m about to bother.', 'pr:bookasloth/shubham-datarkar#133', '2026-07-11T12:43:53Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Asked myself what happens to Book A Sloth if a thousand people search at once. Then remembered we have 27 hosts. Added a cache and a rate limit anyway. Cheap insurance.', 'pr:bookasloth/book-a-sloth#346', '2026-07-11T13:19:15Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The site''s rate limiter used to forget everything on every cold start — serverless amnesia. It remembers now, in Redis. One less audit item.', 'pr:bookasloth/shubham-datarkar#135', '2026-07-11T13:22:56Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Hotfix on Book A Sloth: in the window between a migration and its deploy, old server code could write bookings that slipped past the new double-booking guard. One COALESCE closes it. Deploy-timing bugs are the sneaky ones.', 'pr:bookasloth/book-a-sloth#348', '2026-07-11T13:33:07Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The Sloth dashboard no longer hides under your phone''s notch. Small one.', 'pr:bookasloth/book-a-sloth#342', '2026-07-11T14:23:55Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'My new security header was so strict it blocked every image on my own site. Every single one, silently. Allowlisted my own CDNs. Progress.', 'pr:bookasloth/shubham-datarkar#136', '2026-07-11T14:38:14Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Deleted five dead components from the Sloth codebase. Zero imports, zero regrets.', 'pr:bookasloth/book-a-sloth#349', '2026-07-11T14:48:37Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'New case study up: a powerlifting gear brand, content-led SEO. 292 to 889 monthly organic visits, ''deadlift shoes'' from #5 to #2. No made-up quote, no invented budget — just the Semrush numbers.', 'pr:bookasloth/shubham-datarkar#137', '2026-07-11T15:03:15Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Rebuilt Book A Sloth''s Explore page around an actual scoring engine — every service gets a 0-100 quality score and search ranks against it. The enterprise-scale machinery stays in the drawer until the numbers earn it.', 'pr:bookasloth/book-a-sloth#350', '2026-07-11T15:07:02Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Follow-up: Sloth service scores now recompute themselves — a trigger on every booking and review, plus a Friday-night full pass. Static numbers age badly.', 'pr:bookasloth/book-a-sloth#351', '2026-07-11T15:26:29Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Reworked the burger menu: About is now The Kalamwala, Work is Case Files, added Reach Me, and the top-bar CTA points at the community instead of my calendar.', 'pr:bookasloth/shubham-datarkar#138', '2026-07-11T15:43:13Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Book A Sloth''s blog was eleven posts hardcoded into the bundle — there wasn''t even a blogs table to insert into. There is now. Same renderer, posts live in Postgres, plus a new host guide on how Explore ranking actually works.', 'pr:bookasloth/book-a-sloth#352', '2026-07-11T18:36:16Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The Sloth blog showed ''Jul 10'' on posts published Jul 11 — the server thinks in UTC, the product lives in IST. Pinned it.', 'pr:bookasloth/book-a-sloth#353', '2026-07-11T18:45:53Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The /membership page is real now: what you get, ₹99/month or ₹999/year, five CTAs that all lead to creating an account. Perks that aren''t live yet say ''coming soon'', because lying on a pricing page is a terrible growth strategy.', 'pr:bookasloth/shubham-datarkar#139', '2026-07-11T18:47:54Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Added a native share button to the Sloth profile card — and found an icon being used without being imported, so main wouldn''t even have built. Committed, cleaned, moving on.', 'pr:bookasloth/book-a-sloth#354', '2026-07-11T19:11:58Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Inside /games the brand orange retires — each game gets its logo colour instead: Alfazy green, Hit & Blow blue, Integra violet. One CSS variable override per scope. 7 files, +25/−6.', 'pr:bookasloth/shubham-datarkar#140', '2026-07-12T00:58:52Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Gave Integra its missing results and leaderboard pages, and the new page immediately exposed a bug: the answer resolver had no Integra branch, so a math game was serving the word ''twist'' as an answer. Fixed. All three games share one keyboard now.', 'pr:bookasloth/shubham-datarkar#143', '2026-07-12T01:04:31Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The /games page grew up: per-game cards in their own colours, your streak on each, and Played / Best streak / Won tiles if you have history. Signed out you get the plain cards.', 'pr:bookasloth/shubham-datarkar#145', '2026-07-12T01:18:36Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The community composer now greets you by name, and the post-type picker is proper cards instead of text pills. Monochrome, as everything here must be.', 'pr:bookasloth/shubham-datarkar#146', '2026-07-12T01:41:49Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Service pricing, rewritten. SEO retainers now start at ₹6,999 a month instead of ₹1.5L. Same work, honest packaging — I''d rather be busy than impressive.', 'pr:bookasloth/shubham-datarkar#147', '2026-07-12T01:55:30Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The members upgrade page is now one button. Click it, pick monthly or yearly, yearly pre-selected with 2 months free — and the savings are computed from the real prices, not typed in as marketing.', 'pr:bookasloth/shubham-datarkar#148', '2026-07-12T02:15:44Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Composer, round two: proper tabs, drag-and-drop images with captions, and polls can be quizzes now — same poll, one answer marked correct. No new tables; the quiz lives inside the poll''s json.', 'pr:bookasloth/shubham-datarkar#149', '2026-07-12T02:22:44Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'All three games now share the same Help, Stats and Settings, a first-visit how-to-play, and a proper end card for logged-out players. Alfazy and Hit and Blow had, until today, essentially none of that.', 'pr:bookasloth/shubham-datarkar#150', '2026-07-12T02:35:44Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'You can now add your name, birthday, location and WhatsApp to your account — all optional, locked so only you can read them. Why birthday? The site sends birthday wishes at 8:30 IST now. Yes I built that. No I''m not sorry.', 'pr:bookasloth/shubham-datarkar#151', '2026-07-12T02:46:15Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Admin can now hide, demote or delete a post right from the feed''s three-dots menu instead of walking to the admin panel.', 'pr:bookasloth/shubham-datarkar#152', '2026-07-12T02:47:04Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Someone could POST the word ''true'' to a payment endpoint and get a 500 where a 400 belonged. Not dangerous, just sloppy. Guarded.', 'pr:bookasloth/shubham-datarkar#154', '2026-07-12T04:23:02Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Deleted posts used to throw you onto a full-screen 404, chrome and all gone. Now the feed stays put and just the post pane says ''This post is gone.'' Like Twitter, but with fewer lawyers.', 'pr:bookasloth/shubham-datarkar#155', '2026-07-12T04:35:36Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Community post links used to be 36 characters of UUID soup. Now they''re numbers — shubhamdatarkar.com/community/p/202600000042 — and old links 301 to the new ones.', 'pr:bookasloth/shubham-datarkar#157', '2026-07-12T06:05:04Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Redesigned the two sidebar ads on community: Hostinger up top as a recommendation, Book A Sloth below as the partner card. Real logos, real links, no more placeholder dashes.', 'pr:bookasloth/shubham-datarkar#159', '2026-07-12T06:41:28Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Post cards are now clickable everywhere, like they always should have been — tap anywhere for the post, while polls, links and buttons keep their own clicks. Getting that overlap right without breaking HTML took longer than I''ll admit.', 'pr:bookasloth/shubham-datarkar#158', '2026-07-12T06:51:58Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The like button now bursts — a ring and six sparks — reblog does a full spin, and every tap registers instantly. All of it pointless, all of it staying.', 'pr:bookasloth/shubham-datarkar#160', '2026-07-12T07:16:19Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Long URLs in posts were eating three lines each. Every link now renders as shubhamdatarkar.com/s/{code} — seven characters, redirects to the original, works on old posts too without touching them.', 'pr:bookasloth/shubham-datarkar#161', '2026-07-13T08:31:31Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The rotten egg is dead. I removed downvotes from community entirely — the medal now points at /support, share moved into the three-dots. If you disagree with a post you''ll have to use words.', 'pr:bookasloth/shubham-datarkar#162', '2026-07-13T08:57:30Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Any community post can now be downloaded as a 1080×1350 image card — my monochrome take on the screenshot-a-tweet thing. It''s in the three-dots menu, works logged out too.', 'pr:bookasloth/shubham-datarkar#163', '2026-07-13T11:06:26Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The ''Projects I''m working on'' grid on /support had six broken logos and every Visit link pointed at #. Nobody told me. All six load now, and the tiles go somewhere real.', 'pr:bookasloth/shubham-datarkar#164', '2026-07-13T11:47:36Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Everyone gets a proper avatar now — one of 12 icons picked deterministically from your username. Looks random, never changes, and it needed zero new database columns.', 'pr:bookasloth/shubham-datarkar#165', '2026-07-13T12:14:38Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The community composer no longer squats at the top of the feed. It''s a floating pencil now, bottom-left — modal on desktop, bottom sheet on mobile. The feed opens with posts, as a feed should.', 'pr:bookasloth/shubham-datarkar#166', '2026-07-13T12:34:20Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The downloadable post card went flat grey: orange favicon where the bird used to be, name and handle stacked beside a square avatar. Instagram-portrait, same pipeline underneath.', 'pr:bookasloth/shubham-datarkar#167', '2026-07-13T12:59:18Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Click a link, stare at a frozen screen, wonder if it worked — that was this site until today. Now: a progress bar on every navigation, skeletons while things load, spinners on every Save.', 'pr:bookasloth/shubham-datarkar#168', '2026-07-13T13:39:51Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Shipped a cleanup to Book A Sloth and the squash merge swallowed unrelated work from a branch race — so I landed it again, clean. 663 lines of dead code gone, and four landing pages now share one kit instead of four identical copies.', 'pr:bookasloth/book-a-sloth#357', '2026-07-13T14:37:16Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Supporters on /support are clickable now — a side panel with their tier, totals, and the note they left. Notes show even for anonymous supporters; names stay hidden. A crown for Pillars, a shield for Guardians.', 'pr:bookasloth/shubham-datarkar#169', '2026-07-13T15:43:20Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Took the reaction bar off individual update posts. An update doesn''t need you to rate it. Comments stay.', 'pr:bookasloth/shubham-datarkar#170', '2026-07-13T16:08:50Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Book A Sloth has an /enterprise page now — fifteen sections, a 20-item FAQ, and a lead form, positioning the booking engine for organisations that need branches and staff, not just a calendar link. Built by cloning our own landing-page pattern; zero new dependencies.', 'pr:bookasloth/book-a-sloth#358', '2026-07-13T16:24:14Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'A user got stuck before their first login — the confirmation email never arrived, retries hit rate limits, dead end. So the admin can now set a password directly, no email round-trip, and it confirms the account in the same call.', 'pr:bookasloth/shubham-datarkar#171', '2026-07-13T17:09:14Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Noticed our upvote was a filled heart. A heart says ''I like this''; the button says ''Upvote''. It''s a thumbs-up now. Also single images render uncropped instead of forced 16:9 — portrait posts stop losing their heads.', 'pr:bookasloth/shubham-datarkar#172', '2026-07-13T17:14:13Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Opened up the avatar menu: your icon and handle up top, profile, membership status or an upgrade nudge, KalamAI, settings, help, sign out, theme switcher. Every route already existed — the menu just finally admits it.', 'pr:bookasloth/shubham-datarkar#173', '2026-07-13T17:57:49Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The two buttons in the profile menu now swap styles on hover — the ghost one fills, the solid one goes ghost. That''s the whole PR.', 'pr:bookasloth/shubham-datarkar#174', '2026-07-13T18:06:23Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Sidebar restyle: the left rail floats as its own card now, and the active section wears an orange pill — the one accent allowed in all this monochrome.', 'pr:bookasloth/shubham-datarkar#175', '2026-07-13T18:21:53Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Refer & Earn is live for Book A Sloth hosts: refer a host, and when they subscribe you earn cash — real money through the payout system, not credits. Rewards hold for a window and claw back if the referred host churns. The accounting has its own ledger line.', 'pr:bookasloth/book-a-sloth#359', '2026-07-14T07:18:32Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The Sloth navbar''s Pricing link pointed at a homepage anchor instead of the pricing page. Two links, fixed.', 'pr:bookasloth/book-a-sloth#361', '2026-07-14T10:47:08Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Re-centered the whole app: sidebar, a fixed 600px middle, and an optional right rail in one 1240px container. The left rail finally sits next to the content instead of hugging the viewport edge.', 'pr:bookasloth/shubham-datarkar#176', '2026-07-14T14:27:47Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Games got a right rail: how to play, tile guide, today''s stats, and the other games. The streak flame moved inline next to the puzzle title — it flares when you win today''s game.', 'pr:bookasloth/shubham-datarkar#179', '2026-07-14T14:29:17Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Members pages get a LinkedIn-style right column: two blog picks, today''s puzzles, and the Book A Sloth card. One 5-line helper for the random blog picks; no new queries.', 'pr:bookasloth/shubham-datarkar#180', '2026-07-14T14:30:25Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Archive pages redone for all three games: streak, win rate, average solve time and solved count up top, filters and search below, and a fire icon on every puzzle you''ve solved. The fire only means solved now — no participation flames.', 'pr:bookasloth/shubham-datarkar#181', '2026-07-14T15:16:37Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Deleted the Results tab from all three games. Built it two days ago. It duplicated what the leaderboard already shows, so it went.', 'pr:bookasloth/shubham-datarkar#182', '2026-07-14T15:25:07Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Leaderboard redesign: a real podium — gold, silver, bronze, heights 2-1-3 — display names instead of raw usernames, and one dropdown for Daily / Weekly / Monthly / Streak instead of four tabs.', 'pr:bookasloth/shubham-datarkar#183', '2026-07-14T15:32:02Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The game header was doing too much. Help, Stats and Settings moved into the right rail as permanent cards — the guide now leads with a worked example instead of colour swatches, and nothing pops over your first visit anymore.', 'pr:bookasloth/shubham-datarkar#184', '2026-07-14T15:44:57Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Community posts are individual cards now instead of one long table, the engagement bar follows Twitter''s order — comments first — and the compose pencil moved to the bottom-right, where thumbs actually are.', 'pr:bookasloth/shubham-datarkar#185', '2026-07-14T18:12:42Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Trimmed the games rail to two cards — Guide and Other games — and put the winner''s name inside the podium block instead of floating above it. The streak board only brags about your best now.', 'pr:bookasloth/shubham-datarkar#186', '2026-07-14T18:19:25Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The guide''s example tiles were painting transparent — the colour variables lived on a wrapper around the board, and the rail sits outside it. Hoisted the provider one level up. Invisible example tiles: not a great teaching aid.', 'pr:bookasloth/shubham-datarkar#187', '2026-07-14T18:32:23Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Dropped the outer border from the feed column. The cards have their own.', 'pr:bookasloth/shubham-datarkar#188', '2026-07-14T18:58:47Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Declined requests no longer sit on a member''s request list. The rows stay in the database though — declining something shouldn''t quietly rewrite history.', 'pr:bookasloth/shubham-datarkar#189', '2026-07-14T19:02:22Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Upload a photo in the composer and you got a filename row that overflowed on long names. Photos now preview as thumbnails inside the drop area, each with its own remove button. PDFs elsewhere keep the filename row — they have nothing to show off.', 'pr:bookasloth/shubham-datarkar#190', '2026-07-14T19:11:59Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'All three games were counting puzzles from one 2025 epoch — today was #560 everywhere, which made every game look older than it is. Each now numbers from its own launch: Alfazy #75, Integra #44, Hit and Blow #14. Honest numbers, fresh scrambles.', 'pr:bookasloth/shubham-datarkar#191', '2026-07-14T19:37:30Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Verifying yesterday''s reset, found the streaks table had survived it — leaderboards were showing streaks with zero games behind them. Wiped it too.', 'pr:bookasloth/shubham-datarkar#192', '2026-07-14T19:42:06Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The games rail took up to 1.3 seconds to appear after every navigation — for content that never changes. It was a server component held hostage by the layout''s auth check. It''s client-side now; it just shows up.', 'pr:bookasloth/shubham-datarkar#196', '2026-07-14T19:54:56Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Alfazy now serves a fixed word on about a hundred observance days — EARTH on April 22, INDIA on August 15, keyed to IST so they recur every year on their own. The dictionary learned the theme words too, so every one of them stays typeable.', 'pr:bookasloth/shubham-datarkar#194', '2026-07-14T19:55:41Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The /games hub got real art on its cards, and winning any game now fires the same two-cannon confetti as the support page. Why maintain two celebrations.', 'pr:bookasloth/shubham-datarkar#195', '2026-07-14T20:03:29Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Podium blocks went wide and short so long names wrap instead of clipping, and ranks 1-3 now appear in the table below with their stats.', 'pr:bookasloth/shubham-datarkar#197', '2026-07-14T20:19:07Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Below 1280px the games rail wasn''t hidden by design — it was just unreachable, display:none with no fallback. It now stacks under the board on smaller screens. Also the how-to-play card shrank, and Other Games looks like NYT''s puzzle list, which I''m not ashamed to admit.', 'pr:bookasloth/shubham-datarkar#198', '2026-07-15T04:45:13Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Cleared Google''s OAuth verification warnings for Book A Sloth — incremental auth live, a receiver drafted so Google can warn us if a host''s account gets compromised, and the Limited Use disclosure. Checkbox work, done properly.', 'pr:bookasloth/book-a-sloth#365', '2026-07-15T09:41:00Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Studio plans on Book A Sloth just got their backend: client records derived from bookings, notes, walk-ins — the CRM features the pricing page has been promising. Server first, UI next.', 'pr:bookasloth/book-a-sloth#363', '2026-07-15T09:51:31Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Phone numbers on Book A Sloth bookings are now redacted server-side — a guest''s number reveals to Studio hosts 15 minutes before the meeting, a host''s only for in-person visits. If the platform does the work, the booking stays on the platform.', 'pr:bookasloth/book-a-sloth#366', '2026-07-15T10:30:02Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Turns out the map-link feature I merged this morning never actually reached main — the merge landed a planning document instead of the code. Restored the real thing: hosts add a Google Maps link, and in-person guests get directions in their confirmation, email, calendar, and WhatsApp.', 'pr:bookasloth/book-a-sloth#367', '2026-07-15T10:33:21Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Added the consent line under the Google sign-in button on be-a-sloth and caught the changelog up on the week: CRM, map links, phone gating, Refer & Earn.', 'pr:bookasloth/book-a-sloth#368', '2026-07-15T12:05:15Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Rebuilt the ''You''re all set'' screen after booking: sloth avatar with a check badge, a boxed confirmation-email card, icons on every detail row and action button. All inline SVGs — no icon library invited.', 'pr:bookasloth/book-a-sloth#369', '2026-07-15T12:14:34Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Admin side of Book A Sloth: a Host 360 view — one page per host aggregating their bookings, payments, subscriptions, support history, notes and documents across seven tabs. Not a new system, just every existing module finally in one place.', 'pr:bookasloth/book-a-sloth#370', '2026-07-15T15:50:47Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', '34 branded transactional emails now render through one shell — welcome, OTP, membership activated, payment failed, the lot. Each gets exactly one GIF. There''s a preview page in the admin so I stop testing email design in production inboxes.', 'pr:bookasloth/shubham-datarkar#199', '2026-07-15T18:49:10Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Five scheduled emails join the dispatcher: a Monday community digest, a first-post nudge, a monthly member digest, weekly game leaderboards, and a streak reminder if you''re about to lose a 3-day run. All deduped — nobody gets nagged twice.', 'pr:bookasloth/shubham-datarkar#200', '2026-07-15T19:16:54Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Service pages on Book A Sloth traded the host-picked mesh backgrounds for one flat dark band — and the sidebar stopped telling hosts with plenty of bookings that they had 0.', 'pr:bookasloth/book-a-sloth#371', '2026-07-15T19:40:59Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'The diya in extra-dark mode can blow out now — flick the cursor hard and you''re left with an ember and a wisp of smoke. Carry it to the theme beacon to relight. Phones fall back to plain dark; a cursor game needs a cursor.', 'pr:bookasloth/shubham-datarkar#201', '2026-07-15T19:53:09Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Signup confirmation emails are branded now instead of Supabase''s default, and the welcome only fires after you actually verify. The newsletter welcome also gained a ''wasn''t you?'' unsubscribe link — subscribing someone else''s email shouldn''t stick.', 'pr:bookasloth/shubham-datarkar#202', '2026-07-16T04:30:22Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Logged-in visitors get ''Welcome, {username}'' in the header where Join Community sat, with a ripple that animates inside the pill. The layout stays static — your name loads client-side, so the page stays fast for everyone signed out.', 'pr:bookasloth/shubham-datarkar#203', '2026-07-16T04:31:15Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Took the blog card off the members rail. The games and partner cards stay.', 'pr:bookasloth/shubham-datarkar#205', '2026-07-16T04:50:57Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Hosts were stuck on KYC step one forever — every Continue wiped their PAN and Aadhaar and dumped them back at the start. The page-transition animation was unmounting the form''s memory on every step. Moved the state above the animation. Hosts can actually finish KYC now.', 'pr:bookasloth/book-a-sloth#374', '2026-07-16T09:30:19Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Ran an audit expecting Host 360 had broken KYC — it hadn''t, but the audit found real gaps anyway: document access is now permission-gated, and every reveal of a host''s ID numbers is logged with who and why.', 'pr:bookasloth/book-a-sloth#375', '2026-07-16T10:18:30Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;
insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', 'Tag people with @ in the community now. They''ll get an email about it. Use it responsibly, or don''t — I''m not your manager.', 'pr:bookasloth/shubham-datarkar#209', '2026-07-16T10:51:31Z'
 where public.community_owner_id() is not null
on conflict (auto_key) do nothing;

commit;

-- rollback (manual, if ever needed):
-- delete from public.community_posts where auto_key = 'genesis';
-- delete from public.community_posts where auto_key like 'pr:%' and created_at < '2026-07-16' and user_id = public.community_owner_id();
