# Support Updates Core + Commenter Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/support/updates` into a DB-backed feed of posts (text / image / video / system thank-you) with shareable per-post pages, an admin authoring UI, and a reusable SMTP-OTP commenter-verification layer that badges supporters by their existing tier.

**Architecture:** Two dedicated Supabase tables (`support_updates`, `support_settings`) plus a transient `comment_verifications` table, all manual-SQL migrations against the owner's own project. Public reads go through the anon client (fail-safe to empty); admin writes and OTP storage go through the service-role client. Pure logic (video parsing, code generation, OTP/cookie crypto, email-hash recipe) lives in `server-only`-free modules so vitest can unit-test them; server actions and queries wrap those. The tier badge reuses the existing `tierFor()` + email-free `support_lifetime` view, matching by `sha256(lower(email))`.

**Tech Stack:** Next.js 16 (App Router, async `cookies()`), React 19, TypeScript, Tailwind v4, Supabase (`@supabase/supabase-js`), nodemailer (existing SMTP infra), vitest (node env), node:crypto.

**Specs:** `docs/superpowers/specs/2026-06-17-support-updates-core-design.md`, `docs/superpowers/specs/2026-06-17-commenter-auth-design.md`

**Conventions to follow:**
- Pure, unit-tested modules must NOT `import "server-only"` (it throws under vitest's node resolution). Keep tested logic in plain modules; wrap them in `server-only` modules.
- DB reads fail-safe: `try { ... } catch (e) { console.warn(...); return <empty> }` (mirror `src/lib/support/queries.ts`).
- Monochrome, lucide icons, 8px spacing, existing `Button`/`Input`/`Label` primitives.
- Tests: `src/**/*.test.ts`, run `npm test`.
- Migrations are written to `supabase/migrations/` and the SQL is handed to the owner to run manually (never applied directly).

---

## Phase A — Updates Core (sub-project 1)

### Task A1: Migration — `support_updates` + `support_settings`

**Files:**
- Create: `supabase/migrations/20260617000003_support_updates.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Support updates: DB-backed posts for /support/updates, each with a shareable
-- 6-digit code page. Types: text, image, video (manual) + thankyou (system,
-- created by the payment webhook in a later sub-project). No drafts — every row
-- is live; public reads all rows, admin writes via is_admin().
-- support_settings holds the up-to-5 reusable thank-you images.
-- Reuses public.touch_updated_at() + public.is_admin() from earlier migrations.
-- Target: your OWN Supabase project. Run manually.

create table if not exists public.support_updates (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  type       text not null check (type in ('text','image','video','thankyou')),
  body       text not null default '',
  media      jsonb not null default '{}'::jsonb,
  author     jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_updates_created_idx
  on public.support_updates (created_at desc);

alter table public.support_updates enable row level security;

drop policy if exists support_updates_public_read on public.support_updates;
create policy support_updates_public_read on public.support_updates
  for select to anon, authenticated using (true);

drop policy if exists support_updates_admin_write on public.support_updates;
create policy support_updates_admin_write on public.support_updates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.support_updates to anon, authenticated;
grant insert, update, delete on public.support_updates to authenticated;

drop trigger if exists support_updates_touch_updated_at on public.support_updates;
create trigger support_updates_touch_updated_at before update on public.support_updates
  for each row execute function public.touch_updated_at();

-- Single-row settings table for the reusable thank-you images.
create table if not exists public.support_settings (
  id              int primary key default 1 check (id = 1),
  thankyou_images jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);
insert into public.support_settings (id) values (1) on conflict (id) do nothing;

alter table public.support_settings enable row level security;

drop policy if exists support_settings_public_read on public.support_settings;
create policy support_settings_public_read on public.support_settings
  for select to anon, authenticated using (true);

drop policy if exists support_settings_admin_write on public.support_settings;
create policy support_settings_admin_write on public.support_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.support_settings to anon, authenticated;
grant insert, update on public.support_settings to authenticated;

drop trigger if exists support_settings_touch_updated_at on public.support_settings;
create trigger support_settings_touch_updated_at before update on public.support_settings
  for each row execute function public.touch_updated_at();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260617000003_support_updates.sql
git commit -m "feat(support): migration for support_updates + support_settings"
```

- [ ] **Step 3: Hand the SQL to the owner**

Tell the owner: run this migration in their own Supabase SQL editor, and create a **public** Storage bucket named `support-media` (Dashboard → Storage → New bucket → Public). Note both as activation steps; do not apply directly.

---

### Task A2: Video URL parser (`video.ts`) — TDD

**Files:**
- Create: `src/lib/support/video.ts`
- Test: `src/lib/support/video.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseVideoUrl } from "./video";

describe("parseVideoUrl", () => {
  it("parses a youtube watch url", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });
  it("parses youtu.be short links and shorts", () => {
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
    expect(parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
  });
  it("parses a vimeo url", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")).toEqual({
      provider: "vimeo",
      videoId: "123456789",
      embedUrl: "https://player.vimeo.com/video/123456789",
    });
  });
  it("returns null for junk", () => {
    expect(parseVideoUrl("https://example.com/not-a-video")).toBeNull();
    expect(parseVideoUrl("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- src/lib/support/video.test.ts`
Expected: FAIL — cannot find module `./video`.

- [ ] **Step 3: Implement**

```ts
/** Parse a YouTube/Vimeo share URL into embed metadata. Pure — no server deps. */

export type VideoEmbed = {
  provider: "youtube" | "vimeo";
  videoId: string;
  embedUrl: string;
};

export function parseVideoUrl(input: string): VideoEmbed | null {
  const url = (input ?? "").trim();
  if (!url) return null;

  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (yt) {
    return { provider: "youtube", videoId: yt[1], embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  }

  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return { provider: "vimeo", videoId: vm[1], embedUrl: `https://player.vimeo.com/video/${vm[1]}` };
  }

  return null;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- src/lib/support/video.test.ts`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/support/video.ts src/lib/support/video.test.ts
git commit -m "feat(support): youtube/vimeo embed url parser"
```

---

### Task A3: Update types + 6-digit code generator (`update-code.ts`) — TDD

**Files:**
- Create: `src/lib/support/update-code.ts`
- Test: `src/lib/support/update-code.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { generateCode } from "./update-code";

describe("generateCode", () => {
  it("always returns a 6-digit string", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- src/lib/support/update-code.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
/** Shared update types + 6-digit code generator. Pure — no server deps. */
import { randomInt } from "node:crypto";

import type { VideoEmbed } from "./video";

export type UpdateType = "text" | "image" | "video" | "thankyou";

export type UpdateMedia =
  | Record<string, never>
  | { url: string } // image / thankyou
  | VideoEmbed; // video

export type UpdateAuthor = { name: string } | { alias: string };

export type SupportUpdate = {
  code: string;
  type: UpdateType;
  body: string;
  media: UpdateMedia;
  author: UpdateAuthor | null;
  createdAt: string;
};

/** Random inclusive 6-digit code (100000–999999). Collisions handled at insert. */
export function generateCode(): string {
  return String(randomInt(100000, 1_000_000));
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- src/lib/support/update-code.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/support/update-code.ts src/lib/support/update-code.test.ts
git commit -m "feat(support): update types + 6-digit code generator"
```

---

### Task A4: Queries + storage upload (`updates.ts`)

**Files:**
- Create: `src/lib/support/updates.ts`

- [ ] **Step 1: Implement the query/storage module**

```ts
import "server-only";

import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import { generateCode, type SupportUpdate, type UpdateType, type UpdateMedia, type UpdateAuthor } from "./update-code";

const BUCKET = "support-media";

type Row = {
  code: string;
  type: UpdateType;
  body: string;
  media: UpdateMedia;
  author: UpdateAuthor | null;
  created_at: string;
};

function toUpdate(r: Row): SupportUpdate {
  return { code: r.code, type: r.type, body: r.body, media: r.media, author: r.author, createdAt: r.created_at };
}

function warn(where: string, e: unknown) {
  console.warn(`[updates] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

/** Public: full feed, newest first. Fail-safe to []. */
export async function getUpdatesFeed(): Promise<SupportUpdate[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_updates")
      .select("code,type,body,media,author,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data as Row[]) ?? []).map(toUpdate);
  } catch (e) {
    warn("getUpdatesFeed", e);
    return [];
  }
}

/** Public: one post by code, or null. */
export async function getUpdateByCode(code: string): Promise<SupportUpdate | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_updates")
      .select("code,type,body,media,author,created_at")
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    return data ? toUpdate(data as Row) : null;
  } catch (e) {
    warn("getUpdateByCode", e);
    return null;
  }
}

/** Admin: insert a post, retrying on the rare 6-digit code collision. */
export async function insertUpdate(input: {
  type: UpdateType;
  body: string;
  media: UpdateMedia;
  author?: UpdateAuthor | null;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  const admin = supabaseAdmin();
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    const { error } = await admin.from("support_updates").insert({
      code,
      type: input.type,
      body: input.body,
      media: input.media,
      author: input.author ?? null,
    });
    if (!error) return { ok: true, code };
    // 23505 = unique_violation → regenerate and retry.
    if (error.code !== "23505") return { ok: false, error: error.message };
  }
  return { ok: false, error: "Could not allocate a unique code." };
}

/** Admin: delete a post by code. */
export async function deleteUpdate(code: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin().from("support_updates").delete().eq("code", code);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Admin: upload an image to the support-media bucket, return its public URL. */
export async function uploadSupportImage(
  file: File,
  prefix: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${prefix}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const admin = supabaseAdmin();
    const { error } = await admin.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Public/admin: the up-to-5 reusable thank-you image URLs. */
export async function getThankyouImages(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_settings")
      .select("thankyou_images")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    const arr = (data as { thankyou_images?: unknown } | null)?.thankyou_images;
    return Array.isArray(arr) ? (arr as string[]).filter((u) => typeof u === "string") : [];
  } catch (e) {
    warn("getThankyouImages", e);
    return [];
  }
}

/** Admin: replace the thank-you image list (max 5). */
export async function setThankyouImages(urls: string[]): Promise<{ ok: boolean; error?: string }> {
  const clean = urls.filter((u) => typeof u === "string" && u).slice(0, 5);
  const { error } = await supabaseAdmin()
    .from("support_settings")
    .update({ thankyou_images: clean })
    .eq("id", 1);
  return error ? { ok: false, error: error.message } : { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/support/updates.ts
git commit -m "feat(support): updates queries + storage upload + settings"
```

---

### Task A5: Server actions (`updates-actions.ts`)

**Files:**
- Create: `src/lib/support/updates-actions.ts`

- [ ] **Step 1: Implement actions**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { parseVideoUrl } from "./video";
import { insertUpdate, deleteUpdate, uploadSupportImage, getThankyouImages, setThankyouImages } from "./updates";

export type ActionState = { ok: boolean; message: string } | undefined;

/** Create a manual post from the admin editor FormData. */
export async function createUpdate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const type = String(formData.get("type") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);

  if (type === "text") {
    if (!body) return { ok: false, message: "Write something." };
    const res = await insertUpdate({ type: "text", body, media: {} });
    return finish(res);
  }

  if (type === "image") {
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image." };
    const up = await uploadSupportImage(file, "updates");
    if (!up.ok || !up.url) return { ok: false, message: `Upload failed: ${up.error}` };
    const res = await insertUpdate({ type: "image", body, media: { url: up.url } });
    return finish(res);
  }

  if (type === "video") {
    const embed = parseVideoUrl(String(formData.get("videoUrl") ?? ""));
    if (!embed) return { ok: false, message: "Paste a valid YouTube or Vimeo URL." };
    const res = await insertUpdate({ type: "video", body, media: embed });
    return finish(res);
  }

  return { ok: false, message: "Unknown post type." };
}

function finish(res: { ok: boolean; error?: string }): ActionState {
  if (!res.ok) return { ok: false, message: res.error ?? "Save failed." };
  revalidatePath("/support/updates");
  revalidatePath("/admin/updates");
  return { ok: true, message: "Posted." };
}

/** Delete a post by code (admin list). */
export async function removeUpdate(code: string): Promise<ActionState> {
  await requireAdmin();
  const res = await deleteUpdate(code);
  if (!res.ok) return { ok: false, message: res.error ?? "Delete failed." };
  revalidatePath("/support/updates");
  revalidatePath("/admin/updates");
  return { ok: true, message: "Deleted." };
}

/** Upload one thank-you image and append it to the settings list (max 5). */
export async function addThankyouImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image." };
  const existing = await getThankyouImages();
  if (existing.length >= 5) return { ok: false, message: "Maximum 5 thank-you images." };
  const up = await uploadSupportImage(file, "thankyou");
  if (!up.ok || !up.url) return { ok: false, message: `Upload failed: ${up.error}` };
  const res = await setThankyouImages([...existing, up.url]);
  if (!res.ok) return { ok: false, message: res.error ?? "Save failed." };
  revalidatePath("/admin/updates");
  return { ok: true, message: "Added." };
}

/** Remove a thank-you image by URL. */
export async function removeThankyouImage(url: string): Promise<ActionState> {
  await requireAdmin();
  const existing = await getThankyouImages();
  const res = await setThankyouImages(existing.filter((u) => u !== url));
  if (!res.ok) return { ok: false, message: res.error ?? "Save failed." };
  revalidatePath("/admin/updates");
  return { ok: true, message: "Removed." };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `requireAdmin` path differs, confirm via `src/lib/auth/session.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/support/updates-actions.ts
git commit -m "feat(support): admin server actions for updates + thank-you images"
```

---

### Task A6: Public card component (`update-card.tsx`)

**Files:**
- Create: `src/components/support/update-card.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link";
import { Check, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, cn } from "@/lib/utils";
import { initialsOf } from "@/lib/support/config";
import { supportProfile } from "@/lib/data/support-content";
import type { SupportUpdate } from "@/lib/support/update-code";

function authorName(u: SupportUpdate): string {
  if (u.type === "thankyou" && u.author) {
    return "name" in u.author ? u.author.name : u.author.alias;
  }
  return supportProfile.name;
}

/** A single update in the feed. Links to its own page. Variants: text/image/video/thankyou. */
export function UpdateCard({ update }: { update: SupportUpdate }) {
  const name = authorName(update);
  const media = update.media as Record<string, string>;

  return (
    <Link
      href={`/support/updates/${update.code}`}
      className="block rounded-card border border-border bg-card p-5 transition-colors hover:border-foreground/30 sm:p-6"
    >
      <header className="flex items-center gap-3">
        <Avatar className="size-9 rounded-full">
          <AvatarFallback className="rounded-full bg-foreground text-xs font-bold text-background">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground">{formatDate(update.createdAt)}</p>
        </div>
      </header>

      {update.body && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{update.body}</p>
      )}

      {(update.type === "image" || update.type === "thankyou") && media.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt=""
          className="mt-4 w-full rounded-img border border-border object-cover"
        />
      )}
      {(update.type === "image" || update.type === "thankyou") && !media.url && (
        <div className="mt-4 flex aspect-[16/9] items-center justify-center rounded-img border border-border bg-muted/50">
          <ImageIcon className="size-8 text-muted-foreground" />
        </div>
      )}

      {update.type === "video" && media.embedUrl && (
        <div className="mt-4 aspect-video overflow-hidden rounded-img border border-border">
          <iframe
            src={media.embedUrl}
            title="Video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {update.type === "thankyou" && (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          <Check className="size-3" strokeWidth={3} /> New supporter
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Confirm `formatDate` and `cn` are exported from `@/lib/utils` — `cn` is used elsewhere; if `formatDate` lives elsewhere, import from its real path.)

- [ ] **Step 3: Commit**

```bash
git add src/components/support/update-card.tsx
git commit -m "feat(support): update-card component for the feed"
```

---

### Task A7: Rewrite the public feed page

**Files:**
- Modify: `src/app/support/updates/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { buildMetadata } from "@/lib/seo";
import { UpdateCard } from "@/components/support/update-card";
import { getUpdatesFeed } from "@/lib/support/updates";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Updates",
  description: "What I'm building, writing, and shipping — straight from the desk.",
  path: "/support/updates",
});

export default async function UpdatesPage() {
  const updates = await getUpdatesFeed();

  if (!updates.length) {
    return (
      <div className="rounded-card border border-border bg-card p-10 text-center">
        <h2 className="font-display text-lg font-bold tracking-tight">No updates yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Check back soon — or support to follow along as things ship.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What I&apos;m building, writing, and shipping — newest first.
        </p>
      </div>
      <div className="mt-5 grid gap-4">
        {updates.map((u) => (
          <UpdateCard key={u.code} update={u} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/support/updates/page.tsx
git commit -m "feat(support): DB-backed updates feed"
```

---

### Task A8: Per-post page `[code]`

**Files:**
- Create: `src/app/support/updates/[code]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { UpdateCard } from "@/components/support/update-card";
import { getUpdateByCode } from "@/lib/support/updates";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const update = await getUpdateByCode(code);
  if (!update) return buildMetadata({ title: "Update", path: `/support/updates/${code}` });
  const text = update.body.slice(0, 140) || "An update from Shubham Datarkar.";
  return buildMetadata({ title: "Update", description: text, path: `/support/updates/${code}` });
}

export default async function UpdatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const update = await getUpdateByCode(code);
  if (!update) notFound();

  return (
    <div className="grid gap-6">
      <UpdateCard update={update} />

      <div className="flex items-center justify-between rounded-card border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Like what I&apos;m building?</p>
        <Button asChild size="sm">
          <Link href="/support">Support</Link>
        </Button>
      </div>

      {/* Comments slot — sub-project 4. Reactions slot — sub-project 5. */}
      <div id="comments" />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. Confirm `buildMetadata` accepts an optional `description`; it does (used across pages).

- [ ] **Step 3: Commit**

```bash
git add "src/app/support/updates/[code]/page.tsx"
git commit -m "feat(support): per-post update page with support CTA"
```

---

### Task A9: Admin authoring UI

**Files:**
- Create: `src/components/admin/update-editor.tsx`
- Create: `src/components/admin/thankyou-images.tsx`
- Create: `src/app/admin/updates/page.tsx`
- Create: `src/app/admin/updates/new/page.tsx`
- Modify: `src/app/admin/layout.tsx:13` (add the nav entry)

- [ ] **Step 1: Editor component**

```tsx
"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createUpdate, type ActionState } from "@/lib/support/updates-actions";

const TYPES = [
  { key: "text", label: "Text" },
  { key: "image", label: "Image + caption" },
  { key: "video", label: "Video + caption" },
] as const;

export function UpdateEditor() {
  const [state, action] = useFormState<ActionState, FormData>(createUpdate, undefined);
  const [type, setType] = React.useState<(typeof TYPES)[number]["key"]>("text");

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="rounded-input border border-border bg-background px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="body">{type === "text" ? "Text" : "Caption"}</Label>
        <textarea
          id="body"
          name="body"
          rows={5}
          className="rounded-input border border-border bg-background p-3 text-sm"
        />
      </div>

      {type === "image" && (
        <div className="grid gap-1.5">
          <Label htmlFor="image">Image</Label>
          <input id="image" name="image" type="file" accept="image/*" className="text-sm" />
        </div>
      )}

      {type === "video" && (
        <div className="grid gap-1.5">
          <Label htmlFor="videoUrl">YouTube / Vimeo URL</Label>
          <Input id="videoUrl" name="videoUrl" placeholder="https://youtu.be/..." />
        </div>
      )}

      {state && (
        <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          {state.message}
        </p>
      )}

      <div>
        <Button type="submit">Post</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Thank-you images panel**

```tsx
"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addThankyouImage, removeThankyouImage, type ActionState } from "@/lib/support/updates-actions";

export function ThankyouImages({ images }: { images: string[] }) {
  const [state, action] = useFormState<ActionState, FormData>(addThankyouImage, undefined);

  return (
    <section className="rounded-card border border-border p-5">
      <h2 className="font-semibold">Thank-you images</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Up to 5. One is attached to each auto thank-you post. ({images.length}/5)
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {images.map((url) => (
          <div key={url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="aspect-square w-full rounded-img border border-border object-cover" />
            <form action={removeThankyouImage.bind(null, url)}>
              <button
                type="submit"
                className="absolute right-1 top-1 rounded-btn bg-foreground px-1.5 py-0.5 text-xs text-background"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>

      {images.length < 5 && (
        <form action={action} className="mt-4 flex items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ty-image">Add image</Label>
            <input id="ty-image" name="image" type="file" accept="image/*" className="text-sm" />
          </div>
          <Button type="submit" size="sm">Upload</Button>
        </form>
      )}

      {state && !state.ok && <p className="mt-2 text-sm text-destructive">{state.message}</p>}
    </section>
  );
}
```

- [ ] **Step 3: Admin list page**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUpdatesFeed, getThankyouImages } from "@/lib/support/updates";
import { removeUpdate } from "@/lib/support/updates-actions";
import { ThankyouImages } from "@/components/admin/thankyou-images";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  text: "Text", image: "Image", video: "Video", thankyou: "Thank-you",
};

export default async function AdminUpdatesPage() {
  const [updates, thankyouImages] = await Promise.all([getUpdatesFeed(), getThankyouImages()]);

  return (
    <div className="grid gap-8">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
          <Button asChild size="sm"><Link href="/admin/updates/new">New</Link></Button>
        </div>
        <div className="grid gap-2">
          {updates.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          {updates.map((u) => (
            <div key={u.code} className="flex items-center justify-between rounded-card border border-border p-3">
              <Link href={`/support/updates/${u.code}`} className="min-w-0 flex-1 hover:underline">
                <span className="font-medium">{TYPE_LABEL[u.type]}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {u.body.slice(0, 60) || "—"}
                </span>
              </Link>
              <span className="ml-3 text-xs text-muted-foreground">#{u.code}</span>
              <form action={removeUpdate.bind(null, u.code)} className="ml-3">
                <button type="submit" className="text-xs text-destructive hover:underline">Delete</button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <ThankyouImages images={thankyouImages} />
    </div>
  );
}
```

- [ ] **Step 4: Admin new page**

```tsx
import { UpdateEditor } from "@/components/admin/update-editor";

export default function NewUpdatePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New update</h1>
      <UpdateEditor />
    </div>
  );
}
```

- [ ] **Step 5: Add the nav entry**

In `src/app/admin/layout.tsx`, add to the `NAV` array after the Posts entry:

```tsx
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/updates", label: "Updates" },
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. If `useFormState` import warns under React 19, switch to `useActionState` from `react` (same signature) — check how existing admin forms (e.g. `integrations`) import it and match that.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/update-editor.tsx src/components/admin/thankyou-images.tsx src/app/admin/updates src/app/admin/layout.tsx
git commit -m "feat(admin): updates authoring UI + thank-you image manager + nav"
```

---

### Task A10: Retire the static mock + verify Phase A

**Files:**
- Modify: `src/lib/data/support-content.ts` (remove `supportUpdates` + the `UpdatePost` type's checklist variant; keep `supportProfile`)
- Delete: `src/components/support/update-post.tsx`

- [ ] **Step 1: Find remaining references**

Run: `git grep -n "supportUpdates\|update-post\|UpdatePost"`
Expected: only the feed page (already rewritten), the old component, and the data file.

- [ ] **Step 2: Remove the static export + old component**

Delete the `supportUpdates` array and the `UpdatePost` type export from `src/lib/data/support-content.ts`. Delete `src/components/support/update-post.tsx`. Leave `supportProfile` and everything else intact.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: green, no references to the removed symbols.

- [ ] **Step 4: Browser verify (DOM, no screenshot per project pref)**

Start the dev server (preview_start). Because the migration/bucket aren't applied in this environment, the feed must fail-safe to the empty state. Verify with preview_snapshot:
- `/support/updates` → renders "No updates yet" empty state, no crash.
- `/support/updates/000000` → 404 (notFound) renders.
- `/admin/updates` (if an admin session is available) → renders list empty + thank-you panel; otherwise confirm it builds.
Capture `preview_console_logs` — expect only the fail-safe `[updates] ... returning empty` warnings, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/support-content.ts
git rm src/components/support/update-post.tsx
git commit -m "refactor(support): retire static updates mock + checklist variant"
```

---

## Phase B — Commenter Auth (sub-project 3)

### Task B1: Migration — `comment_verifications`

**Files:**
- Create: `supabase/migrations/20260617000004_comment_verifications.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Transient OTP store for commenter email verification. Service-role only:
-- no anon/authenticated policy, so the OTP hash is never readable by clients.
-- One active OTP per email (pk on email). Target: your OWN Supabase project.
-- Run manually.

create table if not exists public.comment_verifications (
  email        text primary key,
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     int not null default 0,
  last_sent_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.comment_verifications enable row level security;
-- No policy on purpose: only the service-role client (RLS bypass) touches this.

revoke all on public.comment_verifications from anon, authenticated;
```

- [ ] **Step 2: Commit + hand to owner**

```bash
git add supabase/migrations/20260617000004_comment_verifications.sql
git commit -m "feat(support): migration for comment_verifications (OTP store)"
```

Tell the owner to run it manually and set two env vars at deploy: `COMMENTER_TOKEN_SECRET` and `COMMENTER_OTP_PEPPER` (each a long random string).

---

### Task B2: Pure crypto module (`comment-auth-crypto.ts`) — TDD

**Files:**
- Create: `src/lib/support/comment-auth-crypto.ts`
- Test: `src/lib/support/comment-auth-crypto.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createHash } from "node:crypto";
import { signIdentity, verifyToken, hashOtp, emailKey } from "./comment-auth-crypto";

beforeAll(() => {
  process.env.COMMENTER_TOKEN_SECRET = "test-secret";
  process.env.COMMENTER_OTP_PEPPER = "test-pepper";
});

describe("identity token", () => {
  it("round-trips a signed identity", () => {
    const token = signIdentity({ email: "a@b.com", name: "Aanya", iat: 1000 });
    expect(verifyToken(token)).toEqual({ email: "a@b.com", name: "Aanya", iat: 1000 });
  });
  it("rejects a tampered token", () => {
    const token = signIdentity({ email: "a@b.com", name: "Aanya", iat: 1000 });
    const tampered = token.replace(/^./, (c) => (c === "x" ? "y" : "x"));
    expect(verifyToken(tampered)).toBeNull();
  });
  it("rejects undefined / malformed", () => {
    expect(verifyToken(undefined)).toBeNull();
    expect(verifyToken("garbage")).toBeNull();
  });
});

describe("otp hashing", () => {
  it("hashes with the pepper deterministically", () => {
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
    expect(hashOtp("123456")).not.toBe(hashOtp("654321"));
  });
});

describe("emailKey", () => {
  it("matches the support_lifetime recipe sha256(lower(trim(email)))", () => {
    const expected = createHash("sha256").update("foo@bar.com").digest("hex");
    expect(emailKey("  Foo@Bar.com ")).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- src/lib/support/comment-auth-crypto.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
/** Pure crypto for commenter verification. No server-only/next deps so vitest can run it. */
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export type CommenterIdentity = { email: string; name: string; iat: number };

function tokenSecret(): string {
  const s = process.env.COMMENTER_TOKEN_SECRET;
  if (!s) throw new Error("Missing COMMENTER_TOKEN_SECRET");
  return s;
}

function pepper(): string {
  return process.env.COMMENTER_OTP_PEPPER || tokenSecret();
}

function sign(payload: string): string {
  return createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

/** Sign an identity into a `payload.sig` token. */
export function signIdentity(id: CommenterIdentity): string {
  const payload = Buffer.from(JSON.stringify(id)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Verify + decode a token, or null if missing/tampered/malformed. */
export function verifyToken(token: string | undefined): CommenterIdentity | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as CommenterIdentity;
  } catch {
    return null;
  }
}

/** Hash an OTP with the server pepper for at-rest storage. */
export function hashOtp(code: string): string {
  return createHash("sha256").update(`${code}:${pepper()}`).digest("hex");
}

/** Email → supporter_key, matching support_lifetime: sha256(lower(trim(email))). */
export function emailKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- src/lib/support/comment-auth-crypto.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/support/comment-auth-crypto.ts src/lib/support/comment-auth-crypto.test.ts
git commit -m "feat(support): commenter token + otp + email-key crypto (tested)"
```

---

### Task B3: Tier resolver (`comment-tier.ts`)

**Files:**
- Create: `src/lib/support/comment-tier.ts`

- [ ] **Step 1: Implement**

```ts
import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { tierFor, type Tier } from "@/lib/support/tiers";
import { emailKey } from "./comment-auth-crypto";

/**
 * Resolve a verified commenter email to a supporter tier via the email-free
 * support_lifetime view. The raw email never leaves the server; only the hash
 * is queried. Fail-safe to null (no badge).
 */
export async function resolveTier(email: string): Promise<Tier | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_lifetime")
      .select("lifetime_amount")
      .eq("supporter_key", emailKey(email))
      .maybeSingle();
    if (error) throw error;
    const lifetime = Number((data as { lifetime_amount?: number } | null)?.lifetime_amount ?? 0);
    return lifetime > 0 ? tierFor(lifetime) : null;
  } catch (e) {
    console.warn("[comment-tier] resolveTier failed:", (e as Error).message);
    return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/support/comment-tier.ts
git commit -m "feat(support): resolve commenter tier from email hash"
```

---

### Task B4: OTP server actions + session (`comment-auth.ts`)

**Files:**
- Create: `src/lib/support/comment-auth.ts`

- [ ] **Step 1: Implement**

```ts
"use server";

import { cookies } from "next/headers";
import { randomInt } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmail } from "@/lib/email/template";
import { signIdentity, verifyToken, hashOtp, type CommenterIdentity } from "./comment-auth-crypto";

const COOKIE = "sd_commenter";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between sends
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type OtpState = { ok: boolean; message: string };

function normalize(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

/** Issue a 6-digit OTP and email it. Rate-limited; never leaks the code. */
export async function requestOtp(emailRaw: string): Promise<OtpState> {
  const email = normalize(emailRaw);
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email." };

  const creds = await getEmailCredentials();
  if (!creds) return { ok: false, message: "Verification is temporarily unavailable." };

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("comment_verifications")
    .select("last_sent_at")
    .eq("email", email)
    .maybeSingle();
  if (existing?.last_sent_at) {
    const since = Date.now() - new Date(existing.last_sent_at as string).getTime();
    if (since < RESEND_COOLDOWN_MS) {
      return { ok: false, message: "Hold on a moment before requesting another code." };
    }
  }

  const code = String(randomInt(100000, 1_000_000));
  const now = new Date();
  const { error } = await admin.from("comment_verifications").upsert({
    email,
    code_hash: hashOtp(code),
    expires_at: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
    attempts: 0,
    last_sent_at: now.toISOString(),
  });
  if (error) {
    console.warn("[comment-auth] upsert failed:", error.message);
    return { ok: false, message: "Could not start verification. Try again." };
  }

  const send = await sendEmail(creds, {
    to: email,
    subject: `Your comment verification code: ${code}`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: renderEmail({
      preheader: "Your comment verification code",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Verify your email",
      bodyHtml: `<p style="margin:0 0 12px;font-size:14px;color:#2d2d2d;line-height:1.7">Enter this code to post your comment:</p><p style="margin:0 0 18px;font-size:28px;font-weight:700;letter-spacing:4px;color:#2d2d2d">${code}</p><p style="margin:0;font-size:13px;color:#5f6368">It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    }),
  });
  if (!send.ok) {
    console.warn("[comment-auth] otp email failed:", send.error);
    return { ok: false, message: "Could not send the code. Check the email and try again." };
  }

  return { ok: true, message: "Code sent. Check your inbox." };
}

/** Verify the OTP; on success set the signed session cookie. */
export async function verifyOtp(emailRaw: string, nameRaw: string, code: string): Promise<OtpState> {
  const email = normalize(emailRaw);
  const name = String(nameRaw ?? "").trim().slice(0, 80) || "Anonymous";
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email." };

  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("comment_verifications")
    .select("code_hash,expires_at,attempts")
    .eq("email", email)
    .maybeSingle();

  if (!row) return { ok: false, message: "Request a code first." };
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return { ok: false, message: "Code expired. Request a new one." };
  }
  if ((row.attempts as number) >= MAX_ATTEMPTS) {
    return { ok: false, message: "Too many attempts. Request a new code." };
  }

  if (hashOtp(String(code).trim()) !== row.code_hash) {
    await admin
      .from("comment_verifications")
      .update({ attempts: (row.attempts as number) + 1 })
      .eq("email", email);
    return { ok: false, message: "Incorrect code." };
  }

  await admin.from("comment_verifications").delete().eq("email", email);

  const identity: CommenterIdentity = { email, name, iat: Date.now() };
  const jar = await cookies();
  jar.set(COOKIE, signIdentity(identity), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return { ok: true, message: `Verified as ${name}.` };
}

/** Read the current verified commenter from the cookie, or null. */
export async function getVerifiedCommenter(): Promise<CommenterIdentity | null> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

/** Clear the commenter session. */
export async function signOutCommenter(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. Confirm `renderEmail`'s param shape against `src/lib/email/template.ts` (`preheader`, `headerTagline`, `title`, `bodyHtml`, optional `cta`, `footerNote`) and adjust if the real signature differs.

- [ ] **Step 3: Commit**

```bash
git add src/lib/support/comment-auth.ts
git commit -m "feat(support): commenter OTP request/verify + signed session"
```

---

### Task B5: `EmailVerifyGate` UI primitive

**Files:**
- Create: `src/components/support/email-verify-gate.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestOtp, verifyOtp } from "@/lib/support/comment-auth";

type Verified = { name: string };

/**
 * Email-ownership gate for commenting. Steps: enter name+email → send code →
 * enter OTP → verify. Calls onVerified(name) once the cookie is set. If the
 * server already has a verified session, the parent should skip rendering this.
 */
export function EmailVerifyGate({ onVerified }: { onVerified: (v: Verified) => void }) {
  const [stage, setStage] = React.useState<"request" | "code">("request");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function send() {
    setPending(true);
    setMsg(null);
    const res = await requestOtp(email);
    setPending(false);
    setMsg(res.message);
    if (res.ok) setStage("code");
  }

  async function verify() {
    setPending(true);
    setMsg(null);
    const res = await verifyOtp(email, name, code);
    setPending(false);
    setMsg(res.message);
    if (res.ok) onVerified({ name: name.trim() || "Anonymous" });
  }

  return (
    <div className="rounded-card border border-border bg-card p-5">
      <p className="text-sm font-semibold">Verify your email to comment</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="vg-name">Name</Label>
          <Input id="vg-name" value={name} onChange={(e) => setName(e.target.value)} disabled={stage === "code"} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="vg-email">Email</Label>
          <Input id="vg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={stage === "code"} />
        </div>
      </div>

      {stage === "code" && (
        <div className="mt-3 grid gap-1.5">
          <Label htmlFor="vg-code">6-digit code</Label>
          <Input id="vg-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}

      <div className="mt-4 flex gap-2">
        {stage === "request" ? (
          <Button type="button" size="sm" disabled={pending} onClick={send}>Send code</Button>
        ) : (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={verify}>Verify</Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={send}>Resend</Button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. Confirm `Button` supports a `variant="outline"` (it does via cva); if the variant name differs, match the existing one.

- [ ] **Step 3: Commit**

```bash
git add src/components/support/email-verify-gate.tsx
git commit -m "feat(support): EmailVerifyGate OTP UI primitive"
```

---

### Task B6: Phase B verification + env docs

**Files:**
- Modify: `.env.example` (if present; else note in the spec) — add the two new vars

- [ ] **Step 1: Document env vars**

If `.env.example` (or `.env.local.example`) exists, append:

```bash
# Commenter verification (sub-project 3)
COMMENTER_TOKEN_SECRET=
COMMENTER_OTP_PEPPER=
```

If no example env file exists, skip the file edit — the vars are already listed in the commenter-auth spec's "Env (activation)" section.

- [ ] **Step 2: Full test + build**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all tests pass (video, update-code, comment-auth-crypto), tsc/eslint clean, build green (the new modules are imported by no public page yet except via Phase A, so they tree-shake cleanly).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(support): document commenter-auth env vars"
```

---

## Final verification

- [ ] `npm test` — video + update-code + comment-auth-crypto suites green.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — green (route count increases by `/support/updates/[code]`, `/admin/updates`, `/admin/updates/new`).
- [ ] Browser (DOM, no screenshot): `/support/updates` empty state, `[code]` 404 path, admin pages build. Console shows only fail-safe warnings.
- [ ] Push branch, open PR (per project PR-flow rule). PR body lists the two manual migrations + `support-media` bucket + two env vars as activation steps.

## Activation checklist (hand to owner)

1. Run `supabase/migrations/20260617000003_support_updates.sql` and `20260617000004_comment_verifications.sql` in the project's own Supabase SQL editor.
2. Create a **public** Storage bucket named `support-media`.
3. Set env vars `COMMENTER_TOKEN_SECRET` and `COMMENTER_OTP_PEPPER` (long random strings) at deploy.
4. SMTP must already be configured at `/admin/integrations` (reused for OTP email).

## Out of scope (later sub-projects)

- #2 Auto thank-you post on `payment.succeeded` (webhook insert of a `thankyou` row using a random thank-you image + supporter name/alias).
- #4 Threaded comments + reply notifications (consumes `EmailVerifyGate`, `getVerifiedCommenter`, `resolveTier`).
- #5 LinkedIn-style post reactions.
