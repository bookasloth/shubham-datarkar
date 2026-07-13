"use client";

import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import type { Category, ResourceMeta, ResourceType } from "@/lib/resources/types";
import { uploadMemberFile } from "@/lib/resources/actions";
import { BlockEditor } from "@/components/admin/block-editor";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditorResource = {
  slug: string;
  title: string;
  description: string | null;
  excerpt: string | null;
  cover_image: string | null;
  type: string;
  category_id: string | null;
  difficulty: string | null;
  status: string;
  required_capability: string | null;
  content: ContentBlock[];
  meta: ResourceMeta;
  featured: boolean;
  published_at: string | null;
};

const SELECT_CLASSES = "rounded-btn border border-border bg-background px-2 py-2 text-sm";
const TEXTAREA_CLASSES = "min-h-16 rounded-btn border border-border bg-background p-2 text-sm";
const MONO_TEXTAREA = "min-h-28 rounded-btn border border-border bg-background p-2 font-mono text-xs";

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/** Type-specific meta fieldsets; values are read server-side per selected type. */
function MetaFields({ type, meta }: { type: string; meta: ResourceMeta }) {
  const [uploading, setUploading] = React.useState(false);
  const [filePath, setFilePath] = React.useState(meta.filePath ?? "");
  const [uploadError, setUploadError] = React.useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadMemberFile(fd);
    setUploading(false);
    if (result.error) setUploadError(result.error);
    else if (result.path) setFilePath(result.path);
  }

  switch (type) {
    case "prompt":
      return (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">Prompt</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role" htmlFor="meta_role">
              <Input id="meta_role" name="meta_role" defaultValue={meta.role} placeholder="You are a senior copywriter…" />
            </Field>
            <Field label="Model" htmlFor="meta_model">
              <Input id="meta_model" name="meta_model" defaultValue={meta.model} placeholder="Claude, ChatGPT…" />
            </Field>
          </div>
          <Field label="Goal" htmlFor="meta_goal">
            <Input id="meta_goal" name="meta_goal" defaultValue={meta.goal} />
          </Field>
          <Field label="Prompt body" htmlFor="meta_promptBody">
            <textarea id="meta_promptBody" name="meta_promptBody" defaultValue={meta.promptBody} className={MONO_TEXTAREA} rows={8} />
          </Field>
          <Field label="Variables (comma-separated)" htmlFor="meta_variables">
            <Input id="meta_variables" name="meta_variables" defaultValue={meta.variables?.join(", ")} placeholder="product, audience, tone" />
          </Field>
          <Field label="Example output" htmlFor="meta_exampleOutput">
            <textarea id="meta_exampleOutput" name="meta_exampleOutput" defaultValue={meta.exampleOutput} className={TEXTAREA_CLASSES} />
          </Field>
        </fieldset>
      );
    case "download":
      return (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">Download</legend>
          <Field label="File">
            <input type="file" onChange={onFile} className="text-sm" />
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
            <input type="hidden" name="meta_filePath" value={filePath} />
            {filePath && <p className="break-all text-xs text-muted-foreground">member-files/{filePath}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Version" htmlFor="meta_version">
              <Input id="meta_version" name="meta_version" defaultValue={meta.version} placeholder="1.0" />
            </Field>
          </div>
          <Field label='Changelog (JSON: [{"version","date","note"}])' htmlFor="meta_changelog">
            <textarea id="meta_changelog" name="meta_changelog" defaultValue={meta.changelog ? JSON.stringify(meta.changelog, null, 2) : ""} className={MONO_TEXTAREA} />
          </Field>
        </fieldset>
      );
    case "workflow":
      return (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">Workflow</legend>
          <Field label='Steps (JSON: [{"title","body","promptSlug","toolSlug","output"}])' htmlFor="meta_steps">
            <textarea id="meta_steps" name="meta_steps" defaultValue={meta.steps ? JSON.stringify(meta.steps, null, 2) : "[]"} className={MONO_TEXTAREA} rows={10} />
          </Field>
        </fieldset>
      );
    case "template":
      return (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">Template</legend>
          <Field label='Links (JSON: [{"label","url"}] — Figma, Canva, Docs…)' htmlFor="meta_links">
            <textarea id="meta_links" name="meta_links" defaultValue={meta.links ? JSON.stringify(meta.links, null, 2) : "[]"} className={MONO_TEXTAREA} />
          </Field>
        </fieldset>
      );
    case "video":
      return (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">Video</legend>
          <Field label="Video URL (YouTube / Vimeo)" htmlFor="meta_url">
            <Input id="meta_url" name="meta_url" defaultValue={meta.url} placeholder="https://youtube.com/watch?v=…" />
          </Field>
        </fieldset>
      );
    case "tool":
      return (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">Tool</legend>
          <Field label="Tool slug (from the tool registry)" htmlFor="meta_toolSlug">
            <Input id="meta_toolSlug" name="meta_toolSlug" defaultValue={meta.toolSlug} placeholder="utm-builder" />
          </Field>
        </fieldset>
      );
    default:
      return null;
  }
}

export function ResourceEditor({
  action,
  resource,
  tagNames,
  types,
  categories,
}: {
  action: (formData: FormData) => void | Promise<void>;
  resource?: EditorResource;
  tagNames?: string[];
  types: ResourceType[];
  categories: Category[];
}) {
  const [type, setType] = React.useState(resource?.type ?? "article");
  const publishLocal = resource?.published_at
    ? new Date(resource.published_at).toISOString().slice(0, 16)
    : "";

  return (
    <form action={action} className="grid max-w-3xl gap-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Title" htmlFor="title">
          <Input id="title" name="title" defaultValue={resource?.title} required />
        </Field>
        <Field label="Slug (blank = from title)" htmlFor="slug">
          <Input id="slug" name="slug" defaultValue={resource?.slug} />
        </Field>
      </div>

      <Field label="Description (card + hero subtitle)" htmlFor="description">
        <textarea id="description" name="description" defaultValue={resource?.description ?? ""} className={TEXTAREA_CLASSES} />
      </Field>

      <Field label="Excerpt (paywall teaser)" htmlFor="excerpt">
        <textarea id="excerpt" name="excerpt" defaultValue={resource?.excerpt ?? ""} className={TEXTAREA_CLASSES} />
      </Field>

      <Field label="Cover image URL (Supabase public storage)" htmlFor="cover_image">
        <Input id="cover_image" name="cover_image" defaultValue={resource?.cover_image ?? ""} placeholder="https://…supabase.co/storage/v1/object/public/…" />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Type" htmlFor="type">
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} className={SELECT_CLASSES}>
            {types.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Category" htmlFor="category_id">
          <select id="category_id" name="category_id" defaultValue={resource?.category_id ?? ""} className={SELECT_CLASSES}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty" htmlFor="difficulty">
          <select id="difficulty" name="difficulty" defaultValue={resource?.difficulty ?? ""} className={SELECT_CLASSES}>
            <option value="">None</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Access level" htmlFor="access_level">
          <select
            id="access_level"
            name="access_level"
            defaultValue={resource?.required_capability ? "member" : "public"}
            className={SELECT_CLASSES}
          >
            <option value="public">Public — anyone</option>
            <option value="member">Member — requires membership</option>
          </select>
        </Field>
        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={resource?.status ?? "draft"} className={SELECT_CLASSES}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Publish at (optional)" htmlFor="publish_at">
          <Input id="publish_at" name="publish_at" type="datetime-local" defaultValue={publishLocal} />
        </Field>
      </div>

      <div className="grid grid-cols-2 items-end gap-4">
        <Field label="Tags (comma-separated)" htmlFor="tags">
          <Input id="tags" name="tags" defaultValue={tagNames?.join(", ")} placeholder="ChatGPT, Local SEO, Meta Ads" />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={resource?.featured} /> Featured
        </label>
      </div>

      <MetaFields type={type} meta={resource?.meta ?? {}} />

      <Field label="Content">
        <BlockEditor initial={resource?.content ?? []} />
      </Field>

      <div className="flex gap-2">
        <SubmitButton>Save</SubmitButton>
      </div>
    </form>
  );
}
