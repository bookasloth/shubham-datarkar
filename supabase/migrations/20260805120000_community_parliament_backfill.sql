-- =====================================================================
-- /community — NNAWCA (the-parliament) PR backfill.
--
-- The GitHub webhook for bookasloth/the-parliament was only created on
-- 2026-08-05 09:41 UTC, and its `shouldAnnounce` gate then silently filtered
-- every merge (the repo doesn't use Conventional-Commit titles). So PRs
-- #172–#199 shipped but never reached /community. This backdates one note per
-- PR to its merge time, in the owner's voice, tagged #NNAWCA.
--
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent:
-- auto_key uses the live `pr:{repo}#{n}` format and ON CONFLICT DO NOTHING, so
-- re-runs (and any PR that later posts through the fixed pipeline) are no-ops.
-- Everything is fenced to user_id = community_owner_id(): no other member's row
-- can be touched. Feed orders by created_at, so backdating places them in
-- history rather than at the top.
-- =====================================================================

begin;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Your alumni card used to introduce you as "2006–2013" — a date range, like a tombstone. Now it says what everyone actually calls it: 21st batch. Cover photo, a face, the works.

#NNAWCA$$, 'pr:bookasloth/the-parliament#172', '2026-08-05T10:13:22Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$A Life member — top tier, paid in full, nothing left to buy — was still being told to Get Premium. The nav was begging money off the people who'd already given the most. Fixed.

#NNAWCA$$, 'pr:bookasloth/the-parliament#173', '2026-08-05T10:19:34Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Two different files were both working out which batch number you are — two chances to disagree with each other. Now there's one. 1986 is the 1st, 2006 is the 21st, and only one function gets to say so.

#NNAWCA$$, 'pr:bookasloth/the-parliament#174', '2026-08-05T10:20:07Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The upgrade button now names your actual next rung instead of a generic "Get Premium" — Student sees Associate, Associate sees Premium, Premium sees Life. Life sees nothing, because there is nothing above it.

#NNAWCA$$, 'pr:bookasloth/the-parliament#175', '2026-08-05T10:41:30Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The alumni directory had a city filter fully built and just… not shown. Wired it up, plus sort options and search-as-you-type. Everything was already there. I'd hidden the light switch behind the sofa.

#NNAWCA$$, 'pr:bookasloth/the-parliament#176', '2026-08-05T10:47:11Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Second ad in the feed now — Hostinger. A one-person alumni network selling its own ad inventory. The media empire starts somewhere.

#NNAWCA$$, 'pr:bookasloth/the-parliament#177', '2026-08-05T10:51:54Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Drew the Hostinger banner by hand in vectors — gradient, a little browser window, a ₹149/mo pill — because stock photography was off the table. No photo, no licence, no problem.

#NNAWCA$$, 'pr:bookasloth/the-parliament#178', '2026-08-05T10:57:15Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Same upsell bug, second hiding spot: the end-of-feed "Unlock Premium" banner still showed to people who'd already unlocked everything. Whack-a-mole, mole two.

#NNAWCA$$, 'pr:bookasloth/the-parliament#179', '2026-08-05T10:59:26Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The Followers tab said "coming soon" long enough to be embarrassing. It now lists actual humans — face, name, batch, a Follow button each. No paywall on the list: gating who you can meet on a network this young would be quietly suicidal.

#NNAWCA$$, 'pr:bookasloth/the-parliament#180', '2026-08-05T11:02:49Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Turned the row of tiny social icons on your About tab into a proper "Connect with me" grid — icon plus the platform's actual name. Presentation only. Some days the work is just tidying.

#NNAWCA$$, 'pr:bookasloth/the-parliament#181', '2026-08-05T11:09:46Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Sponsored ads can wear the sponsor's own colour now instead of my orange — Hostinger's tick and button go purple. Book A Sloth stays orange. The ad finally stops cosplaying as one of my own posts.

#NNAWCA$$, 'pr:bookasloth/the-parliament#182', '2026-08-05T11:15:54Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Wrote the test that logs in as a fake alumnus and walks every page checking nothing's on fire — feed, messages, profile, the lot. Twenty-nine of them. The seeding flat refuses to run against anything that isn't a local test database, because I'd like to keep my prod data where it is.

#NNAWCA$$, 'pr:bookasloth/the-parliament#183', '2026-08-05T11:30:32Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Sharing lived in a menu, and also in a button, and also somewhere it was mislabelled as Bookmark. One Share button now, coloured icons, done. The three-dot menu goes back to what it's for: hiding and blocking people.

#NNAWCA$$, 'pr:bookasloth/the-parliament#184', '2026-08-05T11:40:44Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Widened the profile to match every other page and moved the headline up under your name instead of stranding it on its own line below. Pixels.

#NNAWCA$$, 'pr:bookasloth/the-parliament#185', '2026-08-05T11:42:15Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The committee section grew up: two clean tabs, Executive and Advisory, every office-bearer a face with a name and a role — including eleven past ones who now carry an "Ex" in front. Institutional memory, in a grid.

#NNAWCA$$, 'pr:bookasloth/the-parliament#186', '2026-08-05T11:47:00Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Squeezed the About hero so the whole pitch lands in one screen — heading, buttons, the alumni collage — no scroll needed.

#NNAWCA$$, 'pr:bookasloth/the-parliament#187', '2026-08-05T11:49:30Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Ad exposure now scales inversely with what you pay: students get a capped feed heavy with them, associates one every five posts, premium every ten, Life members never. The less you spend, the more Hostinger you meet.

#NNAWCA$$, 'pr:bookasloth/the-parliament#188', '2026-08-05T11:52:30Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The avatar on the feed profile card was being painted underneath the cover photo — technically present, entirely invisible, like it was hiding from its own account. One z-index later it sits on top.

#NNAWCA$$, 'pr:bookasloth/the-parliament#189', '2026-08-05T11:54:49Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$A pile of profile polish: a composer on your own page, coloured icons on every detail line, socials back to icon-only, and a skeleton loader shaped like an actual profile so the page stops lurching as it loads.

#NNAWCA$$, 'pr:bookasloth/the-parliament#190', '2026-08-05T11:59:18Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Turned the rules PDF nobody opens into an actual page — principles, conduct, spam, a hard student-safety section, zero-tolerance in red. A network built on a school's alumni needs its lines drawn where people can see them.

#NNAWCA$$, 'pr:bookasloth/the-parliament#191', '2026-08-05T12:10:12Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The guidelines page I shipped at noon lasted about forty-five minutes before I folded it into /rules with the bylaws underneath. Two pages became one. Speedrunning my own decisions.

#NNAWCA$$, 'pr:bookasloth/the-parliament#192', '2026-08-05T12:56:03Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The sponsored ad's headline was wrapping one word per line, strangled next to the button in a skinny column. Gave the text room to claim the space back.

#NNAWCA$$, 'pr:bookasloth/the-parliament#193', '2026-08-05T13:00:15Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$That fix from earlier made it worse — one character per line now, a vertical ransom note. Threw out the clever flex row and just stacked the text over the button like a normal person. Block elements can't collapse.

#NNAWCA$$, 'pr:bookasloth/the-parliament#194', '2026-08-05T13:06:13Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The compact About hero I was proud of an hour ago quietly broke the desktop layout — turning the section into a flex column nuked its own centred max-width. Kept the smaller headline, dropped the part that broke everything.

#NNAWCA$$, 'pr:bookasloth/the-parliament#195', '2026-08-05T13:16:50Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$The House system was quietly broken: the four pre-2002 boys' houses — Jawahar, Tilak, Subhash, Rajiv — didn't exist in the database, and the picker let anyone choose any house from any era. Rebuilt it — houses scoped by your batch year and gender, Jawahar and Aravali kept distinct even though both are blue, and not one existing alumnus's house touched. Navodaya's houses matter to people; the code finally treats them like it.

#NNAWCA$$, 'pr:bookasloth/the-parliament#196', '2026-08-05T13:35:20Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Rebuilt the admin login as a green-on-black terminal — login: and password: prompts, a blinking cursor, ACCESS DENIED if you're not an admin. Purely because it looks cool. It looks extremely cool.

#NNAWCA$$, 'pr:bookasloth/the-parliament#197', '2026-08-05T13:48:35Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Verifying an alumnus you can't personally place is hard. So now an admin can ask the candidate's batch- and house-mates to vouch — ranked by who's most likely to actually know them — and each peer clicks endorse or "don't know them". Advisory only; the final call stays human. Verification by the people who sat next to you in 1998.

#NNAWCA$$, 'pr:bookasloth/the-parliament#198', '2026-08-05T14:15:22Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

insert into public.community_posts (user_id, type, body, auto_key, created_at)
select public.community_owner_id(), 'text', $$Signup now asks your batch and house up front and actually saves them, the auth forms got real icons and a password show/hide, and a test that was crashing the whole suite over one unlucky import got untangled. New members arrive already sorted into a house. On-brand for a Navodaya network.

#NNAWCA$$, 'pr:bookasloth/the-parliament#199', '2026-08-05T14:17:32Z'
 where public.community_owner_id() is not null
on conflict (auto_key) where auto_key is not null do nothing;

commit;
