# Writing the `Tweet:` line

Every announce-worthy PR body carries one line:

```
Tweet: <the copy the public reads>
```

The webhook posts it to `/community` verbatim at merge time (`extractTweet` in
`src/lib/community/auto/pr.ts`). No line → the template pool fires instead, and the
pool is a fallback, not a target. Write the line.

`shouldAnnounce` decides *whether* a PR posts. This doc only decides *what it says*.

## Read the PR first

Do not write from the title. The title is for a reviewer; the tweet is for a stranger
scrolling. Before drafting, know:

- What actually changed, in the product, that a non-developer could notice.
- Who it helps, and what their day looked like before it.
- Why it existed at all — the bug that bit someone, the thing that was embarrassing,
  the competitor doing it badly, the four-month-old TODO.
- What is funny about it. There is almost always something: the delay, the cause,
  the fact that nobody noticed, the fact that everybody noticed.

If nothing in the PR is interesting to a human, that is a real answer — say so and
let the pool take it. Do not manufacture drama around a dependency bump.

## The voice

Solo founder, no marketing department, no permission, posting at 2am. Raw, funny,
mean about the right targets, never proud of itself. Reads like a person typed it once
and hit post — not like copy that went through a review.

There is no skeleton. Do not fill a shape. Do not open with "Shipped X." because the
pool does. If a draft would survive a find-and-replace of the feature name into a
different PR, it is generic — throw it out and write about *this* change.

Bands the copy can hit — a description of what has worked, not a menu to pick from:

- **Self-roast** — the joke is on you and the code. The delay, the cause, the
  four attempts. Never on the user.
- **Gaslight** — the bit where this was always here, you're misremembering, it was
  never broken. It is a bit about *taste and memory*, never about facts. See limits.
- **Ragebait** — aimed up. Bloated platforms, agencies billing for this, the industry
  ceremony around shipping one button. Never at users, never at a named real person.
- **Life choices** — the reader's, or yours. Why are you like this. Why am I.
- **Dig / flex** — done solo before the incumbent finishes the meeting about it.
- **Absurd / dry** — the flat one-liner that lands because it refuses to sell.

Bands blend. The best line is usually two at once — self-roast that is also a dig,
gaslighting that is also ragebait.

## Never recycle the phrasing

The template pool in `src/lib/community/auto/templates.ts` is the fallback. Read it once
to know what the feed already sounds like, then never say those words again. "You must be
misremembering." "Ask for the invoice back." "Only took me embarrassingly long." "It was
never a bug, it was a feature." Those lines are spent. Anything that rhymes with them is
spent. The band is *gaslight*; "you're misremembering" is just the first joke anyone
writes in that band, which is exactly why it is dead.

The same applies to the internet's stock cuts — "rent free", "built different", "let that
sink in", "just shipped", "so this happened", "it's giving". If you have read the phrase
before, it has no voltage left.

The test: could this line have been written by someone who never opened the diff? Then it
is a phrase, not a joke. Delete it.

When writing in bulk — a backfill, a batch — the do-not-repeat list grows as you go. Keep
a ledger of every shipped opening, angle, and landing word, and check new drafts against
it. A joke used once on this feed is used up; the tenth Schrödinger is worth less than the
plain sentence.

## Say which project — softly

The feed spans more than one product. A reader landing cold on one tweet has to know what
it is about without being told, so each line carries its world in its vocabulary:

- **Book A Sloth** tweets live in that product's nouns — the Sloth, Book A Sloth, the
  booking engine, a host, a booking. The product name appearing naturally in the sentence
  IS the context.
- **The site** speaks first person — I, me, the site, SD. No label needed; the absence of
  a product name means it is about here.

Subtle where it is needed, never hardpushed. "on Book A Sloth" bolted to the end of a
sentence is a label; a booking that shows up as the subject of the joke is context. If the
noun is doing comedic work anyway, it is free.

Gate question before shipping: would a random reader know which project this is about? No
→ rework until they would.

## Word craft

The joke is carried by word choice, not by structure. Fewer words, harder words.

- **Specific nouns beat adjectives.** Not "a big bloated dashboard" — name the thing,
  the loading spinner, the cookie banner, the 400ms.
- **Verbs do the work.** If a sentence needs an adverb to be funny, it is not funny.
- **Funniest word last.** Rewrite the sentence until the landing word is the one that hurts.
- **Cut every word that survives its own deletion.** Then cut one more.
- **Say the quiet thing plainly.** The strongest line is usually the most obvious
  observation nobody was willing to type.
- **No throat-clearing.** No "just", "basically", "honestly", "I know this sounds like".
  Start on the hit.

## Decoration

Where the change hands you one, take it: a rhyme, an internal echo, a pun that is actually
about the feature, a line with a beat to it, alliteration that makes the sentence walk. A
tweet that sounds good gets read twice, and read twice is how a thing spreads. The seam
between two meanings of one word is free real estate — a caching PR, a streak PR, a login
PR each carry a second meaning in the noun itself. Find it before you settle for prose.

But: the opportunity has to exist. A pun bent out of a word that does not fit is worse than
the plain sentence, because now the reader can see you reaching. Forced rhyme reads as a
greeting card. If the wordplay needs the fact stretched to land, the fact wins and the joke
dies — every time, no exceptions.

Rule of thumb: if the decoration was the *first* thing you noticed about the change, it is
probably real. If you went hunting for one after the sentence was already written, it is
probably a stretch. Ship the plain line and keep your dignity.

## Rough edges

The failure mode after everything above sinks in: every post arrives with a perfect setup
and a landed punchline, and the feed starts sounding like a comedy writer doing a founder,
not a founder typing. A person's actual feed has texture — some posts are funny, some are
brutally short, some are technical, and some are just "fixed this stupid thing."

Write in the natural voice: first person, conversational, specific, slightly chaotic,
quietly funny. The default shape is a tiny story — what happened, what was stupid or
interesting about it, what changed — but do not force that structure every time either.
The humour comes out of what actually happened: self-roast, an absurd comparison, a dry
observation. Found in the event, never manufactured onto it.

Keep the real details when they make the story better — numbers, timings, error text,
technical terms. "570 of the failures were the dashboard's" beats any metaphor for the
same fact.

Avoid: polished changelog language, overly literary metaphors, motivational endings, and
AI-sounding punchlines. "Funniest word last" applies when the line IS a joke — a plain
update is allowed to just end.

If every update is quotable, none of them sound like a person anymore. Let some be 6/10
on purpose.

Do not invent a clever phrase for the technology. "Serverless amnesia" is a coinage
looking for applause; "the rate limiter forgot everything on every cold start" is the
same fact, funnier, because it is just what happened. When the situation is already
funny, tell it straight — naming it kills it.

Technical entries stay legible to a non-developer: they should get what went wrong and
why it mattered, without the post turning into a lecture. One clause of context is
usually enough; if the reader needs a second, the entry is about the wrong part of the
story. Don't explain it to death.

## The register

Post like a person with no comms team, not a brand with a voice guide.

Short. Brutally short. Sometimes one word is the whole tweet — a flat "Concerning." under
a thing that is genuinely concerning does more than a paragraph. Confidence without
argument. Non-sequitur delivered with a straight face. Deadpan overclaim so obviously
oversized it reads as a joke, never as a spec. A single period doing the work of a punchline.
Replying to the room like you are already in the argument.

Range matters more than any one mode: a one-word tweet, then a savage two-liner, then a
dead-serious sentence about why the thing existed. A feed where every post is the same
intensity is a feed nobody reads. Vary it PR to PR, on purpose.

What does not transfer: cruelty at real people, and the overclaim becoming an actual
product claim. See hard limits — those do not bend for the bit.

## Process

1. Read the PR: diff, body, linked issue, why it exists.
2. Write **five** drafts. Different angles, not five phrasings of one joke. If three of
   them share an opening word, you wrote one draft five times.
3. Score each: which bands does it hit (more than one is stronger), and would a stranger
   with no context stop, laugh, or argue? Arguing counts.
4. **Interrogate each draft** (below). Anything that fails, rewrite — do not promote a
   survivor just because it was the least bad of five.
5. Ship the one that hits multiple bands *and* is legible cold. Discard the other four
   — they are not saved anywhere and should not be.
6. Put the winner on the `Tweet:` line. One line, ≤500 chars, no emojis (house style).

Legible cold beats clever: a joke that needs the diff to land is a joke for four people.

## The interrogation

Writing five drafts is not the work. Refusing to ship four of them is. Take each draft and
ask it, honestly — the honesty is the whole gate, because you wrote it and you want it to
be good:

- Does it fit the change, or could it be about any PR this month?
- Which band does it actually hit, not which band did I intend?
- Is a single word here one I have read on this feed before?
- Would a stranger who has never heard of the project stop on it?
- If I saw this posted by someone else, would I laugh — or scroll?
- Is the funniest word last? If not, why is it not?
- Is the decoration real, or did I reach?
- Strip the joke: is the claim underneath still true?
- Would a random reader know which project this is about?

Any answer that is a wince means rewrite. Not "tweak the wording" — go back and find a
different angle on the change, because a draft that fails these usually fails at the idea,
and no amount of polish saves a bad idea. Five new drafts is a fine outcome. So is a sixth
round.

**Quality over shipping it now. Always.** No deadline exists here — the PR merges when it
merges, and a mediocre tweet is worse than a late one, because the boring one still posts
under the owner's name and still teaches the feed that this account is skippable. If the
line is not there yet, keep writing. If it is genuinely not in the change, say so and let
the pool take it — that is an honest fallback, not a failure. What is never acceptable is
shipping a line you already know is flat.

## Hard limits

These are the only rules; everything above is taste.

- **Never lie about what shipped.** The gaslighting is a comedy voice about the reader's
  memory of a UI, never a false claim about the product, a number, a date, or a
  capability. "It was always like this" is a bit. "This makes it 10x faster" when it does
  not is a lie in public, under the owner's name.
- **Punch up, never at users.** Targets are incumbents, bloat, the industry, and yourself.
  Never a customer, never a supporter, never a named individual.
- **No `@handle` unless you mean it.** The `Tweet:` line is never sanitized (`humanizeSubject`
  only guards the fallback path), the feed linkifies handles, and a real handle gets
  emailed. Write one only when you intend to notify that person.
- **Security/privacy PRs get the boring voice.** No joke is worth narrating the shape of
  a hole to the feed. Say it is fixed, move on.
- **The owner typed this.** Every post reads as the owner writing, first person, in the
  moment. The pipeline is invisible: never "auto-posted", never a webhook, a template, a
  bot, or when any of it went live. The reader sees a person, because a person wrote the
  line — the plumbing only delivers it.
