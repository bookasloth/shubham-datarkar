# Admin UI Redesign — PR5: Content list pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Add the shared `PageHeader` and convert the Posts list and the generic content-entity list to `DataTable` + `PageHeader`, so both match the new design system while preserving every route, link, and action.

**Architecture:** Server pages fetch as before and pass plain, serializable row arrays to small `"use client"` table modules (DataTable columns hold render functions, which can't cross the RSC boundary). `PageHeader` is a presentational title/description/actions block.

**Tech Stack:** Next.js 16, React 19, TS, Tailwind v4, PR1 primitives, PR4 `DataTable`, lucide-react.

## Global Constraints

- ADDITIVE/UI-only: no new DB queries, no `src/lib` change, no API/route/schema/auth change. Existing files modified: only `src/app/admin/posts/page.tsx` and `src/app/admin/content/[entity]/page.tsx`.
- Preserve every existing link/route: post rows → `/admin/posts/${id}`; "New post" → `/admin/posts/new`; entity rows → `/admin/content/${key}/${id}`; "New" → `/admin/content/${key}/new`. Keep `force-dynamic` on both pages.
- Admin tokens + PR1/PR4 components only. No public tokens. Orange only on interaction. ≤150ms transitions. Dark mode. Keyboard accessible.
- `DataTable` columns hold functions → define them in `"use client"` modules; server pages pass plain arrays only.
- Branch from `origin/main` tip (14950f7). PR title: `feat(admin): content list pages — posts + entities on DataTable (redesign PR5)`.

## File Structure

**Create:**
- `src/components/admin/ui/page-header.tsx` — `PageHeader`.
- `src/app/admin/posts/posts-table.tsx` — client columns + DataTable for posts.
- `src/app/admin/content/[entity]/entity-table.tsx` — client columns + DataTable for entities.

**Modify:**
- `src/components/admin/index.ts` — export `PageHeader`.
- `src/app/admin/posts/page.tsx` — PageHeader + PostsTable.
- `src/app/admin/content/[entity]/page.tsx` — PageHeader + EntityTable (map rows to plain objects server-side).

---

## Task 1: PageHeader component

**Files:**
- Create: `src/components/admin/ui/page-header.tsx`
- Modify: `src/components/admin/index.ts`

**Interfaces:**
- `PageHeader(props: { title: string; description?: string; actions?: React.ReactNode })` — a flex row: left = title (h1) + optional description; right = actions. Uses admin tokens.

- [ ] **Step 1: Implement `page-header.tsx`**

```tsx
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-admin-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Export from barrel.** Add to `src/components/admin/index.ts`:

```ts
export { PageHeader } from "./ui/page-header";
```

- [ ] **Step 3: Typecheck.** `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ui/page-header.tsx src/components/admin/index.ts
git commit -m "feat(admin): PageHeader component"
```

---

## Task 2: Convert Posts list to DataTable

**Files:**
- Create: `src/app/admin/posts/posts-table.tsx`
- Modify: `src/app/admin/posts/page.tsx`

**Interfaces:**
- `PostsTable({ rows }: { rows: Row[] })` where `Row = { id: string; title: string; slug: string; category: string; status: "draft" | "published" | "scheduled"; updatedAt: string }`.

- [ ] **Step 1: Create `posts-table.tsx`**

```tsx
"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string; title: string; slug: string; category: string;
  status: "draft" | "published" | "scheduled"; updatedAt: string;
};

const tone = (s: string) => (s === "published" ? "success" : s === "scheduled" ? "info" : "neutral");

const columns: Column<Row>[] = [
  {
    key: "title", header: "Title", sortValue: (r) => r.title,
    cell: (r) => (
      <Link href={`/admin/posts/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
        {r.title}
      </Link>
    ),
  },
  { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> },
  { key: "category", header: "Category", sortValue: (r) => r.category, cell: (r) => r.category, hideable: true },
  { key: "updated", header: "Updated", sortValue: (r) => r.updatedAt, cell: (r) => formatDate(r.updatedAt), hideable: true },
];

export function PostsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.title} ${r.category} ${r.status}`}
      searchPlaceholder="Search posts…"
      initialSort={{ key: "updated", dir: "desc" }}
      emptyTitle="No posts yet"
      emptyDescription="Create your first post to get started."
    />
  );
}
```

- [ ] **Step 2: Rewrite `src/app/admin/posts/page.tsx`**

```tsx
import Link from "next/link";
import { getAllPostsAdmin } from "@/lib/blog/queries";
import { AdminButton, PageHeader } from "@/components/admin";
import { PostsTable } from "./posts-table";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getAllPostsAdmin();
  return (
    <div>
      <PageHeader
        title="Posts"
        actions={
          <AdminButton asChild size="sm">
            <Link href="/admin/posts/new">New post</Link>
          </AdminButton>
        }
      />
      <PostsTable rows={posts} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + tests.** `npx tsc --noEmit && npx vitest run`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/posts/page.tsx src/app/admin/posts/posts-table.tsx
git commit -m "feat(admin): convert posts list to DataTable"
```

---

## Task 3: Convert content-entity list to DataTable

**Files:**
- Create: `src/app/admin/content/[entity]/entity-table.tsx`
- Modify: `src/app/admin/content/[entity]/page.tsx`

**Interfaces:**
- `EntityTable({ rows, entityKey }: { rows: Row[]; entityKey: string })` where `Row = { id: string; title: string; slug: string | null; published: boolean }`.
- The server page computes each row's display title with `rowTitle(def, r.data, r.slug ?? r.id)` and passes plain `Row[]` (no functions cross the boundary).

- [ ] **Step 1: Create `entity-table.tsx`**

```tsx
"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";

type Row = { id: string; title: string; slug: string | null; published: boolean };

export function EntityTable({ rows, entityKey }: { rows: Row[]; entityKey: string }) {
  const columns: Column<Row>[] = [
    {
      key: "title", header: "Title", sortValue: (r) => r.title,
      cell: (r) => (
        <Link href={`/admin/content/${entityKey}/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
          {r.title}
        </Link>
      ),
    },
    {
      key: "status", header: "Status", sortValue: (r) => (r.published ? "published" : "draft"),
      cell: (r) => <StatusBadge tone={r.published ? "success" : "neutral"}>{r.published ? "published" : "draft"}</StatusBadge>,
    },
    { key: "slug", header: "Slug", sortValue: (r) => r.slug, cell: (r) => r.slug ?? "—", hideable: true },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.title} ${r.slug ?? ""}`}
      searchPlaceholder="Search…"
      initialSort={{ key: "title", dir: "asc" }}
      emptyTitle="Nothing here yet"
    />
  );
}
```

- [ ] **Step 2: Rewrite `src/app/admin/content/[entity]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntity, rowTitle } from "@/lib/content/registry";
import { getAllEntitiesAdmin } from "@/lib/content/queries";
import { AdminButton, PageHeader } from "@/components/admin";
import { EntityTable } from "./entity-table";

export const dynamic = "force-dynamic";

export default async function EntityListPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  const def = getEntity(entity);
  if (!def) notFound();

  const raw = await getAllEntitiesAdmin(def.table);
  const rows = raw.map((r) => ({
    id: r.id,
    title: rowTitle(def, r.data, r.slug ?? r.id),
    slug: r.slug,
    published: r.published,
  }));

  return (
    <div>
      <PageHeader
        title={def.label}
        actions={
          <AdminButton asChild size="sm">
            <Link href={`/admin/content/${def.key}/new`}>New</Link>
          </AdminButton>
        }
      />
      <EntityTable rows={rows} entityKey={def.key} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + tests.** `npx tsc --noEmit && npx vitest run`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/content/[entity]/page.tsx src/app/admin/content/[entity]/entity-table.tsx
git commit -m "feat(admin): convert content entity list to DataTable"
```

---

## Task 4: Build verification

- [ ] **Step 1: Production build** — `npm run build`. Expect exit 0, "Compiled successfully", `/admin/posts` and `/admin/content/[entity]` present. Fix genuine issues, rebuild.
- [ ] **Step 2: Confirm routes preserved** — `/admin/posts/new`, `/admin/posts/[id]`, `/admin/content/[entity]/new`, `/admin/content/[entity]/[id]` all still in the manifest (unchanged — we only touched the list pages).
- [ ] **Step 3: Commit (only if a fix was needed).**

---

## Self-Review

- PageHeader reusable (title/description/actions), admin tokens. ✓
- Posts + entity lists on DataTable (sort/search/pagination/density/column-visibility inherited); every route/link preserved; `force-dynamic` kept. ✓
- RSC boundary correct: columns in client modules; server passes plain arrays (entity page precomputes `title` via `rowTitle`). ✓
- Admin tokens only; no public tokens; StatusBadge tones sane. ✓
- Only the two list pages modified among existing files; barrel gains one export. ✓
- Updates page + editors intentionally deferred to PR6. ✓
