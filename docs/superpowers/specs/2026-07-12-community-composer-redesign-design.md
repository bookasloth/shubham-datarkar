# Community Composer Redesign — Design

**Date:** 2026-07-12
**Status:** Approved (design), pending spec review
**Component:** `src/components/community/composer.tsx` and related

## Goal

Improve the visual design and interaction of the `/community` post composer,
drawing layout/interaction patterns from user-supplied reference images
(tabbed post-type selector, drag-and-drop image zone, poll/quiz toggle).
Adapt those patterns to the site's **locked monochrome design system** — the
references use brand colors, which are not adopted.

## Scope

**In scope** (approved):
1. **Tab restyle** — replace the dashed bordered tab boxes with an
   icon-over-label bar where the active tab shows a bottom underline.
2. **Fully tab-switched layout (Approach A)** — each tab renders only its own
   fields. The shared `body` state persists but is rendered inside each tab
   with a contextual placeholder.
3. **Image dropzone + caption** — reuse the existing `Dropzone` component for
   drag-and-drop, plus an "Add a caption…" input bound to `body`.
4. **Poll / Quiz toggle** — a segmented control; Quiz = a poll with one marked
   correct answer, revealed after voting.

**Out of scope** (explicitly excluded):
- Quote and Question post types (owner-deferred; require new backend types).
- Any color / non-monochrome treatment (references' brand colors rejected).
- Changing the 500-char body limit (references show 200; backend stays 500).
- The welcome header — kept exactly as shipped in PR #146.
- The YouTube tab's existence — kept as-is (not in references, but existing
  functionality; it inherits the tab restyle and gains an optional caption).

## Existing constraints (verified in code)

- Post creation: `<form action={createPost}>` in `composer.tsx` →
  `validatePost` (`validate.ts`) → insert into `community_posts`
  `{ type, body, images, youtube_id, poll }` (`actions.ts`).
- Post types are exactly `text | image | poll | youtube` (`types.ts`).
  **Quiz reuses `type: "poll"`** — no new enum value, no DB migration.
- `poll` is stored as **jsonb** (`PollData`), so extending it needs no
  migration.
- Images are read server-side via `formData.getAll("images")`, so the file
  input must be a real named form field that carries dropped files.

## Data model changes

Extend `PollData` in `src/lib/community/types.ts`:

```ts
export type PollData = {
  options: { i: number; label: string }[];
  closes_at?: string;
  /** Present only for quizzes. Omitted for a plain poll. */
  mode?: "quiz";
  /** Option index of the correct answer. Present iff mode === "quiz". */
  correct?: number;
};
```

Backward compatible: existing polls have neither field; readers treat a missing
`mode` as a plain poll.

## Validation changes (`validate.ts`)

`PostInput` gains: `pollMode?: string` and `pollCorrect?: string` (form values).

In the `type === "poll"` branch, after the existing option checks:
- If `pollMode === "quiz"`:
  - Parse `pollCorrect` to an integer index.
  - Reject if it is not a valid index into the **filtered** options array
    (error: "Mark the correct answer.").
  - Set `poll.mode = "quiz"` and `poll.correct = <index>`.
- Otherwise leave `poll` as a plain poll (no `mode`/`correct`).

Note: `correct` indexes the **trimmed, non-empty** options list — the same list
whose indices are written as `{ i, label }`. The composer must send the index
against that same post-filter ordering (see below).

## Component changes

### `src/components/ui/dropzone.tsx` (extend, backward compatible)

- Add optional props: `name?: string`, `accept?: string`.
- Pass `accept` to the internal `<input>`.
- Give the internal `<input>` the `name` (so it submits inside a form).
- On every files-state change, rebuild a `DataTransfer` from the current files
  and assign `inputRef.current.files = dt.files`, so **dropped** files (not just
  click-selected ones) are carried by the named input into the form submit.
- Existing callers pass no `name` → input stays unnamed → unchanged behavior.

### `src/components/community/composer.tsx` (rewrite render, keep logic shape)

- Keep: `useActionState(createPost)`, `type` state, `body` state, `options`
  state, welcome header, submit/counter row, error/success messages.
- Tab bar: icon-over-label buttons; active = `text-foreground` +
  `border-b-2 border-foreground`; inactive = `text-muted-foreground`, no
  border. `aria-pressed` retained.
- Render only the active tab's block:
  - **text**: `Textarea` placeholder "What are you building?".
  - **image**: `<Dropzone name="images" accept="image/*" hint="JPG, PNG, WebP, GIF or AVIF, up to 5MB" />`
    then a single-line caption input bound to `body`, placeholder
    "Add a caption…".
  - **youtube**: URL input (existing) + optional caption input bound to `body`.
  - **poll**: Poll|Quiz segmented toggle (local `quiz` boolean state) →
    question input bound to `body`, placeholder "Ask a question…" → option rows
    → add-option → closes-at. When `quiz` is on, each option row shows a radio
    (`name="pollCorrect"`, `value={i}`) to mark the correct answer.
- Hidden inputs: keep `type`; when poll, add `pollMode` = `quiz` or `poll`
  (a hidden input driven by the toggle). The `pollCorrect` radio is only
  rendered in quiz mode.
- Counter (`x/500`) shown on all text-bearing tabs; the `over` guard on submit
  is unchanged.
- The hint copy uses the **5MB** real limit from `actions.ts`
  (`MAX_BYTES = 5 * 1024 * 1024`), not the reference's 10MB.

**Correct-index ordering:** the radios must map to the same indices validation
computes. Validation filters empty options *then* indexes. To keep them
aligned, the composer sends `pollCorrect` as the index into the **non-empty**
options at submit time. Simplest correct approach: the radio `value` is the
option's array position, and validation must index its correct-answer against
the **same array positions before filtering**, then confirm that position
survived filtering (i.e. is non-empty). This avoids an off-by-one when a user
marks option 3 correct but leaves option 2 blank. Chosen rule:

- Composer radio `value` = array position `i` in the `options` state array.
- Validation: build `kept = options.map((o,i)=>({i,label:o.trim()})).filter(o=>o.label)`.
  Re-index `kept` to `{ i: newIndex, label }`. Map the submitted `pollCorrect`
  (original array position) to its new index in `kept`; reject if that original
  position was blank/removed.

This keeps a marked-correct blank option from silently shifting the answer.

### `src/components/community/poll.tsx` (quiz reveal)

- Read `post.poll?.mode` and `post.poll?.correct`.
- When it is a quiz and the tally is shown (`showTally`: viewer voted, or
  closed, or cannot vote):
  - Mark the correct option with a `Check` icon + visually-hidden "Correct
    answer" label.
  - If the viewer's `choice` is set and `!== correct`, mark their option as
    incorrect (muted "Your answer" note; no red required — monochrome, use
    existing `text-muted-foreground` / optional `text-danger` text token).
  - Show a small "Quiz" text label near the vote count.
- Plain polls (no `mode`) render exactly as today.

## Error handling

- All new validation failures return the existing `{ error }` shape surfaced by
  the composer's `state?.error` line — no new UI path.
- Dropzone with no files on the image tab still hits the existing
  "Attach at least one image." error.
- Quiz with no marked correct answer → "Mark the correct answer."

## Testing

Extend `src/lib/community/validate.test.ts` (existing) with quiz cases:
- Quiz with a valid `pollCorrect` → `ok`, `poll.mode === "quiz"`,
  `poll.correct` equals the re-indexed position.
- Quiz with no `pollCorrect` / out-of-range → `{ ok: false }`.
- Quiz where the marked-correct option is left blank → rejected (off-by-one
  guard).
- Plain poll (no `pollMode`) unchanged → no `mode`/`correct` on `poll`.

This is the runnable check for the only non-trivial new logic (the correct-index
re-mapping). No new test framework or fixtures.

## Files touched

| File | Change |
|------|--------|
| `src/components/community/composer.tsx` | Rewrite render (tab bar + tab-switched blocks + quiz toggle) |
| `src/components/ui/dropzone.tsx` | Add `name`/`accept` props + DataTransfer file sync |
| `src/lib/community/types.ts` | Extend `PollData` with `mode`/`correct` |
| `src/lib/community/validate.ts` | Quiz validation + correct-index re-mapping |
| `src/components/community/poll.tsx` | Quiz reveal rendering |
| `src/lib/community/validate.test.ts` | Quiz test cases |

## Verification

After implementation, run the dev server and, on `/community`:
- Cycle all 4 tabs — active underline moves, only that tab's fields show.
- Image: drag a file onto the dropzone, confirm it appears in the list and the
  post submits with the image.
- Poll: create a plain poll, vote, see the tally.
- Quiz: mark a correct answer, submit, vote wrong, confirm the correct option is
  revealed with the Check icon and your pick flagged.
- `npm run build` (or tsc) passes.
