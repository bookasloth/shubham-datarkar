# Photos: Cloudinary → Supabase Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cloudinary with Supabase Storage for all photo upload, rendering, and deletion.

**Architecture:** Create a `photos` public bucket in Supabase Storage. Rename DB column `cloudinary_public_id` → `storage_path`. Upload via server action using `supabaseAdmin().storage`, render via `next/image` with Supabase public URLs, delete via `supabaseAdmin().storage.from().remove()`. Follows the existing `support-media` pattern.

**Tech Stack:** Supabase Storage, Next.js `<Image>`, existing `supabaseAdmin()` client

## Global Constraints

- Never apply migrations directly — write SQL file, hand user the SQL to run manually
- Branch + PR + merge for every change — never commit direct to main
- Base branches on `origin/main`
- Monochrome design, no emojis in code
- Use existing `supabaseAdmin()` from `src/lib/supabase/server.ts` for storage ops

---

### Task 1: Migration SQL + storage module + types

**Files:**
- Create: `supabase/migrations/20260706000001_photos_supabase_storage.sql`
- Create: `src/lib/photos/storage.ts`
- Modify: `src/lib/photos/types.ts`

**Interfaces:**
- Consumes: `supabaseAdmin()` from `@/lib/supabase/server`
- Produces:
  - `getPhotoPublicUrl(storagePath: string): string`
  - `uploadPhoto(file: File): Promise<{ ok: true; path: string } | { ok: false; error: string }>`
  - `deleteStoragePhoto(storagePath: string): Promise<void>`
  - `Photo.storagePath` (replaces `Photo.cloudinaryPublicId`)

- [ ] **Step 1: Create migration SQL**

Create `supabase/migrations/20260706000001_photos_supabase_storage.sql`:

```sql
-- Rename cloudinary column to storage_path for Supabase Storage migration.
-- Fresh start — no data to backfill.
-- Target: your OWN Supabase project. Run manually in the SQL editor.

alter table public.photos
  rename column cloudinary_public_id to storage_path;

-- Create the photos storage bucket (public).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Allow public reads on the photos bucket.
create policy "photos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'photos');

-- Allow authenticated admin uploads/deletes.
create policy "photos_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and public.is_admin());

create policy "photos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and public.is_admin());
```

- [ ] **Step 2: Update Photo type**

Edit `src/lib/photos/types.ts` — replace `cloudinaryPublicId` with `storagePath`:

```ts
export type Photo = {
  id: string;
  storagePath: string;
  title: string;
  description: string | null;
  tags: string[];
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 3: Create storage module**

Create `src/lib/photos/storage.ts`:

```ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

const BUCKET = "photos";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export function getPhotoPublicUrl(storagePath: string): string {
  const { data } = supabaseAdmin().storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadPhoto(
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}` };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: `File too large (max ${MAX_SIZE / 1024 / 1024} MB)` };
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const hex = randomBytes(6).toString("hex");
  const path = `${Date.now()}-${hex}.${ext}`;

  const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export async function deleteStoragePhoto(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove([storagePath]);
  if (error) {
    console.warn(`[photos] storage delete failed for "${storagePath}":`, error.message);
  }
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: Compile errors in files still referencing `cloudinaryPublicId` / `cloudinary_public_id` — that's correct at this stage.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260706000001_photos_supabase_storage.sql src/lib/photos/storage.ts src/lib/photos/types.ts
git commit -m "feat(photos): add Supabase storage module + migration SQL + update Photo type"
```

---

### Task 2: Update queries + form + actions (data layer)

**Files:**
- Modify: `src/lib/photos/queries.ts`
- Modify: `src/lib/photos/form.ts`
- Modify: `src/lib/photos/actions.ts`
- Delete: `src/lib/cloudinary.ts`
- Delete: `src/lib/cloudinary.test.ts`

**Interfaces:**
- Consumes: `uploadPhoto`, `deleteStoragePhoto`, `getPhotoPublicUrl` from `@/lib/photos/storage`; `Photo` type with `storagePath`
- Produces: Same server action signatures (`createPhoto`, `updatePhoto`, `deletePhoto`), but `formData` now expects `storage_path` field (or a `file` field for create/update)

- [ ] **Step 1: Update queries.ts**

Edit `src/lib/photos/queries.ts`:

Replace the `DbRow` type — `cloudinary_public_id` → `storage_path`:

```ts
type DbRow = {
  id: string;
  storage_path: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};
```

Replace `PHOTO_COLS`:

```ts
const PHOTO_COLS =
  "id,storage_path,title,description,tags,sort_order,published,created_at,updated_at";
```

Update `mapRow` — replace `cloudinaryPublicId: row.cloudinary_public_id` with:

```ts
storagePath: row.storage_path,
```

- [ ] **Step 2: Update form.ts**

Edit `src/lib/photos/form.ts`:

In `PhotoRow` type, replace `cloudinary_public_id: string` with:

```ts
storage_path: string;
```

In `photoRowFromFormData`, replace the `cloudinary_public_id` line with:

```ts
storage_path: String(formData.get("storage_path") ?? "").trim(),
```

- [ ] **Step 3: Update actions.ts**

Replace the entire `src/lib/photos/actions.ts` with:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { uploadPhoto, deleteStoragePhoto } from "@/lib/photos/storage";
import { photoRowFromFormData } from "@/lib/photos/form";

function revalidatePhotos(): void {
  revalidatePath("/photos");
  revalidatePath("/admin/photos");
}

export async function createPhoto(formData: FormData): Promise<void> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No image file provided");

  const result = await uploadPhoto(file);
  if (!result.ok) throw new Error(result.error);

  formData.set("storage_path", result.path);

  const supabase = await supabaseAuthServer();
  const row = photoRowFromFormData(formData);
  const { error } = await supabase.from("photos").insert(row);
  if (error) throw new Error(error.message);

  revalidatePhotos();
  redirect("/admin/photos");
}

export async function updatePhoto(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();

  const file = formData.get("file") as File | null;
  if (file && file.size > 0) {
    const result = await uploadPhoto(file);
    if (!result.ok) throw new Error(result.error);
    formData.set("storage_path", result.path);

    // Clean up old storage file
    const { data } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    const oldPath = (data as { storage_path: string } | null)?.storage_path;
    if (oldPath) await deleteStoragePhoto(oldPath);
  }

  const row = photoRowFromFormData(formData);
  const { error } = await supabase.from("photos").update(row).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePhotos();
  redirect("/admin/photos");
}

export async function deletePhoto(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();

  const { data, error: readError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const storagePath = (data as { storage_path: string } | null)?.storage_path;

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (storagePath) {
    await deleteStoragePhoto(storagePath);
  }

  revalidatePhotos();
  redirect("/admin/photos");
}
```

- [ ] **Step 4: Delete Cloudinary files**

```bash
rm src/lib/cloudinary.ts src/lib/cloudinary.test.ts
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: Errors in components still importing `CldImage`/referencing `cloudinaryPublicId` — correct at this stage.

- [ ] **Step 6: Commit**

```bash
git add src/lib/photos/queries.ts src/lib/photos/form.ts src/lib/photos/actions.ts
git rm src/lib/cloudinary.ts src/lib/cloudinary.test.ts
git commit -m "feat(photos): migrate data layer from Cloudinary to Supabase Storage"
```

---

### Task 3: Update tests

**Files:**
- Modify: `src/lib/photos/queries.test.ts`
- Modify: `src/lib/photos/form.test.ts`

**Interfaces:**
- Consumes: updated `mapRow`, `photoRowFromFormData` signatures
- Produces: passing test suite

- [ ] **Step 1: Update queries.test.ts**

Replace the entire file `src/lib/photos/queries.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mapRow } from "./queries";

describe("mapRow", () => {
  it("maps a full db row (snake_case) to a Photo (camelCase)", () => {
    const row = {
      id: "11111111-1111-1111-1111-111111111111",
      storage_path: "1720000000-abc123.jpg",
      title: "Sunset",
      description: "A sunset over the hills",
      tags: ["nature", "sunset"],
      sort_order: 3,
      published: true,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-02T00:00:00.000Z",
    };

    expect(mapRow(row)).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      storagePath: "1720000000-abc123.jpg",
      title: "Sunset",
      description: "A sunset over the hills",
      tags: ["nature", "sunset"],
      sortOrder: 3,
      published: true,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-02T00:00:00.000Z",
    });
  });

  it("defaults null description to null and null tags to an empty array", () => {
    const row = {
      id: "22222222-2222-2222-2222-222222222222",
      storage_path: "1720000000-def456.png",
      title: "Mountain",
      description: null,
      tags: null,
      sort_order: 0,
      published: false,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    };

    const photo = mapRow(row);
    expect(photo.description).toBeNull();
    expect(photo.tags).toEqual([]);
  });
});
```

- [ ] **Step 2: Update form.test.ts**

In `src/lib/photos/form.test.ts`, update the `photoRowFromFormData` tests.

Replace the "maps a full form to a row" test:

```ts
  it("maps a full form to a row", () => {
    const row = photoRowFromFormData(
      fd({
        storage_path: "1720000000-abc123.jpg",
        title: "Sunset",
        description: "  A warm dusk  ",
        tags: "sky, warm, sky",
        sort_order: "10",
        published: "on",
      }),
    );
    expect(row).toEqual({
      storage_path: "1720000000-abc123.jpg",
      title: "Sunset",
      description: "A warm dusk",
      tags: ["sky", "warm"],
      sort_order: 10,
      published: true,
    });
  });
```

Replace the "blank description" test:

```ts
  it("blank description becomes null and missing checkbox is false", () => {
    const row = photoRowFromFormData(
      fd({ storage_path: "x.jpg", title: "T", description: "   ", tags: "", sort_order: "" }),
    );
    expect(row.description).toBeNull();
    expect(row.published).toBe(false);
    expect(row.tags).toEqual([]);
    expect(row.sort_order).toBe(0);
  });
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/photos/form.test.ts src/lib/photos/queries.test.ts`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/photos/queries.test.ts src/lib/photos/form.test.ts
git commit -m "test(photos): update tests for Supabase Storage field names"
```

---

### Task 4: Update components (photo-editor, photo-card, photo-lightbox, admin pages)

**Files:**
- Modify: `src/components/admin/photo-editor.tsx`
- Modify: `src/components/photos/photo-card.tsx`
- Modify: `src/components/photos/photo-lightbox.tsx`
- Modify: `src/app/admin/photos/page.tsx`
- Modify: `src/app/admin/photos/[id]/page.tsx`

**Interfaces:**
- Consumes: `Photo.storagePath`, `getPhotoPublicUrl()` from `@/lib/photos/storage`
- Produces: Same component signatures, rendering via `next/image` instead of CldImage

- [ ] **Step 1: Rewrite photo-editor.tsx**

Replace the entire `src/components/admin/photo-editor.tsx`:

```tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditorPhoto = {
  storagePath: string;
  imageUrl: string;
  title: string;
  description: string | null;
  tags: string[];
  sortOrder: number;
  published: boolean;
};

export function PhotoEditor({
  action,
  photo,
}: {
  action: (formData: FormData) => void | Promise<void>;
  photo?: EditorPhoto;
}) {
  const [preview, setPreview] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setFileName(file.name);
    }
  };

  const displayUrl = preview ?? photo?.imageUrl ?? null;

  return (
    <form action={action} className="grid max-w-3xl gap-5">
      {/* When editing without a new file, carry forward the existing storage_path */}
      {photo && !preview && (
        <input type="hidden" name="storage_path" value={photo.storagePath} />
      )}

      <div className="grid gap-1.5">
        <Label>Image</Label>

        {displayUrl ? (
          <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-card border border-border bg-muted">
            <Image
              src={displayUrl}
              alt="Selected photo preview"
              fill
              sizes="384px"
              className="object-cover"
              unoptimized={!!preview}
            />
          </div>
        ) : (
          <div className="flex aspect-[4/3] w-full max-w-sm items-center justify-center rounded-card border border-dashed border-border bg-muted text-sm text-muted-foreground">
            No image selected
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              {photo ? "Replace image" : "Upload image"}
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          </Button>
          {fileName && (
            <span className="truncate text-xs text-muted-foreground">{fileName}</span>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={photo?.title} required />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          defaultValue={photo?.description ?? ""}
          className="min-h-16 rounded-btn border border-border bg-background p-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" name="tags" defaultValue={photo?.tags.join(", ")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sort_order">Sort order</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            step="1"
            defaultValue={photo?.sortOrder ?? 0}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={photo?.published} /> Published
      </label>

      <div className="flex gap-2">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Update photo-card.tsx**

Edit `src/components/photos/photo-card.tsx`:

Replace `import { CldImage } from "next-cloudinary"` with:

```tsx
import Image from "next/image";
import { getPhotoPublicUrl } from "@/lib/photos/storage";
```

Wait — `getPhotoPublicUrl` uses `server-only`. Since photo-card is `"use client"`, we can't import it directly. Instead, pass the URL from the server. Let me reconsider.

**Revised approach:** Since `getPhotoPublicUrl` imports `server-only`, client components can't import it. Instead, add the `imageUrl` to the `Photo` type at the query layer, or create a client-safe URL builder.

Create a client-safe helper. Update `src/lib/photos/storage.ts` to export only the client-safe function separately:

Actually, `getPhotoPublicUrl` doesn't need to call supabase — it can just construct the URL string. Make it a pure function in a separate file that both server and client can import.

Create `src/lib/photos/photo-url.ts`:

```ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "photos";

export function getPhotoPublicUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}
```

Then update `src/lib/photos/storage.ts` to import from `photo-url.ts` instead of computing URLs itself. Remove the `getPhotoPublicUrl` from `storage.ts`.

Now in `src/components/photos/photo-card.tsx`, replace the CldImage import and usage:

```tsx
import Image from "next/image";
import { getPhotoPublicUrl } from "@/lib/photos/photo-url";
```

Replace the `<CldImage>` block with:

```tsx
        <Image
          src={getPhotoPublicUrl(photo.storagePath)}
          alt={photo.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-[--dur-slow] ease-[--ease-out-quint] group-hover:scale-[1.02]"
        />
```

- [ ] **Step 3: Update photo-lightbox.tsx**

Edit `src/components/photos/photo-lightbox.tsx`:

Replace `import { CldImage } from "next-cloudinary"` with:

```tsx
import Image from "next/image";
import { getPhotoPublicUrl } from "@/lib/photos/photo-url";
```

Replace the main `<CldImage>` (line ~137-144) with:

```tsx
                <Image
                  key={photo.id}
                  src={getPhotoPublicUrl(photo.storagePath)}
                  alt={photo.title}
                  width={1600}
                  height={1200}
                  sizes="100vw"
                  className="max-h-full w-auto max-w-full object-contain"
                />
```

Replace the thumbnail `<CldImage>` (line ~191-198) with:

```tsx
                            <Image
                              src={getPhotoPublicUrl(p.storagePath)}
                              alt={p.title}
                              width={80}
                              height={56}
                              className="h-full w-full object-cover"
                            />
```

- [ ] **Step 4: Update admin photos list page**

Edit `src/app/admin/photos/page.tsx`:

Replace `import { CldImage } from "next-cloudinary"` with:

```tsx
import Image from "next/image";
import { getPhotoPublicUrl } from "@/lib/photos/photo-url";
```

Replace the `<CldImage>` block (line ~46-53) with:

```tsx
                <Image
                  src={getPhotoPublicUrl(p.storagePath)}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />
```

- [ ] **Step 5: Update edit photo page**

Edit `src/app/admin/photos/[id]/page.tsx`:

The `PhotoEditor` prop now passes `storagePath` + `imageUrl` instead of `cloudinaryPublicId`. Import `getPhotoPublicUrl`:

```tsx
import { getPhotoPublicUrl } from "@/lib/photos/photo-url";
```

Replace the `<PhotoEditor>` prop object (line ~52-59):

```tsx
      <PhotoEditor
        action={update}
        photo={{
          storagePath: photo.storagePath,
          imageUrl: getPhotoPublicUrl(photo.storagePath),
          title: photo.title,
          description: photo.description,
          tags: photo.tags,
          sortOrder: photo.sortOrder,
          published: photo.published,
        }}
      />
```

- [ ] **Step 6: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: Clean compilation (no errors).

- [ ] **Step 7: Commit**

```bash
git add src/lib/photos/photo-url.ts src/lib/photos/storage.ts src/components/admin/photo-editor.tsx src/components/photos/photo-card.tsx src/components/photos/photo-lightbox.tsx src/app/admin/photos/page.tsx src/app/admin/photos/[id]/page.tsx
git commit -m "feat(photos): replace CldImage/CldUploadWidget with next/image + file input"
```

---

### Task 5: Config cleanup (next.config, .env.example, packages)

**Files:**
- Modify: `next.config.ts`
- Modify: `.env.example`
- Modify: `package.json` (via npm uninstall)

**Interfaces:**
- Consumes: none
- Produces: Supabase domain allowed in `next/image` remotePatterns; Cloudinary deps removed

- [ ] **Step 1: Add Supabase to next.config.ts remotePatterns**

Edit `next.config.ts` — add `images` config. The full file becomes:

```ts
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@phosphor-icons/react",
      "framer-motion",
    ],
  },
  async redirects() {
    return [
      { source: "/subscribe", destination: "/newsletter", permanent: true },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Remove Cloudinary env vars from .env.example**

Remove these lines from `.env.example`:

```
# Cloudinary (photo gallery) — from Cloudinary Dashboard -> Settings -> API Keys
# Upload preset must be an UNSIGNED preset (used client-side by CldUploadWidget)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

- [ ] **Step 3: Uninstall Cloudinary packages**

Run: `npm uninstall cloudinary next-cloudinary`

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`

Expected: All tests pass. No references to cloudinary remain.

- [ ] **Step 5: Run build check**

Run: `npx next build 2>&1 | tail -20`

Expected: Build succeeds with no Cloudinary-related errors.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts .env.example package.json package-lock.json
git commit -m "chore(photos): remove Cloudinary deps, add Supabase to image remotePatterns"
```

---

### Task 6: Manual steps handoff

These steps require the user to run SQL manually per project workflow:

- [ ] **Step 1: Hand user the migration SQL**

Print the contents of `supabase/migrations/20260706000001_photos_supabase_storage.sql` and instruct the user to run it in the Supabase SQL editor.

- [ ] **Step 2: Remind user to clean up .env.local**

The user should remove these keys from `.env.local`:
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

And from their Vercel environment variables.

- [ ] **Step 3: Verify in browser**

Start the dev server and navigate to `/admin/photos`:
1. Click "New photo" — file input should appear
2. Select an image file — preview should display
3. Fill in title, save — should redirect to `/admin/photos` with the image showing
4. Click the photo to edit — image should display from Supabase Storage
5. Visit `/photos` — public gallery should render images via `next/image`
