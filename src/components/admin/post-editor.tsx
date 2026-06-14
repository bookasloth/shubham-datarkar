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
