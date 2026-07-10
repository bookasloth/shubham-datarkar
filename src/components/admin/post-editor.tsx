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
  seoTitle?: string;
  ogTitle?: string;
  ogDescription?: string;
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
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={post?.excerpt}
          className="min-h-16 rounded-btn border border-border bg-background p-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue={post?.category ?? "seo"}
            className="rounded-btn border border-border bg-background px-2 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
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
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-btn border border-border bg-background px-2 py-2 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="publish_at">
            Publish at {status === "scheduled" ? "(required)" : "(optional)"}
          </Label>
          <Input
            id="publish_at"
            name="publish_at"
            type="datetime-local"
            defaultValue={publishLocal}
            disabled={status === "draft"}
          />
        </div>
      </div>

      <fieldset className="grid gap-4 rounded-btn border border-border p-4">
        <legend className="px-1 text-sm font-medium">SEO</legend>
        <div className="grid gap-1.5">
          <Label htmlFor="seo_title">SEO title</Label>
          <Input id="seo_title" name="seo_title" defaultValue={post?.seoTitle} />
          <p className="text-xs text-muted-foreground">
            Keyword &lt;title&gt; phrase, 15–40 chars, no brand name — the site appends
            {" “ — Shubham Datarkar”"} automatically. Falls back to the title.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="og_title">Social title</Label>
          <Input id="og_title" name="og_title" defaultValue={post?.ogTitle} />
          <p className="text-xs text-muted-foreground">
            Headline for the social share card. Falls back to the branded full title.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="og_description">Social description</Label>
          <textarea
            id="og_description"
            name="og_description"
            defaultValue={post?.ogDescription}
            className="min-h-16 rounded-btn border border-border bg-background p-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Body for the social share card. Falls back to the excerpt.
          </p>
        </div>
      </fieldset>

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
