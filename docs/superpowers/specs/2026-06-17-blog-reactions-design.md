# Blog Reaction Bar — Design

Date: 2026-06-17
Status: Approved (pending spec review)

## Goal

Replace the placeholder "Add a Comment" CTA on blog posts with a 6-reaction
bar. Visitors click a reaction; the count for that reaction is persisted per
post. No free-text comments are ever collected. Purpose is reader feel-good
plus light social proof — the site owner never needs to read the data.

Non-goals: comment threads, user-typed text, moderation, auth, notifications.

## UI

Location: the "Comments CTA" block in `src/components/blog/post-footer.tsx`
(currently lines ~53-62). The block's button is replaced by a `ReactionBar`.

- Section heading reworded to **"How was this article?"** (eyebrow "Reactions"
  optional, follow existing eyebrow style).
- Six reactions in one row, ordered best → worst. All lucide icons, monochrome,
  ghost style to match the locked B&W system.

| order | key        | lucide icon | label (title + aria-label) |
|-------|------------|-------------|----------------------------|
| 1     | love       | Heart       | Loved it                   |
| 2     | fire       | Flame       | Great                      |
| 3     | insightful | Lightbulb   | Insightful                 |
| 4     | meh        | Meh         | Meh                        |
| 5     | confused   | HelpCircle  | Confused                   |
| 6     | down       | ThumbsDown  | Not for me                 |

States:
- **Default (no pick):** icons only, outline/ghost. No numbers shown.
- **On click:** picked icon fills/animates; counts reveal under **all six**.
- **Switch:** clicking a different icon moves the vote (old empties, new fills),
  counts update.
- **Toggle off:** clicking the current pick removes the vote; counts hide again.

Each icon is a real `<button>` with `aria-label` and `aria-pressed`.

## Client state / dedup

`ReactionBar` is a client component. Current pick stored in
`localStorage["reaction:<post_slug>"]` (value = reaction key, or absent = none).
One pick per post, switchable. Client-side only — not bulletproof, acceptable
for vanity counters.

On mount: read localStorage to show the user's prior pick (filled icon). Counts
are NOT fetched on mount — they only appear after the user interacts, matching
"hide until clicked". (A returning user with a stored pick is treated as already
engaged: their pick shows filled, and the first interaction reveals counts.)

## Data flow

1. User clicks reaction `next` (or clicks current pick to clear → `next = null`).
2. Client computes `prev` from localStorage, calls server action
   `react(slug, next, prev)`.
3. Server action (`"use server"`) calls `supabaseAdmin()` (service-role client,
   same pattern as `affiliate-actions.ts`) → invokes Postgres RPC
   `apply_reaction(p_slug, p_next, p_prev)`.
4. RPC applies the delta atomically (−1 prev, +1 next, both optional) and returns
   the full count map for the post.
5. Server action returns `{ love, fire, insightful, meh, confused, down }`
   (missing keys = 0). Client updates localStorage and renders counts.

No anon read policy is needed — counts come back in the action response, so the
browser never queries the table directly. Writes go through service role only.

### Files

- `supabase/migrations/20260617000002_post_reactions.sql` — table + RPC + RLS.
- `src/lib/blog/reactions.ts` — shared reaction config (keys, labels, icon names,
  order) + types. Single source of truth for both UI and validation.
- `src/lib/blog/reaction-actions.ts` — `"use server"` `react()` action.
- `src/components/blog/reaction-bar.tsx` — client component.
- `src/components/blog/post-footer.tsx` — swap CTA button for `<ReactionBar slug>`.

## Database (manual SQL — run by user against own Supabase)

```sql
-- Per-post reaction counters. Counter only: never stores user text, identity,
-- or IP. Writes via service-role; the apply_reaction RPC does atomic deltas.
create table if not exists public.post_reactions (
  post_slug text not null,
  reaction  text not null check (reaction in
    ('love','fire','insightful','meh','confused','down')),
  count     int  not null default 0,
  primary key (post_slug, reaction)
);

alter table public.post_reactions enable row level security;
-- No anon/authenticated policy: all access via service-role (RLS bypass).

-- Atomic apply: decrement p_prev (if given), increment p_next (if given),
-- return the full count map for the post. SECURITY DEFINER so it can run
-- under the service-role path; not granted to anon.
create or replace function public.apply_reaction(
  p_slug text, p_next text, p_prev text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if p_prev is not null then
    update public.post_reactions set count = greatest(count - 1, 0)
      where post_slug = p_slug and reaction = p_prev;
  end if;
  if p_next is not null then
    insert into public.post_reactions (post_slug, reaction, count)
      values (p_slug, p_next, 1)
      on conflict (post_slug, reaction)
      do update set count = public.post_reactions.count + 1;
  end if;
  select coalesce(jsonb_object_agg(reaction, count), '{}'::jsonb)
    into result from public.post_reactions where post_slug = p_slug;
  return result;
end $$;

revoke all on function public.apply_reaction(text, text, text) from public, anon;
```

## Error handling

- Server action wraps the RPC call; on error returns `{ ok: false }` and the
  client keeps the optimistic UI but silently skips the count reveal (no error
  toast — this is a vanity feature, failures must not nag the reader).
- Invalid reaction keys rejected server-side against the shared config before the
  RPC call.
- `greatest(count - 1, 0)` prevents negative counts from stale `prev` values.

## Testing / verification

Preview (`preview_*`, no screenshots per project pref):
- Click each reaction → icon fills, all 6 counts reveal.
- Switch pick → old count −1, new +1.
- Toggle same pick off → vote removed, counts hide.
- Reload → stored pick still shown filled.
- Console clean, no failed network calls.

## Out of scope / future

- Admin view of counts (owner explicitly does not want to see them).
- Abuse hardening beyond localStorage (rate limiting, IP dedup).
