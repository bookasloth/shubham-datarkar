# Community — Plan 5: Polls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poll posts — compose a 2–4 option poll, vote once, see a live tally. Closed polls are read-only.

**Architecture:** No new tables: `community_posts.poll` (jsonb) holds the options and `community_poll_votes` (PK `post_id,user_id`) enforces one vote per user per poll — both live since Plan 1. One new RPC batches tallies for every poll on a page in a single round trip, so a feed of N polls costs one extra query, not N.

**Tech Stack:** Next.js 16.2.9 server actions, Supabase RLS, vitest.

## Global Constraints

- **Target project:** OWN Supabase, ref `oyzzgjrefkppqkxjccot`. NEVER the BAS project.
- **Manual SQL:** `20260710000006_community_polls.sql` applied MANUALLY by the user.
- **Viewer identity is `auth.uid()`**, never a parameter.
- **Vote once, no changing it.** `community_poll_votes` PK is `(post_id, user_id)`; a second vote is an error, not an update. (Design says "vote once".)
- **Poll shape:** `poll = { options: [{ i: number, label: string }], closes_at?: string }`. `i` is the 0-based index and must match `community_poll_votes.option_index`.
- **Limits:** 2–4 options; each label 1–80 chars; blocklist-checked. Body optional, ≤500.
- **Closed poll** = `closes_at` in the past → read-only tally, no new votes. Enforced in the action, not just the UI.
- **Style:** monochrome, no emoji, `text-brand`/`bg-brand` only.
- **No new dependencies.**

---

### Task 1: Poll tally RPC

**Files:**
- Create: `supabase/migrations/20260710000006_community_polls.sql`

**Interfaces:**
- Produces `community_poll_results_many(p_posts uuid[])` → `(post_id uuid, option_index int, votes int, viewer_choice boolean)`. Options with zero votes simply don't appear; the client merges against `post.poll.options` and defaults them to 0.

```sql
-- =====================================================================
-- /community — poll tallies. Batched: one call per page, not per poll.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001.
-- =====================================================================

create or replace function public.community_poll_results_many(p_posts uuid[])
returns table (post_id uuid, option_index int, votes int, viewer_choice boolean)
language sql stable security definer set search_path = public as $$
  select v.post_id,
         v.option_index,
         count(*)::int                          as votes,
         bool_or(v.user_id = auth.uid())        as viewer_choice
  from public.community_poll_votes v
  where v.post_id = any(p_posts)
  group by v.post_id, v.option_index;
$$;

grant execute on function public.community_poll_results_many(uuid[]) to anon, authenticated;
```

- [ ] Write it. Commit. Hand to the user for manual apply.

---

### Task 2: Extend validation for polls

**Files:**
- Modify: `src/lib/community/validate.ts`
- Modify: `src/lib/community/validate.test.ts`

**Interfaces:**
- `PostInput` gains `pollOptions: string[]` and `pollClosesAt: string` (both may be empty).
- `PostValid` gains `type: "poll"` and `poll: PollData | null`.

Rules: 2–4 non-empty options after trim; each ≤80 chars; blocklist applies to every label and to the body; `closes_at` optional ISO string, must parse and be in the future if present.

- [ ] **Step 1: Tests first** — accept a 2-option poll; accept 4; reject 1; reject 5; reject a blank option; reject an 81-char label; reject a blocked label; reject a past `closes_at`; accept an absent `closes_at`.
- [ ] **Step 2: Implement.** `poll` result is `{ options: trimmed.map((label, i) => ({ i, label })), closes_at }`.
- [ ] **Step 3: `npx vitest run src/lib/community` → pass. Commit.**

---

### Task 3: `voteOnPoll` action

**Files:**
- Modify: `src/lib/community/engage-actions.ts`

**Interfaces:**
- `export async function voteOnPoll(postId: string, optionIndex: number): Promise<EngageResult>;`

Order: gate → load post (`type`, `poll`) → reject if not a poll → reject if `closes_at` is past → reject if `optionIndex` is out of range → insert. A duplicate vote surfaces as a unique-violation; translate it to `"You already voted."` rather than leaking the Postgres message.

```ts
export async function voteOnPoll(postId: string, optionIndex: number): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

  const { data: post } = await sb
    .from("community_posts")
    .select("type, poll")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.type !== "poll" || !post.poll) return { error: "That isn't a poll." };

  const poll = post.poll as { options: { i: number }[]; closes_at?: string };
  if (poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now()) {
    return { error: "This poll has closed." };
  }
  if (!poll.options.some((o) => o.i === optionIndex)) return { error: "Unknown option." };

  const { error: err } = await sb
    .from("community_poll_votes")
    .insert({ post_id: postId, user_id: user.id, option_index: optionIndex });
  if (err) {
    if (err.code === "23505") return { error: "You already voted." }; // unique violation
    return { error: err.message };
  }
  revalidatePath("/community");
  revalidatePath(`/community/p/${postId}`);
  return { ok: true };
}
```

- [ ] Write it. `tsc` clean. Commit.

---

### Task 4: Poll results query

**Files:**
- Modify: `src/lib/community/queries.ts`
- Modify: `src/lib/community/types.ts`

**Interfaces:**
```ts
export type PollResult = { counts: Record<number, number>; viewerChoice: number | null; total: number };
export async function listPollResults(postIds: string[]): Promise<Record<string, PollResult>>;
```
Returns `{}` for an empty input without hitting the DB.

- [ ] Write it. `tsc` clean. Commit.

---

### Task 5: Poll component

**Files:**
- Create: `src/components/community/poll.tsx`
- Modify: `src/components/community/post-card.tsx` (replace `PollStatic`)

**Interfaces:**
- `<Poll post={FeedPost} result={PollResult | undefined} canVote={boolean} />` — client.
- `PostCard` gains an optional `pollResult` prop; the pages pass it through.

Behavior:
- Not voted, `canVote`, not closed → option buttons; click → optimistic mark + `voteOnPoll` → `router.refresh()`, rollback on error.
- Voted, or closed, or cannot vote → percentage bars (`votes/total`), the viewer's pick marked, `total` shown, plus "Poll closed" when applicable.
- Zero votes → all bars 0%, no divide-by-zero.

- [ ] Write it. `tsc` + `eslint` clean. Commit.

---

### Task 6: Composer poll tab

**Files:**
- Modify: `src/components/community/composer.tsx`
- Modify: `src/lib/community/actions.ts`

- Composer gains a fourth tab, **Poll**: 2 option inputs by default, "Add option" up to 4, remove buttons, an optional `datetime-local` close field. Inputs post as repeated `pollOptions` fields + one `pollClosesAt`.
- `createPost` reads `formData.getAll("pollOptions")` and `formData.get("pollClosesAt")`, passes them to `validatePost`, and inserts `poll: valid.poll` with `type: "poll"`.

- [ ] Write it. `tsc` + `eslint` clean. Commit.

---

### Task 7: Wire tallies into the pages

**Files:**
- Modify: `src/app/community/page.tsx`, `src/app/community/p/[id]/page.tsx`, `src/app/community/bookmarks/page.tsx`, `src/app/community/me/page.tsx`

Each page: collect the ids of posts with `type === "poll"`, call `listPollResults(ids)` once, pass `pollResult={results[post.id]}` into `PostCard`.

- [ ] Write it. Verify + commit.

---

### Task 8: Verification

- [ ] `npx vitest run` → all pass.
- [ ] `npx tsc --noEmit` → 0. `npx eslint …` → 0.
- [ ] `npx next build` → **its own exit code** must be 0.
- [ ] Dev server: `/community` 200. After the user applies the migration and posts a poll: options render; voting once records; a second vote reports "You already voted."; the tally sums correctly; a past `closes_at` renders "Poll closed" and rejects votes.

## Self-Review

**Spec coverage (design Phase 5):** poll composer ✓ (Task 6) · vote-once ✓ (PK + Task 3) · live tally ✓ (Tasks 1, 4, 5). Closed polls read-only ✓.

**No new tables** — `poll` jsonb + `community_poll_votes` shipped in Plan 1.

**Security:** `voteOnPoll` re-checks poll type, closing time, and option range server-side; the PK enforces one vote even under a race; `community_poll_votes_self` RLS means a forged `postId` can only ever write the caller's own row. Viewer choice comes from `auth.uid()`.

**Efficiency:** one batched `community_poll_results_many` call per page rather than one per poll.

**Known ceiling:** votes are final — no re-vote, matching the stated design. Zero-vote options are absent from the RPC result and defaulted client-side.
