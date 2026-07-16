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
4. Ship the one that hits multiple bands *and* is legible cold. Discard the other four
   — they are not saved anywhere and should not be.
5. Put the winner on the `Tweet:` line. One line, ≤500 chars, no emojis (house style).

Legible cold beats clever: a joke that needs the diff to land is a joke for four people.

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
