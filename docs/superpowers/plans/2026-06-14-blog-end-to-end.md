# Blog End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move blog content from static TS into Supabase, render the public blog from the DB, and give the admin a block editor to create/edit/publish/schedule posts.

**Architecture:** A `posts` table holds the existing `Post` shape (incl. `body jsonb` = `ContentBlock[]`, unchanged). RLS exposes only publicly-visible posts (`published_at <= now()`) to anon, and full access to the admin (`is_admin()` from the auth-foundation slice). A `src/lib/blog/queries.ts` module returns the same `Post` objects the components already consume, so `PostCard`/`ArticleBody` need no changes. Public blog pages become dynamic server components reading the DB. The admin gets a posts list + a block editor (core block types with fields, JSON fallback for the rest, live preview). Existing static content is seeded via a generator that emits SQL the user runs manually.

**Tech Stack:** Next.js 16 (App Router, dynamic server components, Server Actions), React 19, Supabase (Postgres + RLS), `@supabase/ssr` (admin session), existing `supabaseAnon()` for public reads.

---

## Prerequisites

- Auth-foundation slice complete (`is_admin()` exists, `supabaseAuthServer`, `requireAdmin`).
- The user applies all SQL in this plan manually (per the project's Supabase workflow); the agent never writes to the DB directly.

## Version / pattern notes

- Public reads use the existing `supabaseAnon()` (anon key, `src/lib/supabase/server.ts`) — RLS limits anon to visible posts.
- Admin reads/writes use `supabaseAuthServer()` (cookie session) so RLS sees `is_admin()` — no service-role key needed for posts.
- Blog pages set `export const dynamic = "force-dynamic"` so scheduled posts appear at their time and drafts never render. `generateStaticParams` is removed from the dynamic blog routes.
- Query layer is fail-safe like `src/lib/support/queries.ts`: on error, log once and return empty/null so pages render their empty state.

## Data shape mapping (DB → existing `Post` type)

`Post` = `{ slug, title, excerpt, category, tags, date, words, featured?, body }` (`src/lib/data/types.ts`). The query layer maps:
- `date` ← `published_at` (ISO string)
- everything else maps 1:1 (`tags` is `text[]`, `body` is `jsonb`).

Categories stay static config (`blogCategories` in `posts.ts`: slug/label/description) — not stored in the DB. `author` stays the static constant (single-author site).

## File structure

- `supabase/migrations/20260614000003_create_posts.sql` — table + RLS (manual).
- `scripts/generate-posts-seed.mjs` — reads `src/lib/data/posts.ts`, emits `supabase/seed/posts_seed.sql`. Never touches the DB.
- `supabase/seed/posts_seed.sql` — generated INSERTs (manual to run).
- `src/lib/blog/queries.ts` — public + admin post reads, returns `Post`-shaped objects.
- `src/lib/blog/actions.ts` — `createPost`/`updatePost`/`deletePost` Server Actions (admin).
- `src/lib/blog/words.ts` — `countWords(body)` helper (pure, unit-tested).
- `src/app/blog/page.tsx` — repoint to queries (modify).
- `src/app/blog/[category]/page.tsx` — repoint (modify).
- `src/app/blog/[category]/[slug]/page.tsx` — repoint (modify).
- `src/app/admin/posts/page.tsx` — posts list.
- `src/app/admin/posts/new/page.tsx` — create.
- `src/app/admin/posts/[id]/page.tsx` — edit.
- `src/components/admin/post-editor.tsx` — the editor (client).
- `src/components/admin/block-editor.tsx` — body block list editor (client).
- `src/app/admin/layout.tsx` — add Posts nav link (modify).
- `src/app/admin/page.tsx` — add post counts (modify).
- `vitest.config.ts`, `package.json` — add Vitest for the one pure-logic unit (modify/create).

---

### Task 1: Create `posts` table + RLS (manual SQL)

**Files:**
- Create: `supabase/migrations/20260614000003_create_posts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Blog posts. body = ContentBlock[] (jsonb), unchanged from the static shape.
-- Public visibility is time-based: published_at <= now(). Drafts have null
-- published_at; scheduled posts have a future published_at and appear automatically.
-- Target: your OWN Supabase project. Run manually in the SQL editor.

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  excerpt      text not null default '',
  category     text not null,
  tags         text[] not null default '{}',
  words        integer not null default 0 check (words >= 0),
  featured     boolean not null default false,
  body         jsonb not null default '[]'::jsonb,
  status       text not null default 'draft'
                 check (status in ('draft', 'published', 'scheduled')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.posts is
  'Blog posts. Public reads via RLS (published_at <= now()); admin full access via is_admin().';

create index if not exists posts_visible_idx
  on public.posts (published_at desc)
  where published_at is not null;
create index if not exists posts_category_idx on public.posts (category);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.posts enable row level security;

-- Public: only visible posts (published or past-scheduled).
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select
  to anon, authenticated
  using (published_at is not null and published_at <= now());

-- Admin: full read.
drop policy if exists posts_admin_read on public.posts;
create policy posts_admin_read on public.posts
  for select
  to authenticated
  using (public.is_admin());

-- Admin: write (insert/update/delete).
drop policy if exists posts_admin_write on public.posts;
create policy posts_admin_write on public.posts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
```

- [ ] **Step 2: Hand SQL to the user**

Output the SQL above; ask the user to run it in their own Supabase SQL editor and confirm "Success".

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260614000003_create_posts.sql
git commit -m "feat(blog): add posts table + RLS migration"
```

---

### Task 2: Words helper (pure logic + Vitest)

**Files:**
- Create: `src/lib/blog/words.ts`
- Create: `src/lib/blog/words.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script + devDeps)

This is the one piece of pure logic worth a unit test; it also sets up Vitest for later slices.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Expected: exits 0; `vitest` in devDependencies.

- [ ] **Step 2: Add the test script**

In `package.json` `"scripts"`, add: `"test": "vitest run"`.

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { countWords } from "./words";
import type { ContentBlock } from "@/lib/data/types";

describe("countWords", () => {
  it("counts words across text blocks, ignoring structure", () => {
    const body: ContentBlock[] = [
      { type: "h2", text: "Two words" },
      { type: "p", text: "three more words here" }, // 4
    ];
    expect(countWords(body)).toBe(6);
  });

  it("handles RichText arrays (inline spans)", () => {
    const body: ContentBlock[] = [
      { type: "p", text: ["plain ", { t: "b", text: "bold one" }, " tail"] },
    ];
    // "plain" + "bold one" (2) + "tail" = 4
    expect(countWords(body)).toBe(4);
  });

  it("returns 0 for an empty body", () => {
    expect(countWords([])).toBe(0);
  });
});
```

Note: `@/` resolves in Vitest because `vitest/config` reads `tsconfig` paths via Vite's default resolver only if configured. If `@/` fails to resolve, add to `vitest.config.ts`:
```ts
import { resolve } from "node:path";
// inside defineConfig:
resolve: { alias: { "@": resolve(__dirname, "src") } },
```

- [ ] **Step 5: Run it, verify failure**

Run: `npm test`
Expected: FAIL — `countWords` not exported.

- [ ] **Step 6: Implement `words.ts`**

```ts
import type { ContentBlock, RichText, InlineNode } from "@/lib/data/types";

function richTextToString(rt: RichText): string {
  if (typeof rt === "string") return rt;
  return rt
    .map((node: InlineNode) => (typeof node === "string" ? node : "text" in node ? node.text : ""))
    .join(" ");
}

/** Approximate word count across all text-bearing blocks. Best-effort, not exact. */
export function countWords(body: ContentBlock[]): number {
  let text = "";
  for (const block of body) {
    if ("text" in block && block.text != null) {
      text += " " + richTextToString(block.text as RichText);
    }
    if ("items" in block && Array.isArray(block.items)) {
      for (const item of block.items) {
        if (typeof item === "string") text += " " + item;
        else if (Array.isArray(item)) text += " " + richTextToString(item as RichText);
        else if (item && typeof item === "object" && "text" in item) {
          text += " " + richTextToString((item as { text: RichText }).text);
        }
      }
    }
  }
  return text.split(/\s+/).filter(Boolean).length;
}
```

- [ ] **Step 7: Run tests, verify pass**

Run: `npm test`
Expected: 3 passing.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/blog/words.ts src/lib/blog/words.test.ts
git commit -m "feat(blog): add countWords helper + vitest"
```

---

### Task 3: Seed generator + seed SQL

**Files:**
- Create: `scripts/generate-posts-seed.mjs`
- Create (generated): `supabase/seed/posts_seed.sql`

`src/lib/data/posts.ts` only `import type`s from types (erased at runtime), so it can be imported by `tsx` with no alias resolution.

- [ ] **Step 1: Write the generator**

```js
// Reads the static posts and emits INSERT SQL. Does NOT touch the database.
// Run: npx tsx scripts/generate-posts-seed.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { posts } from "../src/lib/data/posts.ts";

const sqlEscape = (s) => String(s).replace(/'/g, "''");
const jsonLiteral = (obj) => `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
const arrayLiteral = (arr) =>
  `ARRAY[${arr.map((t) => `'${sqlEscape(t)}'`).join(", ")}]::text[]`;

const rows = posts.map((p) => {
  const publishedAt = `'${new Date(p.date).toISOString()}'`;
  return `(
  '${sqlEscape(p.slug)}',
  '${sqlEscape(p.title)}',
  '${sqlEscape(p.excerpt)}',
  '${sqlEscape(p.category)}',
  ${arrayLiteral(p.tags)},
  ${Number(p.words) || 0},
  ${p.featured ? "true" : "false"},
  ${jsonLiteral(p.body)},
  'published',
  ${publishedAt}
)`;
});

const sql = `-- GENERATED by scripts/generate-posts-seed.mjs — do not edit by hand.
-- Seeds the posts table from the original static content. Run manually.
insert into public.posts
  (slug, title, excerpt, category, tags, words, featured, body, status, published_at)
values
${rows.join(",\n")}
on conflict (slug) do nothing;
`;

mkdirSync("supabase/seed", { recursive: true });
writeFileSync("supabase/seed/posts_seed.sql", sql);
console.log(`Wrote supabase/seed/posts_seed.sql (${posts.length} posts).`);
```

- [ ] **Step 2: Generate the SQL**

Run: `npx tsx scripts/generate-posts-seed.mjs`
Expected: prints `Wrote supabase/seed/posts_seed.sql (N posts).`; file exists.

- [ ] **Step 3: Sanity-check the output**

Run: `node -e "const s=require('fs').readFileSync('supabase/seed/posts_seed.sql','utf8'); console.log(s.slice(0,400)); console.log('...'); console.log('has insert:', s.includes('insert into public.posts'))"`
Expected: shows a valid `insert into public.posts ... values (...)` and `has insert: true`.

- [ ] **Step 4: Hand SQL to the user**

Tell the user: run `supabase/seed/posts_seed.sql` in their Supabase SQL editor (after Task 1's table exists). Confirm row count matches the number of static posts.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-posts-seed.mjs supabase/seed/posts_seed.sql
git commit -m "feat(blog): add posts seed generator + generated seed SQL"
```

---

### Task 4: Blog queries module

**Files:**
- Create: `src/lib/blog/queries.ts`

- [ ] **Step 1: Write the queries**

```ts
import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { Post, BlogCategory } from "@/lib/data/types";

/** Admin list row — includes draft/scheduled metadata the public type omits. */
export type AdminPostRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: "draft" | "published" | "scheduled";
  publishedAt: string | null;
  updatedAt: string;
};

type DbRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[] | null;
  words: number | null;
  featured: boolean | null;
  body: unknown;
  status: string;
  published_at: string | null;
  updated_at: string;
};

const POST_COLS = "slug,title,excerpt,category,tags,words,featured,body,published_at";

function toPost(r: DbRow): Post {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    category: r.category as BlogCategory,
    tags: r.tags ?? [],
    date: r.published_at ?? "",
    words: Number(r.words ?? 0),
    featured: r.featured ?? false,
    body: (Array.isArray(r.body) ? r.body : []) as Post["body"],
  };
}

function warn(where: string, e: unknown) {
  console.warn(`[blog] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

/** All publicly-visible posts, newest first. */
export async function getPublishedPosts(): Promise<Post[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("posts")
      .select(POST_COLS)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return (data as DbRow[] ?? []).map(toPost);
  } catch (e) {
    warn("getPublishedPosts", e);
    return [];
  }
}

/** One visible post by slug, or null. */
export async function getPublishedPost(slug: string): Promise<Post | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("posts")
      .select(POST_COLS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toPost(data as DbRow) : null;
  } catch (e) {
    warn("getPublishedPost", e);
    return null;
  }
}

export async function getPublishedPostsByCategory(category: BlogCategory): Promise<Post[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("posts")
      .select(POST_COLS)
      .eq("category", category)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return (data as DbRow[] ?? []).map(toPost);
  } catch (e) {
    warn("getPublishedPostsByCategory", e);
    return [];
  }
}

/** Admin: ALL posts (incl. drafts/scheduled). Requires admin session. */
export async function getAllPostsAdmin(): Promise<AdminPostRow[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("posts")
      .select("id,slug,title,category,status,published_at,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as DbRow[] ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: r.category,
      status: r.status as AdminPostRow["status"],
      publishedAt: r.published_at,
      updatedAt: r.updated_at,
    }));
  } catch (e) {
    warn("getAllPostsAdmin", e);
    return [];
  }
}

/** Admin: full editable post by id, or null. */
export async function getPostByIdAdmin(id: string): Promise<(Post & { id: string; status: string; publishedAt: string | null }) | null> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("posts")
      .select("id," + POST_COLS + ",status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const r = data as DbRow;
    return { ...toPost(r), id: r.id, status: r.status, publishedAt: r.published_at };
  } catch (e) {
    warn("getPostByIdAdmin", e);
    return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `queries.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/blog/queries.ts
git commit -m "feat(blog): add blog query layer (public + admin reads)"
```

---

### Task 5: Repoint public blog list page

**Files:**
- Modify: `src/app/blog/page.tsx`

- [ ] **Step 1: Swap the data source**

Replace the static import and derive lead/rest from DB. Change the top of the file:

```tsx
// remove: import { posts, featuredPosts, blogCategories } from "@/lib/data/posts";
import { blogCategories } from "@/lib/data/posts";
import { getPublishedPosts } from "@/lib/blog/queries";
```

Add dynamic rendering and make the component async. Replace `export default function BlogPage()` with:

```tsx
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  const lead = posts.find((p) => p.featured) ?? posts[0];
  const rest = lead ? posts.filter((p) => p.slug !== lead.slug) : posts;
  const category = lead ? blogCategories.find((c) => c.slug === lead.category) : undefined;

  if (!lead) {
    return (
      <Section>
        <Container>
          <p className="text-muted-foreground">No posts yet.</p>
        </Container>
      </Section>
    );
  }
  // ...existing JSX unchanged, using lead/rest/category...
}
```

Keep the rest of the JSX exactly as-is (it already references `lead`, `rest`, `category`).

- [ ] **Step 2: Verify**

Dev server running, table seeded. `preview_eval` navigate `/blog`, `preview_snapshot`.
Expected: the featured lead + post grid render exactly as before (same content, now from DB). `preview_console_logs` level error: none.

- [ ] **Step 3: Commit**

```bash
git add src/app/blog/page.tsx
git commit -m "feat(blog): read blog index from DB"
```

---

### Task 6: Repoint category page

**Files:**
- Modify: `src/app/blog/[category]/page.tsx`

- [ ] **Step 1: Swap data source + drop static params**

```tsx
// remove: import { blogCategories, getPostsByCategory } from "@/lib/data/posts";
import { blogCategories } from "@/lib/data/posts";
import { getPublishedPostsByCategory } from "@/lib/blog/queries";
```

Delete the `generateStaticParams` function. Add `export const dynamic = "force-dynamic";`. In the component, replace:

```tsx
const categoryPosts = getPostsByCategory(cat.slug as BlogCategory);
```
with:
```tsx
const categoryPosts = await getPublishedPostsByCategory(cat.slug as BlogCategory);
```

(The component is already `async`.)

- [ ] **Step 2: Verify**

`preview_eval` navigate `/blog/seo` (or any seeded category), `preview_snapshot`.
Expected: category posts render; an empty category shows the existing EmptyState. No console errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/blog/[category]/page.tsx"
git commit -m "feat(blog): read category page from DB"
```

---

### Task 7: Repoint article page

**Files:**
- Modify: `src/app/blog/[category]/[slug]/page.tsx`

- [ ] **Step 1: Swap data source + drop static params**

```tsx
// remove: import { posts, getPost, blogCategories, author } from "@/lib/data/posts";
import { blogCategories, author } from "@/lib/data/posts";
import { getPublishedPost, getPublishedPostsByCategory, getPublishedPosts } from "@/lib/blog/queries";
```

Delete `generateStaticParams`. Add `export const dynamic = "force-dynamic";`.

In `generateMetadata`, replace `const post = getPost(slug);` with `const post = await getPublishedPost(slug);`.

In `ArticlePage`, replace:
```tsx
const post = getPost(slug);
if (!post || post.category !== category) notFound();
const related = posts.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);
const fallback = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
const relatedPosts = related.length ? related : fallback;
```
with:
```tsx
const post = await getPublishedPost(slug);
if (!post || post.category !== category) notFound();
const sameCat = await getPublishedPostsByCategory(post.category);
const related = sameCat.filter((p) => p.slug !== post.slug).slice(0, 3);
const relatedPosts = related.length
  ? related
  : (await getPublishedPosts()).filter((p) => p.slug !== post.slug).slice(0, 3);
```

Leave all JSX unchanged.

- [ ] **Step 2: Verify**

`preview_eval` navigate a seeded article URL (e.g. `/blog/seo/<slug>`), `preview_snapshot`.
Expected: full article renders (hero, ArticleBody blocks, related posts). No console errors. Navigate a non-existent slug → 404.

- [ ] **Step 3: Commit**

```bash
git add "src/app/blog/[category]/[slug]/page.tsx"
git commit -m "feat(blog): read article page from DB"
```

---

### Task 8: Block editor component

**Files:**
- Create: `src/components/admin/block-editor.tsx`

A focused editor over `ContentBlock[]`. Core types get real fields; any other type is edited as JSON. Add / move up / move down / delete. Emits the array via a hidden input (JSON) named `body` so the parent form's Server Action receives it.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CORE_TYPES = ["lead", "p", "h2", "h3", "quote", "callout", "code", "ul", "ol", "tags", "takeaways", "divider"] as const;

function newBlock(type: string): ContentBlock {
  switch (type) {
    case "ul":
    case "ol":
      return { type, items: [""] } as ContentBlock;
    case "tags":
      return { type: "tags", items: [] };
    case "takeaways":
      return { type: "takeaways", items: [""] };
    case "divider":
      return { type: "divider" };
    case "callout":
      return { type: "callout", text: "" };
    case "code":
      return { type: "code", code: "" };
    default:
      return { type, text: "" } as ContentBlock;
  }
}

export function BlockEditor({ initial }: { initial: ContentBlock[] }) {
  const [blocks, setBlocks] = React.useState<ContentBlock[]>(initial.length ? initial : []);
  const [addType, setAddType] = React.useState<string>("p");

  const update = (i: number, next: ContentBlock) =>
    setBlocks((b) => b.map((x, idx) => (idx === i ? next : x)));
  const remove = (i: number) => setBlocks((b) => b.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setBlocks((b) => {
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const copy = [...b];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <div className="grid gap-3">
      <input type="hidden" name="body" value={JSON.stringify(blocks)} readOnly />

      {blocks.map((block, i) => (
        <div key={i} className="rounded-card border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">{block.type}</span>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>✕</Button>
            </div>
          </div>
          <BlockFields block={block} onChange={(b) => update(i, b)} />
        </div>
      ))}

      <div className="flex items-center gap-2">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value)}
          className="rounded-btn border border-border bg-background px-2 py-1.5 text-sm"
        >
          {CORE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
          <option value="__json">other (JSON)</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setBlocks((b) => [
              ...b,
              addType === "__json" ? ({ type: "p", text: "" } as ContentBlock) : newBlock(addType),
            ])
          }
        >
          Add block
        </Button>
      </div>
    </div>
  );
}

function BlockFields({ block, onChange }: { block: ContentBlock; onChange: (b: ContentBlock) => void }) {
  const type = block.type;

  if (type === "divider") return null;

  if (type === "p" || type === "lead" || type === "h2" || type === "h3" || type === "quote" || type === "callout") {
    const text = typeof (block as { text?: unknown }).text === "string" ? (block as { text: string }).text : JSON.stringify((block as { text?: unknown }).text ?? "");
    return (
      <textarea
        className="min-h-20 w-full rounded-btn border border-border bg-background p-2 text-sm"
        value={text}
        onChange={(e) => onChange({ ...block, text: e.target.value } as ContentBlock)}
      />
    );
  }

  if (type === "code") {
    return (
      <textarea
        className="min-h-24 w-full rounded-btn border border-border bg-background p-2 font-mono text-sm"
        value={(block as { code: string }).code}
        onChange={(e) => onChange({ ...block, code: e.target.value } as ContentBlock)}
      />
    );
  }

  if (type === "ul" || type === "ol" || type === "tags" || type === "takeaways") {
    const items = (block as { items: unknown[] }).items.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
    return (
      <textarea
        className="min-h-20 w-full rounded-btn border border-border bg-background p-2 text-sm"
        placeholder="one item per line"
        value={items.join("\n")}
        onChange={(e) =>
          onChange({ ...block, items: e.target.value.split("\n").filter(Boolean) } as ContentBlock)
        }
      />
    );
  }

  // Fallback: raw JSON for any advanced block type.
  return (
    <textarea
      className="min-h-24 w-full rounded-btn border border-border bg-background p-2 font-mono text-xs"
      value={JSON.stringify(block, null, 2)}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          /* ignore until valid JSON */
        }
      }}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/block-editor.tsx
git commit -m "feat(blog): add block editor component"
```

---

### Task 9: Post Server Actions

**Files:**
- Create: `src/lib/blog/actions.ts`

- [ ] **Step 1: Write the actions**

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { countWords } from "@/lib/blog/words";
import type { ContentBlock } from "@/lib/data/types";

function parseBody(raw: FormDataEntryValue | null): ContentBlock[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContentBlock[]) : [];
  } catch {
    return [];
  }
}

function fields(formData: FormData) {
  const body = parseBody(formData.get("body"));
  const status = String(formData.get("status") ?? "draft");
  const publishAtRaw = String(formData.get("publish_at") ?? "").trim();
  // published_at: set for published (now if empty) / scheduled (the chosen time); null for draft.
  let published_at: string | null = null;
  if (status === "published") published_at = publishAtRaw ? new Date(publishAtRaw).toISOString() : new Date().toISOString();
  else if (status === "scheduled") published_at = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;

  return {
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    featured: formData.get("featured") === "on",
    body,
    words: countWords(body),
    status,
    published_at,
  };
}

export async function createPost(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("posts").insert(fields(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function updatePost(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("posts").update(fields(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function deletePost(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/blog");
  redirect("/admin/posts");
}
```

Note on the `redirect()` from `next/navigation` inside try/catch: it isn't wrapped in try/catch here — the `error` checks throw before reaching `redirect`. Keep it that way.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/blog/actions.ts
git commit -m "feat(blog): add post create/update/delete server actions"
```

---

### Task 10: Post editor form

**Files:**
- Create: `src/components/admin/post-editor.tsx`

Reusable for create + edit. Renders meta fields + `BlockEditor`, binds to the right action.

- [ ] **Step 1: Write the editor**

```tsx
"use client";

import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import { BlockEditor } from "@/components/admin/block-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = ["seo", "performance", "content", "ai", "saas", "founder"];

export type EditorPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  featured: boolean;
  status: string;
  publishedAt: string | null;
  body: ContentBlock[];
};

export function PostEditor({
  action,
  post,
}: {
  action: (formData: FormData) => void | Promise<void>;
  post?: EditorPost;
}) {
  const [status, setStatus] = React.useState(post?.status ?? "draft");
  const publishLocal = post?.publishedAt
    ? new Date(post.publishedAt).toISOString().slice(0, 16)
    : "";

  return (
    <form action={action} className="grid max-w-3xl gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={post?.title} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={post?.slug} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="excerpt">Excerpt</Label>
        <textarea id="excerpt" name="excerpt" defaultValue={post?.excerpt}
          className="min-h-16 rounded-btn border border-border bg-background p-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" defaultValue={post?.category ?? "seo"}
            className="rounded-btn border border-border bg-background px-2 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" name="tags" defaultValue={post?.tags.join(", ")} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={post?.featured} /> Featured
      </label>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}
            className="rounded-btn border border-border bg-background px-2 py-2 text-sm">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="publish_at">Publish at {status === "scheduled" ? "(required)" : "(optional)"}</Label>
          <Input id="publish_at" name="publish_at" type="datetime-local"
            defaultValue={publishLocal} disabled={status === "draft"} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Body</Label>
        <BlockEditor initial={post?.body ?? []} />
      </div>

      <div className="flex gap-2">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/post-editor.tsx
git commit -m "feat(blog): add post editor form"
```

---

### Task 11: Admin posts pages (list / new / edit) + nav + counts

**Files:**
- Create: `src/app/admin/posts/page.tsx`
- Create: `src/app/admin/posts/new/page.tsx`
- Create: `src/app/admin/posts/[id]/page.tsx`
- Modify: `src/app/admin/layout.tsx` (add nav link)
- Modify: `src/app/admin/page.tsx` (add counts)

- [ ] **Step 1: Posts list**

```tsx
import Link from "next/link";
import { getAllPostsAdmin } from "@/lib/blog/queries";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getAllPostsAdmin();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
        <Button asChild size="sm"><Link href="/admin/posts/new">New post</Link></Button>
      </div>
      <div className="grid gap-2">
        {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
        {posts.map((p) => (
          <Link key={p.id} href={`/admin/posts/${p.id}`}
            className="flex items-center justify-between rounded-card border border-border p-3 hover:bg-accent">
            <span className="font-medium">{p.title}</span>
            <span className="text-xs text-muted-foreground">{p.status} · {p.category}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

(If `Button asChild` is unavailable, replace with a plain styled `Link`. Verify against `src/components/ui/button.tsx` during implementation.)

- [ ] **Step 2: New post page**

```tsx
import { createPost } from "@/lib/blog/actions";
import { PostEditor } from "@/components/admin/post-editor";

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New post</h1>
      <PostEditor action={createPost} />
    </div>
  );
}
```

- [ ] **Step 3: Edit post page**

```tsx
import { notFound } from "next/navigation";
import { getPostByIdAdmin } from "@/lib/blog/queries";
import { updatePost, deletePost } from "@/lib/blog/actions";
import { PostEditor } from "@/components/admin/post-editor";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostByIdAdmin(id);
  if (!post) notFound();

  const update = updatePost.bind(null, id);
  const remove = deletePost.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit post</h1>
        <form action={remove}>
          <Button type="submit" variant="outline" size="sm">Delete</Button>
        </form>
      </div>
      <PostEditor
        action={update}
        post={{
          slug: post.slug, title: post.title, excerpt: post.excerpt,
          category: post.category, tags: post.tags, featured: post.featured ?? false,
          status: post.status, publishedAt: post.publishedAt, body: post.body,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add Posts to admin nav**

In `src/app/admin/layout.tsx`, change `NAV` to:
```tsx
const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
];
```

- [ ] **Step 5: Add post counts to dashboard**

Replace `src/app/admin/page.tsx` with:
```tsx
import { getAllPostsAdmin } from "@/lib/blog/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const posts = await getAllPostsAdmin();
  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Published" value={published} />
        <Stat label="Drafts" value={drafts} />
        <Stat label="Scheduled" value={scheduled} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
```

- [ ] **Step 6: Verify the full admin CRUD flow**

Dev server running, logged in as admin:
1. `preview_eval` navigate `/admin/posts` → `preview_snapshot`: seeded posts listed.
2. Navigate `/admin/posts/new`; `preview_fill` title/slug/excerpt, set category, add a `p` block via the editor, set status Published; submit.
3. `preview_snapshot` on `/admin/posts`: the new post appears.
4. `preview_eval` navigate `/blog` → `preview_snapshot`: the new published post shows publicly.
5. Open the post in admin, change status to Draft, save; reload `/blog`: it disappears.
6. Delete the test post; confirm it's gone from `/admin/posts` and `/blog`.
Expected: all steps as described; `preview_console_logs` error: none.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/posts" src/app/admin/layout.tsx src/app/admin/page.tsx
git commit -m "feat(blog): admin posts list/new/edit + nav + dashboard counts"
```

---

## Self-review

**Spec coverage (spec §3 Posts model, §4 Seeding, §5 Block editor, §8 Public read repoint, §6 Publishing):**
- `posts` table with `body jsonb` unchanged shape → Task 1. ✓
- Draft/published/scheduled + time-based visibility → Task 1 RLS (`published_at <= now()`) + Task 9 status handling. ✓
- Seed from static content → Task 3 generator + SQL. ✓
- Block editor over `ContentBlock[]` → Tasks 8 + 10. ✓
- Public pages read DB, renderer unchanged → Tasks 5/6/7 (map to `Post` shape in Task 4). ✓
- Admin CRUD → Tasks 9/10/11. ✓
- Media/Storage → intentionally OUT (user chose "no images yet"); not in this plan. Documented.
- Success criteria (create draft invisible / publish visible / schedule appears later / seeded posts render unchanged) → Task 11 Step 6 + Tasks 5–7 verify. ✓

**Placeholder scan:** No TBD/TODO. Every code step has complete code. Two implementation-time verifications flagged (`@/` alias in Vitest; `Button asChild` availability) with explicit fallbacks — not placeholders.

**Type consistency:** `Post` shape produced by `toPost` (Task 4) matches `src/lib/data/types.ts`. `AdminPostRow`/`EditorPost` fields align between queries (Task 4), editor (Task 10), and pages (Task 11). `countWords` signature (Task 2) matches its use in `actions.ts` (Task 9). `createPost(formData)` / `updatePost(id, formData)` (Task 9) match `action={action}` and `.bind(null, id)` usage (Tasks 10/11). `body` hidden input name `"body"` (Task 8) matches `parseBody(formData.get("body"))` (Task 9).

**Scope:** Blog only. Subscribers + payments dashboards are separate plans. Shippable: seeded posts render from DB, admin manages posts end-to-end.
