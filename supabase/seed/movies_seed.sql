-- Movie module demo/seed content. Apply MANUALLY after 20260908000001_movies.sql.
-- Idempotent (safe to re-run). Metadata here is factual (title/year/runtime/
-- director) and the review text is original editorial — no copyrighted prose.
-- Posters/backdrops are left null on purpose: enrich real entries via the admin
-- "Import from TMDB" flow, which fills artwork from the API. Missing art falls
-- back to a tasteful title tile.

-- ===========================================================================
-- MOVIES
-- ===========================================================================
insert into public.movies
  (title, slug, overview, tagline, release_date, release_year, runtime, original_language, country, director, moods, age_rating, is_published)
values
  ('Whiplash', 'whiplash', 'A young drummer chases greatness under a teacher who believes cruelty is the price of it.', 'The road to greatness can leave you bloody.', '2014-10-10', 2014, 106, 'en', 'United States', 'Damien Chazelle', ARRAY['Intense','Inspirational'], 'R', true),
  ('Parasite', 'parasite', 'A poor family schemes their way into the home of a wealthy one, until the arrangement curdles.', 'Act like you own the place.', '2019-05-30', 2019, 132, 'ko', 'South Korea', 'Bong Joon-ho', ARRAY['Dark','Tense','Thought-Provoking'], 'R', true),
  ('Inception', 'inception', 'A thief who steals secrets from dreams is offered one last job: plant an idea instead of stealing one.', 'Your mind is the scene of the crime.', '2010-07-16', 2010, 148, 'en', 'United States', 'Christopher Nolan', ARRAY['Mind-Bending','Intense'], 'PG-13', true),
  ('The Grand Budapest Hotel', 'the-grand-budapest-hotel', 'A legendary concierge and his protégé chase a stolen painting through a fictional pre-war Europe.', 'A perfect getaway.', '2014-03-07', 2014, 99, 'en', 'United States', 'Wes Anderson', ARRAY['Funny','Wholesome','Nostalgic'], 'R', true),
  ('Spirited Away', 'spirited-away', 'A sulky ten-year-old wanders into a spirit world and must work to free her parents and herself.', 'The tunnel led to a world of spirits.', '2001-07-20', 2001, 125, 'ja', 'Japan', 'Hayao Miyazaki', ARRAY['Wholesome','Emotional'], 'PG', true),
  ('No Country for Old Men', 'no-country-for-old-men', 'A hunter finds two million dollars and a relentless killer who wants it back.', 'There are no clean getaways.', '2007-11-09', 2007, 122, 'en', 'United States', 'Joel Coen, Ethan Coen', ARRAY['Dark','Tense'], 'R', true),
  ('Coco', 'coco', 'A boy who dreams of music crosses into the Land of the Dead to uncover his family''s history.', 'The celebration of a lifetime.', '2017-11-22', 2017, 105, 'en', 'United States', 'Lee Unkrich', ARRAY['Emotional','Feel Good'], 'PG', true),
  ('Blade Runner 2049', 'blade-runner-2049', 'A replicant hunter uncovers a secret that could unravel what''s left of society.', 'The key to the future is finally unearthed.', '2017-10-06', 2017, 164, 'en', 'United States', 'Denis Villeneuve', ARRAY['Dark','Thought-Provoking'], 'R', true),
  ('Portrait of a Lady on Fire', 'portrait-of-a-lady-on-fire', 'On an isolated island, a painter falls for the woman she has been secretly commissioned to paint.', 'She burns in every frame.', '2019-09-18', 2019, 122, 'fr', 'France', 'Céline Sciamma', ARRAY['Emotional','Relaxing'], 'R', true),
  ('The Lives of Others', 'the-lives-of-others', 'An East German surveillance officer is slowly changed by the artists he is paid to spy on.', 'Before the Wall fell, everyone was listening.', '2006-03-23', 2006, 137, 'de', 'Germany', 'Florian Henckel von Donnersmarck', ARRAY['Tense','Emotional'], 'R', true),
  ('Andhadhun', 'andhadhun', 'A pianist pretending to be blind stumbles into a murder and can no longer look away.', 'What you see isn''t what you get.', '2018-10-05', 2018, 139, 'hi', 'India', 'Sriram Raghavan', ARRAY['Tense','Mind-Bending'], 'NR', true),
  ('Tumbbad', 'tumbbad', 'A family guards a cursed secret across generations, greed pulling them deeper into the dark.', 'Some treasures should stay buried.', '2018-10-12', 2018, 104, 'hi', 'India', 'Rahi Anil Barve', ARRAY['Dark','Intense'], 'NR', true),
  ('Everything Everywhere All at Once', 'everything-everywhere-all-at-once', 'A tired laundromat owner discovers she must connect with parallel versions of herself to save existence.', 'The universe is so much bigger than you realize.', '2022-03-25', 2022, 139, 'en', 'United States', 'Daniel Kwan, Daniel Scheinert', ARRAY['Mind-Bending','Emotional'], 'R', true),
  ('Chef', 'chef', 'A burned-out chef rebuilds his love for cooking — and his son — from a beat-up food truck.', 'Starting from scratch never tasted so good.', '2014-05-09', 2014, 114, 'en', 'United States', 'Jon Favreau', ARRAY['Feel Good','Relaxing'], 'R', true),
  ('Before Sunrise', 'before-sunrise', 'Two strangers meet on a train and spend one night walking Vienna, talking about everything.', 'What if you had one night with someone?', '1995-01-27', 1995, 101, 'en', 'United States', 'Richard Linklater', ARRAY['Relaxing','Emotional','Nostalgic'], 'R', true),
  ('Shershaah', 'shershaah', 'The true story of Captain Vikram Batra, from a spirited young officer to a hero of the Kargil War.', 'Yeh dil maange more.', '2021-08-12', 2021, 135, 'hi', 'India', 'Vishnuvardhan', ARRAY['Emotional','Inspirational','Intense'], 'U/A', true)
on conflict (slug) do nothing;

-- Cast for the featured Shershaah entry (others enrich via TMDB import).
update public.movies
set movie_cast = '[{"name":"Sidharth Malhotra","character":"Captain Vikram Batra"},{"name":"Kiara Advani","character":"Dimple Cheema"},{"name":"Shiv Panditt","character":"Sanjeev Jamwal"}]'::jsonb
where slug = 'shershaah' and movie_cast = '[]'::jsonb;

-- ===========================================================================
-- MOVIE_GENRES  (link by slug; idempotent)
-- ===========================================================================
insert into public.movie_genres (movie_id, genre_id)
select m.id, g.id from public.movies m join public.genres g on true
where (m.slug, g.slug) in (
  ('whiplash','drama'), ('whiplash','thriller'),
  ('parasite','thriller'), ('parasite','drama'), ('parasite','comedy'),
  ('inception','sci-fi'), ('inception','thriller'), ('inception','action'),
  ('the-grand-budapest-hotel','comedy'), ('the-grand-budapest-hotel','drama'),
  ('spirited-away','animation'), ('spirited-away','fantasy'), ('spirited-away','adventure'),
  ('no-country-for-old-men','thriller'), ('no-country-for-old-men','crime'), ('no-country-for-old-men','drama'),
  ('coco','animation'), ('coco','fantasy'), ('coco','drama'),
  ('blade-runner-2049','sci-fi'), ('blade-runner-2049','drama'), ('blade-runner-2049','mystery'),
  ('portrait-of-a-lady-on-fire','drama'), ('portrait-of-a-lady-on-fire','romance'),
  ('the-lives-of-others','drama'), ('the-lives-of-others','thriller'),
  ('andhadhun','thriller'), ('andhadhun','crime'), ('andhadhun','comedy'),
  ('tumbbad','horror'), ('tumbbad','fantasy'), ('tumbbad','drama'),
  ('everything-everywhere-all-at-once','sci-fi'), ('everything-everywhere-all-at-once','action'), ('everything-everywhere-all-at-once','comedy'),
  ('chef','comedy'), ('chef','drama'),
  ('before-sunrise','romance'), ('before-sunrise','drama'),
  ('shershaah','war'), ('shershaah','drama'), ('shershaah','action')
)
on conflict do nothing;

-- ===========================================================================
-- REVIEWS  (original editorial; published)
-- ===========================================================================
insert into public.reviews (movie_id, rating, verdict, recommendation_type, short_review, why_recommend, best_for, watch_if, not_for, spoiler_free, published)
select m.id, v.rating, v.verdict, v.rec, v.short_review, v.why, v.best_for, v.watch_if, v.not_for, true, true
from public.movies m
join (values
  ('whiplash', 9.0, 'A two-hander that plays like a thriller.', 'Must Watch', 'Two performances locked in a duel, cut like an action film. It grips from the first cymbal.', 'It uses tension the way most films use plot. Every scene is a negotiation over how much of yourself you will give up to be great.', 'Anyone chasing mastery at any cost.', 'you want a film that leaves your pulse up.', 'Not for those who need their protagonists likeable.'),
  ('parasite', 9.3, 'A perfect machine that turns funny into horrifying.', 'Must Watch', 'It starts as a con comedy and slides, floor by floor, into something far darker. Flawless control.', 'Every frame is doing structural work — literally, the architecture is the argument. It rewards a second watch and a long conversation after.', 'People who love films that say something without lecturing.', 'you want a story that respects your intelligence.', 'Skip if you dislike sudden tonal turns.'),
  ('inception', 8.8, 'A blockbuster that trusts you to keep up.', 'Highly Recommended', 'A heist film built out of dream logic, stacked layer on layer, and it somehow stays coherent and thrilling.', 'It proves spectacle and ideas are not enemies. The emotional core underneath the puzzle is what makes it last.', 'Fans of clever, big-canvas filmmaking.', 'you like a film you can argue about afterward.', 'Not ideal if you dislike exposition.'),
  ('the-grand-budapest-hotel', 8.5, 'A pastry box of a film with real sadness inside.', 'Highly Recommended', 'Symmetrical, whip-fast, and far more melancholy than its candy colours suggest.', 'Under the whimsy is a genuine elegy for a lost world. It is a comfort watch that also breaks your heart a little.', 'Anyone who loves craft and detail.', 'you want charm with an undertow.', 'Skip if Anderson''s style grates on you.'),
  ('spirited-away', 9.1, 'The gold standard for animated wonder.', 'Must Watch', 'A strange, generous, endlessly inventive world with a small brave girl at its centre.', 'Nothing is explained down to you; you simply live inside its rules. It respects children and adults equally.', 'Everyone, at least once.', 'you want to feel ten years old again.', 'There is nothing to skip here.'),
  ('no-country-for-old-men', 8.7, 'Dread you can feel in your teeth.', 'Highly Recommended', 'A chase film stripped to bone — quiet, patient, and utterly merciless.', 'It refuses the catharsis you keep waiting for, and that refusal is the point. Craftsmanship at its coldest and best.', 'Fans of tense, spare thrillers.', 'you like tension over resolution.', 'Not for viewers who need a tidy ending.'),
  ('coco', 8.6, 'The one that actually earns its tears.', 'Highly Recommended', 'A gorgeous, warm story about family and memory that lands its ending honestly.', 'It treats death as part of love rather than the opposite of it. Beautiful to look at and genuinely moving.', 'Families, and anyone missing someone.', 'you want to cry the good kind of tears.', 'Skip only if you hate feeling things.'),
  ('blade-runner-2049', 8.4, 'A sequel with the nerve to be slow.', 'Highly Recommended', 'Vast, quiet, and staggeringly beautiful — it earns every one of its 164 minutes.', 'It uses scale and silence to ask what makes a life real. A rare sequel that expands its original instead of copying it.', 'Sci-fi fans who love atmosphere.', 'you can give it the big screen and your patience.', 'Not for those who want fast pacing.'),
  ('portrait-of-a-lady-on-fire', 8.6, 'A love story told in glances and paint.', 'Hidden Gem', 'Restrained, precise, and quietly devastating. Every look carries the weight of a scene.', 'It shows how attention itself can be love. The final shot alone justifies the whole film.', 'Anyone who loves slow-burn romance.', 'you want a film that lingers for days.', 'Skip if you need plot momentum.'),
  ('the-lives-of-others', 8.9, 'A thriller about the slow arrival of a conscience.', 'Underrated', 'A surveillance drama that turns into one of the great films about decency. Tense and deeply human.', 'It believes people can change, and makes you believe it too. The ending is one of cinema''s quietest gut-punches.', 'Fans of grown-up, patient drama.', 'you want to be moved without being manipulated.', 'Not for viewers wanting action.'),
  ('andhadhun', 8.6, 'A black-comic thriller that never stops turning.', 'Hidden Gem', 'Twisty, funny, and genuinely unpredictable — Indian genre filmmaking at its most confident.', 'It keeps pulling the rug and somehow keeps its footing. You will not guess where it ends.', 'Thriller fans tired of predictable plots.', 'you love a story that keeps outsmarting you.', 'Skip if you dislike morally grey characters.'),
  ('shershaah', 8.2, 'A war film that never forgets the person behind the medal.', 'Highly Recommended', 'Sidharth Malhotra disappears into Captain Vikram Batra, and the film wisely spends as much time on the man as the mission.', 'It earns its emotion honestly — the romance, the friendship, and the final climb up Point 4875 all land because the film builds the person first. It moves you without ever shouting for it.', 'Anyone who loves a true-story war drama with real heart.', 'you want to feel proud and a little wrecked by the end.', 'Skip if biopics feel too sentimental for you.'),
  ('tumbbad', 8.5, 'A folk horror unlike anything else.', 'Underrated', 'A gorgeous, rain-soaked fable about greed with imagery that stays with you.', 'It builds its own mythology and commits fully. Few horror films look this beautiful or mean this much.', 'Horror fans who want atmosphere over jumpscares.', 'you want something you have never quite seen.', 'Not for those who want fast scares.'),
  ('everything-everywhere-all-at-once', 8.8, 'Chaos that resolves into tenderness.', 'Must Watch', 'A maximalist multiverse comedy that is secretly a very moving film about family.', 'It throws everything at the wall and it all sticks, because underneath the noise is real feeling.', 'Anyone open to something wild and sincere.', 'you want to be surprised and then wrecked.', 'Skip if you dislike sensory overload.'),
  ('chef', 7.9, 'The most comforting film about starting over.', 'Worth Watching', 'Warm, low-stakes, and delicious — a hangout movie that just wants you to feel good.', 'Sometimes you need a film that likes its characters and roots for them. This is that film, with great food.', 'Anyone needing a gentle reset.', 'you want an easy, happy watch.', 'Not for viewers wanting tension.'),
  ('before-sunrise', 8.6, 'A whole romance in one long conversation.', 'Highly Recommended', 'Two people, one city, one night, and dialogue so natural it feels overheard.', 'It captures the specific magic of connecting with a stranger. Simple, honest, and quietly perfect.', 'Anyone who loves talky, character-driven films.', 'you want romance without cliché.', 'Skip if you need a plot-driven story.')
) as v(slug, rating, verdict, rec, short_review, why, best_for, watch_if, not_for) on m.slug = v.slug
on conflict (movie_id) do nothing;

-- ===========================================================================
-- COLLECTIONS
-- ===========================================================================
insert into public.collections (title, slug, description, is_published, display_order)
values
  ('My Favourite Thrillers', 'best-thrillers', 'The films that had me holding my breath — twisty, tense, and impossible to pause.', true, 0),
  ('Movies Everyone Should Watch Once', 'everyone-should-watch', 'If you only watch a handful of films from me, make it these.', true, 1),
  ('Movies That Deserve More Attention', 'hidden-gems', 'Quietly brilliant films that too few people have seen.', true, 2),
  ('Best Indian Movies', 'best-indian', 'Indian cinema at its most inventive — beyond the usual recommendations.', true, 3),
  ('Movies for a Lazy Sunday', 'lazy-sunday', 'Low-stakes, high-comfort films for a slow afternoon.', true, 4),
  ('Movies That Will Mess With Your Head', 'mind-bending', 'Films that rearrange your brain a little and stay there.', true, 5)
on conflict (slug) do nothing;

-- ===========================================================================
-- COLLECTION_MOVIES  (ordered; idempotent)
-- ===========================================================================
insert into public.collection_movies (collection_id, movie_id, sort_order)
select c.id, m.id, x.sort_order
from (values
  ('best-thrillers','parasite',0), ('best-thrillers','inception',1), ('best-thrillers','no-country-for-old-men',2), ('best-thrillers','andhadhun',3), ('best-thrillers','the-lives-of-others',4),
  ('everyone-should-watch','whiplash',0), ('everyone-should-watch','parasite',1), ('everyone-should-watch','spirited-away',2), ('everyone-should-watch','everything-everywhere-all-at-once',3), ('everyone-should-watch','coco',4),
  ('hidden-gems','portrait-of-a-lady-on-fire',0), ('hidden-gems','the-lives-of-others',1), ('hidden-gems','tumbbad',2), ('hidden-gems','andhadhun',3), ('hidden-gems','chef',4),
  ('best-indian','shershaah',0), ('best-indian','andhadhun',1), ('best-indian','tumbbad',2),
  ('lazy-sunday','chef',0), ('lazy-sunday','before-sunrise',1), ('lazy-sunday','the-grand-budapest-hotel',2), ('lazy-sunday','coco',3),
  ('mind-bending','inception',0), ('mind-bending','everything-everywhere-all-at-once',1), ('mind-bending','andhadhun',2), ('mind-bending','blade-runner-2049',3)
) as x(collection_slug, movie_slug, sort_order)
join public.collections c on c.slug = x.collection_slug
join public.movies m on m.slug = x.movie_slug
on conflict (collection_id, movie_id) do nothing;

-- ===========================================================================
-- HOMEPAGE_SECTIONS  (guarded inserts — no natural unique key)
-- ===========================================================================
insert into public.homepage_sections (title, kind, movie_id, collection_id, auto_feed, is_enabled, display_order)
select s.title, s.kind, s.movie_id, s.collection_id, s.auto_feed, true, s.display_order
from (
  select 'Featured'::text as title, 'hero'::text as kind, (select id from public.movies where slug='parasite') as movie_id, null::uuid as collection_id, null::text as auto_feed, 0 as display_order
  union all select 'My Top Picks', 'auto', null, null, 'must_watch', 1
  union all select 'Movies You Should Watch', 'collection', null, (select id from public.collections where slug='everyone-should-watch'), null, 2
  union all select 'Best Thrillers', 'collection', null, (select id from public.collections where slug='best-thrillers'), null, 3
  union all select 'Movies That Will Mess With Your Head', 'collection', null, (select id from public.collections where slug='mind-bending'), null, 4
  union all select 'Hidden Gems', 'collection', null, (select id from public.collections where slug='hidden-gems'), null, 5
  union all select 'Best Indian Movies', 'collection', null, (select id from public.collections where slug='best-indian'), null, 6
  union all select 'Recently Added', 'auto', null, null, 'recently_added', 7
) s
where not exists (select 1 from public.homepage_sections h where h.title = s.title);
