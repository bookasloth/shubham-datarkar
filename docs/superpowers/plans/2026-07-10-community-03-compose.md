# Community — Plan 3: Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only feed into a real one — verified members can publish `text`, `text+image` (≤4), and `youtube` posts through a composer, gated by `community_can_post()` and a text blocklist.

**Architecture:** One `"use server"` action (`createPost`) does auth-gate → pure validation → image upload → insert. Validation is extracted into a pure, unit-tested function so the action stays thin. Images upload through `supabaseAdmin()` (the codebase's existing storage pattern) into a new public `community-media` bucket, and the **full public URL** is stored in `community_posts.images` — `next.config.ts` already whitelists `*.supabase.co/storage/v1/object/public/**`, so `next/image` works with zero config change. YouTube reuses the existing `parseVideoUrl` (support/video) rather than a new parser.

**Tech Stack:** Next.js 16.2.9 server actions, React 19 `useActionState`, Supabase Storage, vitest.

## Global Constraints

- **Target project:** OWN Supabase, ref `oyzzgjrefkppqkxjccot`. NEVER the BAS project.
- **Manual SQL:** the bucket migration `20260710000004_community_media.sql` is applied MANUALLY by the user. Do not apply it with any tool.
- **Post gate:** only a logged-in, email-verified, non-banned account may post. Enforced twice — `community_can_post()` checked in the action AND by the `community_posts_insert` RLS policy (already live from Plan 1).
- **Limits:** body ≤ **500 chars**; images ≤ **4**, each ≤ **5 MB**, `image/*` only.
- **Reuse, do not reinvent:** `parseVideoUrl` (`src/lib/support/video.ts`) for YouTube; `supabaseAuthServer()` for user-scoped reads/writes; `supabaseAdmin()` for storage upload; `Button` (has `loading` prop), `Textarea` from `src/components/ui/`.
- **Store full public URLs** in `community_posts.images`, never bare storage paths.
- **Style:** monochrome, no emoji. Brand accent only via `text-brand`/`bg-brand` tokens.
- **Server action convention:** validate first and **return** a typed `{ error }` — never throw for user errors. `revalidatePath("/community")` after a successful insert.
- **No new dependencies.**
- Polls are **out of scope** (Plan 5). The composer ships text / image / youtube only.

---

### Task 1: Storage bucket migration

**Files:**
- Create: `supabase/migrations/20260710000004_community_media.sql`

**Interfaces:**
- Produces: public bucket `community-media`; `storage.objects` policies — public read, insert restricted to accounts passing `community_can_post()`, delete restricted to admin.

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================================
-- /community — media bucket for post images.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001_community_schema.sql (community_can_post).
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', true)
on conflict (id) do nothing;

drop policy if exists community_media_public_read on storage.objects;
create policy community_media_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'community-media');

-- Defense in depth: the server action uploads with the service role, but a
-- direct client upload must still pass the post gate.
drop policy if exists community_media_member_write on storage.objects;
create policy community_media_member_write
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'community-media' and public.community_can_post());

drop policy if exists community_media_admin_delete on storage.objects;
create policy community_media_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'community-media' and public.is_admin());
```

- [ ] **Step 2: Commit, then hand to the user for manual apply**

Verification the user runs:
```sql
select id, public from storage.buckets where id = 'community-media';         -- 1 row, public = true
select policyname from pg_policies where tablename = 'objects'
  and policyname like 'community_media%';                                     -- 3 rows
```

---

### Task 2: Text blocklist

**Files:**
- Create: `src/lib/community/blocklist.ts`
- Test: `src/lib/community/blocklist.test.ts`

**Interfaces:**
- Produces: `containsBlocked(text: string): boolean` — case-insensitive, word-boundary, punctuation-tolerant.

Design note: this is a **first-line filter, not moderation**. It catches lazy explicit spam; determined abuse is handled by report + admin (Plan 6). The list is deliberately short and extensible — a long slur list belongs in config the site owner curates, not hardcoded here.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { containsBlocked } from "./blocklist";

describe("containsBlocked", () => {
  it("flags an explicit term", () => expect(containsBlocked("free porn here")).toBe(true));
  it("is case insensitive", () => expect(containsBlocked("FREE PORN")).toBe(true));
  it("tolerates punctuation", () => expect(containsBlocked("buy nudes!!!")).toBe(true));
  it("does not flag substrings of clean words", () => {
    expect(containsBlocked("I went to Scunthorpe")).toBe(false);
    expect(containsBlocked("classic analysis of the data")).toBe(false);
  });
  it("passes clean text", () => expect(containsBlocked("shipped a new feature today")).toBe(false));
  it("handles empty", () => expect(containsBlocked("")).toBe(false));
});
```

The Scunthorpe case is the point: match on **word boundaries**, never bare substrings.

- [ ] **Step 2: Implement**

```ts
// First-line explicit-content filter. Intentionally short: report + admin
// review (Plan 6) is the real moderation path. Extend BLOCKED as needed.
const BLOCKED = [
  "porn", "porno", "pornhub", "xxx", "nudes", "nudity",
  "onlyfans", "camgirl", "escort", "sexcam", "hentai",
];

const PATTERN = new RegExp(`\\b(${BLOCKED.join("|")})\\b`, "i");

export function containsBlocked(text: string): boolean {
  if (!text) return false;
  return PATTERN.test(text);
}
```

- [ ] **Step 3: Run tests, verify pass.** `npx vitest run src/lib/community/blocklist.test.ts`

- [ ] **Step 4: Commit**

---

### Task 3: Pure post validation

**Files:**
- Create: `src/lib/community/validate.ts`
- Test: `src/lib/community/validate.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PostInput = { type: string; body: string; imageCount: number; youtubeUrl: string };
  export type PostValid =
    | { ok: true; type: "text" | "image" | "youtube"; body: string | null; youtubeId: string | null }
    | { ok: false; error: string };
  export function validatePost(input: PostInput): PostValid;
  ```
- Consumed by `createPost` (Task 4). Keeps every rule unit-testable without auth or a DB.

Rules:
- `type` must be one of `text | image | youtube`.
- `body` trimmed; > 500 chars → error. Required (non-empty) for `text`; optional for `image`/`youtube`.
- `image`: `imageCount` between 1 and 4.
- `youtube`: `parseVideoUrl(youtubeUrl)` must return `provider === "youtube"`; yields `youtubeId`.
- `containsBlocked(body)` → error.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { validatePost } from "./validate";

const base = { type: "text", body: "hello", imageCount: 0, youtubeUrl: "" };

describe("validatePost", () => {
  it("accepts a text post", () => {
    const r = validatePost(base);
    expect(r).toMatchObject({ ok: true, type: "text", body: "hello" });
  });
  it("rejects an unknown type", () =>
    expect(validatePost({ ...base, type: "gif" })).toMatchObject({ ok: false }));
  it("rejects empty text", () =>
    expect(validatePost({ ...base, body: "   " })).toMatchObject({ ok: false }));
  it("rejects over 500 chars", () =>
    expect(validatePost({ ...base, body: "x".repeat(501) })).toMatchObject({ ok: false }));
  it("rejects blocked words", () =>
    expect(validatePost({ ...base, body: "free porn" })).toMatchObject({ ok: false }));
  it("accepts image post with 1-4 images and no body", () =>
    expect(validatePost({ ...base, type: "image", body: "", imageCount: 3 })).toMatchObject({ ok: true, type: "image" }));
  it("rejects image post with 0 images", () =>
    expect(validatePost({ ...base, type: "image", body: "", imageCount: 0 })).toMatchObject({ ok: false }));
  it("rejects image post with 5 images", () =>
    expect(validatePost({ ...base, type: "image", body: "", imageCount: 5 })).toMatchObject({ ok: false }));
  it("accepts a youtube post and extracts the id", () =>
    expect(validatePost({ ...base, type: "youtube", body: "", youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" }))
      .toMatchObject({ ok: true, type: "youtube", youtubeId: "dQw4w9WgXcQ" }));
  it("rejects a non-youtube url", () =>
    expect(validatePost({ ...base, type: "youtube", body: "", youtubeUrl: "https://vimeo.com/123" }))
      .toMatchObject({ ok: false }));
});
```

- [ ] **Step 2: Implement**

```ts
import { parseVideoUrl } from "@/lib/support/video";
import { containsBlocked } from "./blocklist";

const MAX_BODY = 500;
const MAX_IMAGES = 4;

export type PostInput = { type: string; body: string; imageCount: number; youtubeUrl: string };
export type PostValid =
  | { ok: true; type: "text" | "image" | "youtube"; body: string | null; youtubeId: string | null }
  | { ok: false; error: string };

export function validatePost(input: PostInput): PostValid {
  const type = input.type;
  if (type !== "text" && type !== "image" && type !== "youtube") {
    return { ok: false, error: "Unknown post type." };
  }

  const body = input.body.trim();
  if (body.length > MAX_BODY) return { ok: false, error: `Keep it under ${MAX_BODY} characters.` };
  if (type === "text" && body.length === 0) return { ok: false, error: "Write something first." };
  if (containsBlocked(body)) return { ok: false, error: "That post looks like explicit content." };

  if (type === "image") {
    if (input.imageCount < 1) return { ok: false, error: "Attach at least one image." };
    if (input.imageCount > MAX_IMAGES) return { ok: false, error: `Up to ${MAX_IMAGES} images.` };
    return { ok: true, type, body: body || null, youtubeId: null };
  }

  if (type === "youtube") {
    const video = parseVideoUrl(input.youtubeUrl);
    if (!video || video.provider !== "youtube") return { ok: false, error: "Paste a valid YouTube link." };
    return { ok: true, type, body: body || null, youtubeId: video.videoId };
  }

  return { ok: true, type: "text", body, youtubeId: null };
}
```

- [ ] **Step 3: Run tests, verify pass. Step 4: Commit.**

---

### Task 4: `createPost` server action + `viewerCanPost`

**Files:**
- Create: `src/lib/community/actions.ts`
- Modify: `src/lib/community/queries.ts` (add `viewerCanPost`)

**Interfaces:**
- Consumes: `validatePost` (Task 3), `supabaseAuthServer`, `supabaseAdmin`.
- Produces:
  ```ts
  export type CreatePostState = { error?: string; ok?: boolean } | undefined;
  export async function createPost(prev: CreatePostState, formData: FormData): Promise<CreatePostState>;
  // queries.ts
  export async function viewerCanPost(): Promise<boolean>;   // rpc community_can_post
  ```

Order of operations (important): auth → `community_can_post` → pure validation → **then** upload images. Never upload before validation, or a rejected post leaves orphaned objects in the bucket.

- [ ] **Step 1: Add `viewerCanPost` to `queries.ts`**

```ts
export async function viewerCanPost(): Promise<boolean> {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_can_post");
  if (error) return false;
  return Boolean(data);
}
```

- [ ] **Step 2: Write the action**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validatePost } from "./validate";

const BUCKET = "community-media";
const MAX_BYTES = 5 * 1024 * 1024;

export type CreatePostState = { error?: string; ok?: boolean } | undefined;

export async function createPost(_prev: CreatePostState, formData: FormData): Promise<CreatePostState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in to post." };

  const { data: canPost } = await sb.rpc("community_can_post");
  if (!canPost) return { error: "Verify your email to post." };

  const files = (formData.getAll("images") as File[]).filter((f) => f && f.size > 0);
  const valid = validatePost({
    type: String(formData.get("type") ?? "text"),
    body: String(formData.get("body") ?? ""),
    imageCount: files.length,
    youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
  });
  if (!valid.ok) return { error: valid.error };

  // Upload only after validation passes, so rejects leave no orphans.
  let imageUrls: string[] | null = null;
  if (valid.type === "image") {
    for (const f of files) {
      if (f.size > MAX_BYTES) return { error: "Each image must be under 5MB." };
      if (!f.type.startsWith("image/")) return { error: "Images only." };
    }
    const admin = supabaseAdmin();
    const urls: string[] = [];
    for (const f of files) {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { error } = await admin.storage.from(BUCKET).upload(path, f, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
      if (error) return { error: `Upload failed: ${error.message}` };
      urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    imageUrls = urls;   // full public URLs — next.config already allows this host
  }

  // Insert as the user: the community_posts_insert RLS policy re-checks the gate.
  const { error } = await sb.from("community_posts").insert({
    user_id: user.id,
    type: valid.type,
    body: valid.body,
    images: imageUrls,
    youtube_id: valid.youtubeId,
  });
  if (error) return { error: error.message };

  revalidatePath("/community");
  return { ok: true };
}
```

- [ ] **Step 3: `npx tsc --noEmit` → clean. Commit.**

---

### Task 5: Composer UI

**Files:**
- Create: `src/components/community/composer.tsx`

**Interfaces:**
- Consumes: `createPost` (Task 4), `Button`, `Textarea` from `src/components/ui/`.
- Produces: `<Composer />` — client component. Three modes via a small tab strip (Text / Image / YouTube), a 500-char counter, a native `<input type="file" multiple accept="image/*">` (no Dropzone: native file inputs post straight through `FormData` to the server action), a YouTube URL field, submit with `loading`, inline error/success.

Skipped deliberately: drag-and-drop, image previews, draft autosave. Add when someone asks.

- [ ] **Step 1: Write it**

```tsx
"use client";
import { useActionState, useState } from "react";
import { createPost, type CreatePostState } from "@/lib/community/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "text", label: "Text" },
  { key: "image", label: "Image" },
  { key: "youtube", label: "YouTube" },
] as const;

const MAX = 500;

export function Composer() {
  const [type, setType] = useState<(typeof TABS)[number]["key"]>("text");
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState<CreatePostState, FormData>(createPost, undefined);
  const over = body.length > MAX;

  return (
    <form
      action={formAction}
      className="border-b border-border px-4 py-3"
      onSubmit={() => setBody("")}
    >
      <input type="hidden" name="type" value={type} />

      <div className="mb-2 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={cn(
              "rounded-btn px-2.5 py-1 text-xs transition-ui",
              type === t.key ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={type === "text" ? "What are you building?" : "Say something (optional)"}
        rows={3}
        className="resize-none border-0 px-0 focus-visible:ring-0"
      />

      {type === "image" && (
        <input
          type="file"
          name="images"
          multiple
          accept="image/*"
          className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-btn file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:text-foreground"
        />
      )}

      {type === "youtube" && (
        <input
          type="url"
          name="youtubeUrl"
          placeholder="https://youtube.com/watch?v=..."
          className="mt-2 w-full rounded-input border border-border bg-transparent px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
        />
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className={cn("text-xs", over ? "text-danger" : "text-muted-foreground")}>
          {body.length}/{MAX}
        </span>
        <Button type="submit" size="sm" loading={pending} disabled={over}>
          Post
        </Button>
      </div>

      {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-success">Posted.</p>}
    </form>
  );
}
```

- [ ] **Step 2: `tsc` + `eslint` clean. Commit.**

---

### Task 6: Wire the composer into the feed + compose route

**Files:**
- Modify: `src/app/community/page.tsx`
- Create: `src/app/community/compose/page.tsx`

**Interfaces:**
- Consumes: `viewerCanPost` (Task 4), `Composer` (Task 5).
- Produces: composer at the top of the feed for eligible users; a sign-in / verify prompt otherwise. `/community/compose` renders the composer standalone (the left-nav "Post" button already links there — it currently 404s).

- [ ] **Step 1: Feed page — render composer or prompt**

In `src/app/community/page.tsx`, after `getMemberContext()`:

```tsx
const canPost = user ? await viewerCanPost() : false;
```
and above the feed, inside the returned JSX (after `<SortMenu … />`):

```tsx
{canPost ? (
  <Composer />
) : (
  <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
    {user ? (
      "Verify your email to post."
    ) : (
      <>
        <Link href="/members/login?next=/community" className="text-brand hover:underline">Sign in</Link>{" "}
        to join the conversation.
      </>
    )}
  </p>
)}
```
(add `import Link from "next/link"`, `import { Composer } from "@/components/community/composer"`, and `viewerCanPost` to the `queries` import.)

- [ ] **Step 2: Compose route**

`src/app/community/compose/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { viewerCanPost } from "@/lib/community/queries";
import { Composer } from "@/components/community/composer";

export const metadata = { title: "New post" };

export default async function ComposePage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/members/login?next=/community/compose");
  if (!(await viewerCanPost())) redirect("/community");
  return (
    <div>
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">New post</h1>
      <Composer />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

- `npx tsc --noEmit` and `npx eslint …` → clean.
- `npx vitest run src/lib/community` → blocklist + validate suites pass.
- Dev server: `GET /community` returns 200; logged-out HTML contains "Sign in" and does NOT contain the composer's "What are you building?" placeholder.
- `GET /community/compose` logged-out → redirects (3xx) to `/members/login`.

- [ ] **Step 4: Commit**

---

### Task 7: Manual apply + end-to-end post

**Files:** none (user action)

- [ ] **Step 1:** User runs `20260710000004_community_media.sql` in the SQL editor, plus the two verification queries from Task 1 Step 2.
- [ ] **Step 2:** User signs in on the dev server, posts a text post, and confirms it appears at the top of `/community`.
- [ ] **Step 3:** Update the ledger + memory.

---

## Self-Review

**Spec coverage (design Phase 3):** composer for text/image/youtube ✓ (Tasks 5–6) · create server action ✓ (Task 4) · text-slur blocklist ✓ (Task 2) · image upload to bucket ✓ (Tasks 1, 4). Polls correctly deferred to Plan 5.

**Review debt from Plan 2, now resolved:** images are stored as **full public URLs** (Task 4), matching the existing `next.config` `remotePatterns` — the latent `next/image` breakage the Plan 2 reviewer flagged never materializes. YouTube reuses `parseVideoUrl` rather than a new parser, as the reviewer required.

**Placeholder scan:** none — every step carries literal code.

**Type consistency:** `PostInput`/`PostValid` (Task 3) are consumed unchanged by `createPost` (Task 4); `CreatePostState` (Task 4) is the exact generic passed to `useActionState` (Task 5); `viewerCanPost` (Task 4) is imported by both pages (Task 6).

**Security notes:** the gate is enforced in the action *and* by RLS. Uploads happen only after validation, so rejected posts leave no orphaned objects. Upload paths are namespaced per user (`${user.id}/…`). The insert runs as the user (not the admin client), so the `community_posts_insert` policy is the final authority.

**Known ceiling:** `containsBlocked` is a short word-boundary filter, not moderation — image NSFW and determined abuse still route through report + admin (Plan 6). Stated in-code.
