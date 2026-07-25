# Build-in-Public Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development or executing-plans. Checkbox steps.

**Goal:** Opt-in `Thread:` / `Version:` PR-body lines group notes into arcs and releases; chips on note cards link to a thread "story" page and a release-notes view; real sagas backfilled.

**Architecture:** Two new opt-in body lines parsed like the existing `Tweet:` line, stored in two nullable `community_posts` columns. `community_feed` / `community_post` gain `thread`/`version` as **additive final return columns** (the exact low-risk pattern the `avatar_url` migration used — no new params, grant signature unchanged). Chips render in the normal feed. Thread + release pages are **lightweight public story lists** (a simple indexed select of tagged notes, each linking to its permalink) — deliberately NOT a second hydration RPC, to keep the fragile `community_feed` untouched by new filter params.

**Pivot from spec:** the spec proposed threading `p_thread`/`p_version` *filter params* through `community_feed`. After reading it, that's the fragile surgery memory warns about. Instead: additive return columns only (chips), and lightweight non-RPC story pages (thread/version views). Same UX, far lower risk.

## Global Constraints

- **Manual SQL workflow** — write migration + backfill as files/SQL, hand to owner, never apply directly.
- **No new params on `community_feed`** — only append `thread`/`version` return columns (follow `20260718000002_community_avatar_url.sql`). Grant signature stays identical.
- **No emojis** in chips — lucide icons.
- **Preserve feed gating** everywhere member content is listed.
- Verify `next build` exits 0.
- Copy says "notes".

---

### Task 1: Migration — columns + indexes

**Files:** Create `supabase/migrations/20260726000001_community_spine.sql`

- [ ] **Step 1: Write migration**

```sql
-- Build-in-public spine: opt-in thread + version tags on notes.
-- Target: OWN Supabase (oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
alter table public.community_posts add column if not exists thread  text;
alter table public.community_posts add column if not exists version text;

create index if not exists community_posts_thread_idx
  on public.community_posts (thread, created_at) where thread is not null;
create index if not exists community_posts_version_idx
  on public.community_posts (version, created_at) where version is not null;
```

- [ ] **Step 2: Commit.** `git commit -m "feat(community): thread/version columns for the spine"`

---

### Task 2: Extend `community_feed` + `community_post` return with thread/version

**Files:** Create `supabase/migrations/20260726000002_community_spine_feed.sql`

Copy the CURRENT definitions from `20260725000002_community_hot_bigint.sql` (community_feed)
and the current `community_post` (from `20260718000002_community_avatar_url.sql` /
`20260714000004`), and in each:
- add `thread text, version text` as the **final two columns** of `returns table (...)`;
- carry `p.thread, p.version` through the CTE selects (`src`/`filtered` for the feed) and
  the final `select`;
- keep the parameter list and `grant execute (...)` signature **unchanged**.

- [ ] **Step 1:** Write the migration re-defining both functions with the two appended columns (full function bodies copied from the latest defs, with the additions).
- [ ] **Step 2:** Hand SQL to owner to run (Tasks 1+2 together).
- [ ] **Step 3: Commit.** `git commit -m "feat(community): return thread/version from feed RPCs"`

---

### Task 3: `extractThread` / `extractVersion` helpers (tested)

**Files:** Modify `src/lib/community/auto/pr.ts`; create `src/lib/community/auto/spine.test.ts`

**Interfaces:** `extractThread(body): string | null` (slug: lower, spaces→`-`, `[a-z0-9-]`, ≤48, null if empty); `extractVersion(body): string | null` (trim, `^v?\d[\w.]*$`, ≤16, null if invalid).

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { extractThread, extractVersion } from "./pr";

describe("extractThread", () => {
  it("slugifies the line", () => {
    expect(extractThread("Thread: Sign-in Wall")).toBe("sign-in-wall");
  });
  it("null when absent", () => {
    expect(extractThread("no line here")).toBeNull();
  });
  it("strips junk chars and caps", () => {
    expect(extractThread("Thread:  Profile Redesign!! ")).toBe("profile-redesign");
  });
});

describe("extractVersion", () => {
  it("accepts v3.6", () => {
    expect(extractVersion("Version: v3.6")).toBe("v3.6");
  });
  it("accepts 3.6.1 and trims", () => {
    expect(extractVersion("Version:  3.6.1 ")).toBe("3.6.1");
  });
  it("null on garbage", () => {
    expect(extractVersion("Version: next-big-thing")).toBeNull();
  });
  it("null when absent", () => {
    expect(extractVersion("nothing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect fail.** `npx vitest run src/lib/community/auto/spine.test.ts`

- [ ] **Step 3: Implement in `pr.ts`** (append after `extractTweet`):

```ts
/** Opt-in `Thread:` line → a URL-safe slug grouping notes into one arc. Mirrors
 *  extractTweet's single-line match; slugified so it's a clean route segment. */
export function extractThread(body: string | null | undefined): string | null {
  if (!body) return null;
  const m = body.match(/^[ \t]*Thread:[ \t]*(\S.*)$/im);
  if (!m) return null;
  const slug = m[1]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || null;
}

/** Opt-in `Version:` line → a short release tag (v3.6, 3.6.1). Rejects free text
 *  so a stray "Version: soon" never mints a bogus release view. */
export function extractVersion(body: string | null | undefined): string | null {
  if (!body) return null;
  const m = body.match(/^[ \t]*Version:[ \t]*(\S.*)$/im);
  if (!m) return null;
  const v = m[1].trim().slice(0, 16);
  return /^v?\d[\w.]*$/.test(v) ? v : null;
}
```

- [ ] **Step 4: Run — expect pass.**
- [ ] **Step 5: Commit.** `git commit -m "feat(community): extractThread/extractVersion helpers"`

---

### Task 4: Pipeline — write thread/version on auto-post

**Files:** Modify `src/lib/community/auto/post.ts`, `src/app/api/community/github/route.ts`

- [ ] **Step 1:** `autoPost` input gains `thread?: string | null; version?: string | null`; include them in the insert object (`thread: input.thread ?? null, version: input.version ?? null`).
- [ ] **Step 2:** In `route.ts`, import `extractThread, extractVersion`; after building `body`, call `autoPost({ sourceKey: ..., body, thread: extractThread(pr.body), version: extractVersion(pr.body) })`.
- [ ] **Step 3: Typecheck.** `npx tsc --noEmit`
- [ ] **Step 4: Commit.** `git commit -m "feat(community): store thread/version when auto-posting a PR note"`

---

### Task 5: FeedPost + row-map + chips

**Files:** Modify `src/lib/community/types.ts`, `src/lib/community/queries.ts`, create `src/components/community/note-badges.tsx`, modify `src/components/community/post-card.tsx`

- [ ] **Step 1:** `FeedPost` gains `thread: string | null; version: string | null`.
- [ ] **Step 2:** `mapRow` (queries.ts) reads `thread: (r.thread as string) ?? null, version: (r.version as string) ?? null`.
- [ ] **Step 3:** Create `note-badges.tsx`:

```tsx
import Link from "next/link";
import { GitBranch, Tag } from "lucide-react";

/** Humanize a thread slug for display: "sign-in-wall" → "Sign-in wall". */
export function humanizeThread(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CHIP =
  "inline-flex items-center gap-1 rounded-btn bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-ui hover:text-foreground";

export function NoteBadges({ thread, version }: { thread: string | null; version: string | null }) {
  if (!thread && !version) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {thread && (
        <Link href={`/community/thread/${thread}`} className={CHIP}>
          <GitBranch className="size-3" /> Part of: {humanizeThread(thread)}
        </Link>
      )}
      {version && (
        <Link href={`/community/release/${encodeURIComponent(version)}`} className={CHIP}>
          <Tag className="size-3" /> shipped in {version}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 4:** In `post-card.tsx`, render `<NoteBadges thread={post.thread} version={post.version} />` near `<PostTags />` (before `<EngagementBar>`).
- [ ] **Step 5: Typecheck.**
- [ ] **Step 6: Commit.** `git commit -m "feat(community): thread/version chips on note cards"`

---

### Task 6: Lightweight thread + release story pages

**Files:** Create `src/lib/community/spine-queries.ts`, `src/app/community/thread/[key]/page.tsx`, `src/app/community/release/[version]/page.tsx`

**Interfaces:** `listThreadNotes(thread)`, `listReleaseNotes(version)` → `{ publicId, body, createdAt, type }[]`, from a simple `supabaseAnon` select on `community_posts` (public founder notes), ordered — thread **asc** (story), release **desc**.

- [ ] **Step 1:** Write `spine-queries.ts`:

```ts
import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";

export type SpineNote = { publicId: string; body: string | null; createdAt: string; type: string };

async function listBy(col: "thread" | "version", val: string, asc: boolean): Promise<SpineNote[]> {
  const sb = supabaseAnon();
  const { data } = await sb
    .from("community_posts")
    .select("public_id, body, created_at, type")
    .eq(col, val)
    .is("parent_id", null)
    .eq("hidden", false)
    .order("created_at", { ascending: asc })
    .limit(100);
  return (data ?? []).map((r) => ({
    publicId: String(r.public_id),
    body: (r.body as string) ?? null,
    createdAt: r.created_at as string,
    type: r.type as string,
  }));
}

/** A thread arc reads oldest → newest (the story). */
export const listThreadNotes = (thread: string) => listBy("thread", thread, true);
/** Release notes read newest first. */
export const listReleaseNotes = (version: string) => listBy("version", version, false);
```

- [ ] **Step 2:** Write the thread page (`thread/[key]/page.tsx`): `notFound()` if empty; header "The {humanizeThread(key)} story · N notes"; render each note as a compact timeline row (body + relative time) linking to `/community/p/{publicId}`. `noIndex` metadata (like other community pages). Public read — these are the founder's own build-log notes; that is the entire point of the feature.
- [ ] **Step 3:** Write the release page (`release/[version]/page.tsx`): same, header "Release notes · {version}", newest-first, `notFound()` if empty.
- [ ] **Step 4:** Typecheck + `npx next build` (expect exit 0).
- [ ] **Step 5: Commit.** `git commit -m "feat(community): thread + release story pages"`

---

### Task 7: Backfill the real sagas (verify-then-update SQL)

**Files:** none committed — SQL handed to owner.

- [ ] **Step 1:** Produce a verify query first:

```sql
select auto_key, left(body, 40) from public.community_posts
 where auto_key in (
   'pr:bookasloth/shubham-datarkar#312','pr:bookasloth/shubham-datarkar#314',
   'pr:bookasloth/shubham-datarkar#315','pr:bookasloth/shubham-datarkar#316',
   'pr:bookasloth/shubham-datarkar#317','pr:bookasloth/shubham-datarkar#318',
   'pr:bookasloth/shubham-datarkar#323','pr:bookasloth/shubham-datarkar#325',
   'pr:bookasloth/shubham-datarkar#324','pr:bookasloth/shubham-datarkar#327')
 order by auto_key;
```

- [ ] **Step 2:** Then the tagging UPDATEs (owner runs only for rows that came back):

```sql
update public.community_posts set thread='social-layer'
 where auto_key in ('pr:bookasloth/shubham-datarkar#312','pr:bookasloth/shubham-datarkar#314','pr:bookasloth/shubham-datarkar#315','pr:bookasloth/shubham-datarkar#316','pr:bookasloth/shubham-datarkar#317','pr:bookasloth/shubham-datarkar#318');
update public.community_posts set thread='sign-in-wall'
 where auto_key in ('pr:bookasloth/shubham-datarkar#323','pr:bookasloth/shubham-datarkar#325');
update public.community_posts set thread='sidebar'
 where auto_key in ('pr:bookasloth/shubham-datarkar#324','pr:bookasloth/shubham-datarkar#327');
```

- [ ] **Step 3:** Hand both to owner; note which auto_keys were missing.

---

### Task 8: Verify

- [ ] Preview: a note with a thread (after backfill + migration) shows the chip; thread page renders the arc oldest-first; release page filters; logged-out can read a thread page (public build-log).
- [ ] Confirm the untagged feed still renders (additive RPC columns didn't break the map).

## Notes for implementer

- Follow `20260718000002_community_avatar_url.sql` verbatim as the template for appending return columns to `community_feed`/`community_post` — same "final column" approach, no param/grant changes.
- Thread/version pages are intentionally lightweight (no votes/bookmarks) — interaction happens on the permalink each row links to.
- `sanitizeQuery`/`FeedQuery` need NOT change (no feed-RPC filter params in this pivot).
