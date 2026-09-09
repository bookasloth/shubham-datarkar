-- Books/Reading module demo/seed content. Apply MANUALLY after
-- 20260909000001_books.sql. Idempotent (safe to re-run). Cover art is left
-- null on purpose (enrich via a future "Import from Google Books" flow, same
-- pattern as movies_seed.sql); missing art falls back to a title tile.
-- All review/note prose below is original editorial in first person — no
-- copyrighted text is reproduced.

-- ===========================================================================
-- BOOKS
-- ===========================================================================
insert into public.books
  (title, slug, author, description, page_count, publication_year, is_published)
values
  ('The Psychology of Money', 'the-psychology-of-money', 'Morgan Housel', 'Short essays on how emotion, ego, and personal history shape the way we handle money — far more than spreadsheets do.', 256, 2020, true),
  ('Atomic Habits', 'atomic-habits', 'James Clear', 'A practical system for building good habits and breaking bad ones, built around small, compounding changes.', 320, 2018, true),
  ('Deep Work', 'deep-work', 'Cal Newport', 'A case for distraction-free, high-focus work as a rare and increasingly valuable skill.', 304, 2016, true),
  ('Thinking, Fast and Slow', 'thinking-fast-and-slow', 'Daniel Kahneman', 'A tour of the two systems that drive human judgment — one fast and intuitive, one slow and deliberate — and where each fails us.', 499, 2011, true),
  ('Zero to One', 'zero-to-one', 'Peter Thiel', 'Notes on startups, and on building something genuinely new instead of copying what already works.', 224, 2014, true),
  ('Influence', 'influence', 'Robert Cialdini', 'The psychology of persuasion, broken into a handful of core principles that show up in almost every sales or marketing tactic.', 320, 2006, true),
  ('Sapiens', 'sapiens', 'Yuval Noah Harari', 'A big-picture history of Homo sapiens, from foraging bands to shared myths like money, nations, and religion.', 443, 2011, true),
  ('The Almanack of Naval Ravikant', 'the-almanack-of-naval-ravikant', 'Eric Jorgenson', 'A curated collection of Naval Ravikant''s writing and talks on wealth, happiness, and how to think clearly.', 242, 2020, true),
  ('Shoe Dog', 'shoe-dog', 'Phil Knight', 'Nike''s founder on the chaotic, near-bankrupt early years of building the company, told as a personal memoir.', 400, 2016, true),
  ('Hooked', 'hooked', 'Nir Eyal', 'A model for how products build habits, through a repeating loop of trigger, action, variable reward, and investment.', 256, 2014, true),
  ('Made to Stick', 'made-to-stick', 'Chip Heath, Dan Heath', 'Why some ideas survive and spread while others are forgotten, distilled into six traits that make an idea stick.', 291, 2007, true),
  ('Range', 'range', 'David Epstein', 'An argument for generalists over specialists — how broad experience and late starts often produce better outcomes.', 352, 2019, true),
  ('The Hard Thing About Hard Things', 'the-hard-thing-about-hard-things', 'Ben Horowitz', 'Blunt, war-story advice on the parts of running a company nobody puts in a business-school case study.', 304, 2014, true),
  ('Contagious', 'contagious', 'Jonah Berger', 'Six principles behind why certain products, ideas, and stories get talked about and shared.', 256, 2013, true),
  ('Building a StoryBrand', 'building-a-storybrand', 'Donald Miller', 'A framework for clarifying a brand''s marketing message by making the customer the hero of the story.', 240, 2017, true)
on conflict (slug) do nothing;

-- ===========================================================================
-- BOOK_READING  (status/current_page/total_pages/percentage precomputed)
-- ===========================================================================
insert into public.book_reading (book_id, status, current_page, total_pages, percentage, started_at, finished_at)
select b.id, v.status, v.current_page, v.total_pages, v.percentage, v.started_at, v.finished_at
from public.books b
join (values
  -- currently_reading (percentage = round(current_page/total_pages*100))
  ('atomic-habits', 'currently_reading', 210, 320, 66, '2026-08-20'::date, null::date),
  ('thinking-fast-and-slow', 'currently_reading', 260, 499, 52, '2026-08-01'::date, null::date),
  ('range', 'currently_reading', 90, 352, 26, '2026-08-28'::date, null::date),
  -- finished
  ('the-psychology-of-money', 'finished', 256, 256, 100, '2025-01-05'::date, '2025-01-20'::date),
  ('deep-work', 'finished', 304, 304, 100, '2025-02-10'::date, '2025-02-28'::date),
  ('zero-to-one', 'finished', 224, 224, 100, '2025-03-15'::date, '2025-03-25'::date),
  ('influence', 'finished', 320, 320, 100, '2025-04-01'::date, '2025-04-18'::date),
  ('sapiens', 'finished', 443, 443, 100, '2025-05-05'::date, '2025-06-02'::date),
  ('the-almanack-of-naval-ravikant', 'finished', 242, 242, 100, '2025-06-10'::date, '2025-06-20'::date),
  ('shoe-dog', 'finished', 400, 400, 100, '2025-07-01'::date, '2025-07-22'::date),
  ('made-to-stick', 'finished', 291, 291, 100, '2025-08-05'::date, '2025-08-19'::date),
  ('the-hard-thing-about-hard-things', 'finished', 304, 304, 100, '2025-09-10'::date, '2025-09-28'::date),
  -- want_to_read
  ('hooked', 'want_to_read', null, null, null, null, null),
  ('contagious', 'want_to_read', null, null, null, null, null),
  ('building-a-storybrand', 'want_to_read', null, null, null, null, null)
) as v(slug, status, current_page, total_pages, percentage, started_at, finished_at) on b.slug = v.slug
on conflict (book_id) do nothing;

-- ===========================================================================
-- BOOK_REVIEWS  (finished + currently-reading only; original editorial)
-- ===========================================================================
insert into public.book_reviews (book_id, rating, verdict, recommendation_type, short_review, full_review, why_read, why_recommend, what_i_learned, who_should_read, published)
select b.id, v.rating, v.verdict, v.rec, v.short_review, v.full_review, v.why_read, v.why_recommend, v.what_i_learned, v.who_should_read, true
from public.books b
join (values
  ('the-psychology-of-money', 9.0, 'The best book on money that has almost no math in it.', 'Must Read',
    'Money behaviour beats money knowledge, and this book explains why in plain English.',
    'I went in expecting another personal-finance book and got a book about temperament instead. Housel''s point, made a dozen different ways, is that how you behave with money matters more than how smart you are with it. It reframed saving for me — less a spreadsheet exercise, more a way of buying independence.',
    'I picked it up because every founder I follow was quoting it, and the actual read is even better than the quotes.',
    'It is short, well written, and changes how you think about risk without ever getting technical.',
    E'Wealth is what you don''t see, not what you spend.\nRoom for error matters more than being right.\nCompounding rewards behaviour that looks boring for a long time.\nEnough is a number worth defining for yourself.',
    'Anyone who has ever felt anxious about money decisions, regardless of income.'),
  ('deep-work', 8.5, 'Made me audit every open tab I have.', 'Highly Recommended',
    'A strong argument that focus is a trainable skill, not a personality trait.',
    'Newport''s case is that the ability to concentrate without distraction is becoming rare and valuable at the same time everything around us is optimized to fragment it. I started blocking real deep-work sessions after this and the difference in output was immediate — not subtle.',
    'I read it hoping for tactics to manage a noisy inbox and came away rethinking my whole calendar instead.',
    'It gives you a vocabulary for protecting focus, which makes it easier to defend to other people, not just yourself.',
    E'Shallow work expands to fill the time you give it.\nAttention residue means task-switching costs more than it feels like.\nRituals around starting deep work matter more than willpower.',
    'Anyone whose calendar is full of meetings but whose real output feels thin.'),
  ('zero-to-one', 8.4, 'Contrarian in a way that actually holds up on a second read.', 'Highly Recommended',
    'Less a startup manual, more a way of testing whether an idea is genuinely new.',
    'Thiel''s core question — what important truth do very few people agree with you on — stuck with me longer than any specific business advice in the book. It is opinionated and occasionally too pleased with itself, but the framework for thinking about monopolies versus competition is genuinely useful.',
    'I wanted a founder''s honest take on what makes a company defensible, not another growth-hacking checklist.',
    'It pushes you to ask harder questions about your own idea instead of copying a playbook that worked for someone else.',
    E'Competition destroys value; the goal is a defensible monopoly, not a bigger slice of a crowded market.\nSecrets are more valuable than they look once everyone assumes there is nothing left to discover.\nA great business needs a plan for the next ten years, not just the next funding round.',
    'Early-stage founders and anyone deciding whether to build something genuinely new.'),
  ('influence', 8.6, 'You will start noticing these tactics everywhere, including on yourself.', 'Must Read',
    'The six principles here explain most of the persuasion you encounter in a normal week.',
    'Cialdini organizes decades of research into principles — reciprocity, commitment, social proof, authority, liking, scarcity — that are simple enough to remember and specific enough to spot in the wild. Reading it made me a slightly more skeptical shopper and a noticeably better marketer.',
    'I wanted the actual research behind persuasion tactics instead of secondhand marketing-blog summaries.',
    'It is the rare book where understanding the manipulation makes you both harder to manipulate and better at your job.',
    E'Reciprocity creates an obligation even from small, unrequested favours.\nPublic commitments are far stickier than private ones.\nScarcity increases desire independent of actual value.\nAuthority cues shortcut people''s judgment more than they realize.',
    'Anyone in sales or marketing, and anyone who wants to shop and negotiate more carefully.'),
  ('sapiens', 9.1, 'Zoomed my thinking out further than any book has in years.', 'Must Read',
    'A history of our species told through the shared myths — money, nations, religions — that let strangers cooperate at scale.',
    'Harari''s central move is treating money, law, and nations as useful fictions we all agree to believe, rather than facts of nature. That single reframe changed how I read the news. Dense in places, but the payoff per chapter is high.',
    'I wanted context for how humans ended up organizing the way we do, beyond the version taught in school.',
    'It gives you a framework for almost every other nonfiction book you will read afterward.',
    E'Large-scale cooperation among strangers runs on shared fictions, not just shared genes.\nThe agricultural revolution traded a harder life for a more crowded, more controllable one.\nMoney is the most universal and successful story humans have ever told.',
    'Anyone who wants a wide-angle lens before diving into narrower history or economics books.'),
  ('the-almanack-of-naval-ravikant', 8.3, 'Dense in a good way — I re-read chunks immediately.', 'Highly Recommended',
    'A compilation of ideas on wealth and happiness that rewards slow reading over a single sitting.',
    'This is quote-dense rather than narrative, which makes it easy to put down and easy to skim past the good parts if you rush it. Read slowly, the ideas on specific knowledge and judgment as the real scarce resources landed hard for me.',
    'I kept seeing the same Naval quotes recirculate online and wanted the source material instead of screenshots.',
    'It compresses a lot of thinking about leverage and decision-making into a book you can dip into repeatedly.',
    E'Seek wealth, not money or status — wealth is assets that earn while you sleep.\nSpecific knowledge feels like play to you and looks like work to others.\nJudgment compounds; it is the scarcest and most valuable skill to build.',
    'People weighing a career or business decision and wanting a different mental model for it.'),
  ('shoe-dog', 9.0, 'The most honest founder memoir I have read.', 'Must Read',
    'Nike almost didn''t make it, repeatedly, and Knight doesn''t sand down how close it got.',
    'What sets this apart from most founder books is how much of it is doubt, near-bankruptcy, and lucky breaks rather than a clean origin story. It reads like a novel, and it made the early chaos of building something feel normal rather than shameful.',
    'I wanted a founder story that didn''t retroactively make every decision look inevitable.',
    'It is the rare business memoir that is also just a genuinely good story, on top of the lessons.',
    E'Cash flow, not brand, nearly killed the company for years.\nLoyalty to early partners can matter more than optimizing every contract.\nMost "overnight successes" run on a decade of quiet, unglamorous survival.',
    'Anyone building something and quietly panicking that it feels harder than it is supposed to.'),
  ('made-to-stick', 8.1, 'A practical toolkit for making any idea more memorable.', 'Recommended',
    'Six concrete traits — simple, unexpected, concrete, credible, emotional, story-based — that make ideas spread.',
    'I use the SUCCESs acronym from this book almost weekly now, mostly to catch myself burying a good point under three qualifiers. It is more of a working manual than a page-turner, and it is better for that.',
    'I wanted to write clearer briefs and pitches instead of longer ones.',
    'It is short, structured, and immediately applicable to writing, presentations, and pitches.',
    E'Concrete beats abstract almost every time a message needs to travel.\nA single, well-chosen detail sticks better than a long list of reasons.\nStories work because they simulate a decision for the listener before they have to make one.',
    'Anyone who writes pitches, briefs, or presentations for a living.'),
  ('the-hard-thing-about-hard-things', 8.7, 'No sugar-coating, which is exactly the point.', 'Highly Recommended',
    'War stories from running a company through layoffs, near-failures, and impossible personnel calls.',
    'Most leadership books tell you what good looks like. Horowitz spends most of this one describing what it feels like to make a call with no good options, which is far more useful when you are actually in that position. Blunt, occasionally profane, consistently useful.',
    'I wanted advice for the ugly parts of running something, not another list of leadership virtues.',
    'It is the book I''d hand someone about to have their first genuinely bad week running a company.',
    E'There is no shortcut through a genuinely hard problem, only a clearer way to think about it.\nHow you communicate bad news matters as much as the decision itself.\nHiring for a person''s strength for the specific problem in front of you beats hiring generically "great" people.',
    'Managers and founders navigating a company through a rough stretch.'),
  ('atomic-habits', 8.9, 'Simple system, and I''m still using it months later.', 'Must Read',
    'One of the few habit books whose framework I have actually kept using past the first week.',
    'Clear''s system of small, identity-linked changes stuck with me specifically because it never asks for a dramatic overhaul, just a slightly better version of a habit you already have. Still working through it, and it is already the one habit book I''ll actually reread.',
    'I''ve tried a dozen productivity systems and wanted something durable rather than another 30-day challenge.',
    'It treats habits as identity, not willpower, which is the reframe most other habit books miss.',
    E'Habits are the compound interest of self-improvement — tiny, repeated, and slow to show.\n"I am becoming someone who..." works better than "I want to..."\nMake the good habit obvious, attractive, easy, and satisfying — and do the opposite to break a bad one.',
    'Anyone who has started and abandoned a habit-tracking app more than once.'),
  ('thinking-fast-and-slow', 9.2, 'Slow, dense, and worth every page so far.', 'Must Read',
    'A rigorous map of where fast, intuitive judgment reliably fails us.',
    'Kahneman''s System 1 / System 2 framing is one of those ideas that, once you have it, you can''t stop noticing it in your own decisions. It is long and occasionally academic, but every chapter earns its length. Reading it slowly on purpose.',
    'I wanted the primary source behind "cognitive bias," which shows up secondhand in almost every other book on this list.',
    'It is the foundational text most behavioural-economics books are quietly borrowing from.',
    E'Fast, intuitive thinking is efficient but systematically biased.\nAnchoring affects estimates even when the anchor is obviously irrelevant.\nWe substitute an easy question for a hard one without noticing the swap.',
    'Anyone who wants to understand judgment and decision-making at the source, not the summary.'),
  ('range', 7.8, 'A welcome argument against specializing too early.', 'Worth Reading',
    'Evidence that broad, varied experience often outperforms narrow early specialization.',
    'Epstein makes his case with sport, music, and career examples, and the range of evidence is the point — no single story would have convinced me, but the accumulation does. Reading it slower than expected but it is holding up well so far.',
    'I wanted a counterweight to the "10,000 hours starting at age five" narrative that gets repeated everywhere.',
    'It is a reassuring read if your own path has looked more winding than linear.',
    E'Late starters and career-switchers are more common among top performers than the specialization myth suggests.\nSampling widely before committing tends to produce better long-term fit.\nAnalogical thinking — borrowing from unrelated fields — is a real, learnable advantage.',
    'Anyone anxious about a non-linear career path or a late start in a field.')
) as v(slug, rating, verdict, rec, short_review, full_review, why_read, why_recommend, what_i_learned, who_should_read) on b.slug = v.slug
on conflict (book_id) do nothing;

-- ===========================================================================
-- BOOK_NOTES  (published; a few highlights per book; guarded inserts —
-- no unique constraint on this table, so (book_id, chapter, page) is used
-- as the idempotency key instead of on conflict)
-- ===========================================================================
insert into public.book_notes (book_id, chapter, page, quote, note, tags, position, published)
select b.id, v.chapter, v.page, v.quote, v.note, v.tags, v.position, true
from public.books b
join (values
  ('atomic-habits', 'The Fundamentals', 38, 'You do not rise to the level of your goals. You fall to the level of your systems.', 'This is the line I keep coming back to when a new goal feels exciting but the underlying routine is still shaky.', ARRAY['habits','systems'], 0),
  ('atomic-habits', 'The 1st Law', 74, 'Every action you take is a vote for the type of person you wish to become.', 'Reframed habit-tracking for me from "did I do the task" to "what identity am I reinforcing".', ARRAY['identity','habits'], 1),
  ('thinking-fast-and-slow', 'Part I', 20, 'Nothing in life is as important as you think it is while you are thinking about it.', 'A good check whenever a single decision starts to feel disproportionately high-stakes in the moment.', ARRAY['bias','decision-making'], 0),
  ('deep-work', 'Rule #1', 63, 'Clarity about what matters provides clarity about what does not.', 'Useful filter for saying no to shallow requests without feeling guilty about it.', ARRAY['focus','productivity'], 0)
) as v(slug, chapter, page, quote, note, tags, position) on b.slug = v.slug
where not exists (
  select 1 from public.book_notes n
  where n.book_id = b.id and n.chapter = v.chapter and n.page = v.page
);

-- ===========================================================================
-- BOOK_GENRES  (link by slug; idempotent)
-- ===========================================================================
insert into public.book_genres (book_id, genre_id)
select b.id, g.id from public.books b join public.book_genres_ref g on true
where (b.slug, g.slug) in (
  ('the-psychology-of-money','finance'), ('the-psychology-of-money','psychology'),
  ('atomic-habits','self-help'), ('atomic-habits','productivity'),
  ('deep-work','productivity'), ('deep-work','self-help'),
  ('thinking-fast-and-slow','psychology'), ('thinking-fast-and-slow','economics'),
  ('zero-to-one','business'), ('zero-to-one','leadership'),
  ('influence','psychology'), ('influence','marketing'),
  ('sapiens','history'), ('sapiens','science'),
  ('the-almanack-of-naval-ravikant','philosophy'), ('the-almanack-of-naval-ravikant','self-help'),
  ('shoe-dog','biography'), ('shoe-dog','business'),
  ('hooked','marketing'), ('hooked','technology'),
  ('made-to-stick','marketing'), ('made-to-stick','business'),
  ('range','self-help'), ('range','science'),
  ('the-hard-thing-about-hard-things','business'), ('the-hard-thing-about-hard-things','leadership'),
  ('contagious','marketing'), ('contagious','business'),
  ('building-a-storybrand','marketing'), ('building-a-storybrand','business')
)
on conflict do nothing;

-- ===========================================================================
-- BOOK_COLLECTIONS
-- ===========================================================================
insert into public.book_collections (title, slug, description, is_published, display_order)
values
  ('Currently Reading', 'currently-reading', 'What''s on my nightstand right now.', true, 0),
  ('Books I''d Recommend', 'recommend', 'The ones I bring up unprompted in conversation.', true, 1),
  ('Books That Changed My Thinking', 'changed-my-thinking', 'A handful of books that genuinely shifted how I see things.', true, 2),
  ('Business & Marketing', 'business-marketing', 'Reads that shaped how I think about building and selling things.', true, 3),
  ('My Favourites', 'favourites', 'If I had to keep five books, it would be these.', true, 4),
  ('Want to Read', 'want-to-read', 'Next up on the list.', true, 5)
on conflict (slug) do nothing;

-- ===========================================================================
-- BOOK_COLLECTION_ITEMS  (ordered; idempotent)
-- ===========================================================================
insert into public.book_collection_items (collection_id, book_id, sort_order)
select c.id, b.id, x.sort_order
from (values
  ('currently-reading','atomic-habits',0), ('currently-reading','thinking-fast-and-slow',1), ('currently-reading','range',2),
  ('recommend','the-psychology-of-money',0), ('recommend','atomic-habits',1), ('recommend','sapiens',2), ('recommend','the-almanack-of-naval-ravikant',3), ('recommend','shoe-dog',4),
  ('changed-my-thinking','sapiens',0), ('changed-my-thinking','thinking-fast-and-slow',1), ('changed-my-thinking','the-almanack-of-naval-ravikant',2), ('changed-my-thinking','zero-to-one',3),
  ('business-marketing','zero-to-one',0), ('business-marketing','influence',1), ('business-marketing','made-to-stick',2), ('business-marketing','the-hard-thing-about-hard-things',3), ('business-marketing','contagious',4), ('business-marketing','building-a-storybrand',5), ('business-marketing','hooked',6),
  ('favourites','the-psychology-of-money',0), ('favourites','atomic-habits',1), ('favourites','shoe-dog',2), ('favourites','sapiens',3),
  ('want-to-read','hooked',0), ('want-to-read','contagious',1), ('want-to-read','building-a-storybrand',2)
) as x(collection_slug, book_slug, sort_order)
join public.book_collections c on c.slug = x.collection_slug
join public.books b on b.slug = x.book_slug
on conflict (collection_id, book_id) do nothing;

-- ===========================================================================
-- BOOK_HOMEPAGE_SECTIONS  (guarded inserts — no natural unique key)
-- ===========================================================================
insert into public.book_homepage_sections (title, kind, book_id, collection_id, auto_feed, is_enabled, display_order)
select s.title, s.kind, s.book_id, s.collection_id, s.auto_feed, true, s.display_order
from (
  select 'Currently Reading'::text as title, 'hero'::text as kind, (select id from public.books where slug='atomic-habits') as book_id, null::uuid as collection_id, null::text as auto_feed, 0 as display_order
  union all select 'On My Nightstand', 'auto', null, null, 'currently_reading', 1
  union all select 'Recently Finished', 'auto', null, null, 'recently_finished', 2
  union all select 'Books I''d Recommend', 'auto', null, null, 'recommended', 3
  union all select 'Up Next', 'auto', null, null, 'want_to_read', 4
  union all select 'Books That Changed My Thinking', 'collection', null, (select id from public.book_collections where slug='changed-my-thinking'), null, 5
  union all select 'Business & Marketing', 'collection', null, (select id from public.book_collections where slug='business-marketing'), null, 6
) s
where not exists (select 1 from public.book_homepage_sections h where h.title = s.title);
