"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { validateImageFile, imageExt } from "@/lib/media/image-upload";
import {
  PLATFORMS,
  CATEGORIES,
  MOODS,
  detectPlatform,
  type Platform,
  type Playlist,
} from "@/lib/playlists/types";
import {
  createPlaylist,
  updatePlaylist,
  autofillFromUrl,
  createCoverUploadTarget,
  finalizeCoverUpload,
  type PlaylistInput,
} from "@/lib/playlists/actions";

const SELECT = "rounded-btn border border-border bg-background px-2 py-2 text-sm";
const TEXTAREA = "w-full rounded-btn border border-border bg-background p-2 text-sm";

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/** PUT a cover file straight to Supabase via a signed URL. */
async function putSigned(signedUrl: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", file);
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      ...(anon ? { apikey: anon, authorization: `Bearer ${anon}` } : {}),
      "x-upsert": "false",
    },
    body: form,
  });
  if (!res.ok) throw new Error(`Storage returned ${res.status}`);
}

export function PlaylistEditor({ mode, playlist }: { mode: "create" | "edit"; playlist?: Playlist }) {
  const router = useRouter();
  const { toast } = useToast();

  const [externalUrl, setExternalUrl] = React.useState(playlist?.externalUrl ?? "");
  const [title, setTitle] = React.useState(playlist?.title ?? "");
  const [description, setDescription] = React.useState(playlist?.description ?? "");
  const [platform, setPlatform] = React.useState<Platform>(playlist?.platform ?? "other");
  const [creatorName, setCreatorName] = React.useState(playlist?.creatorName ?? "");
  const [category, setCategory] = React.useState(playlist?.category ?? "");
  const [mood, setMood] = React.useState(playlist?.mood ?? "");
  const [coverUrl, setCoverUrl] = React.useState(playlist?.coverUrl ?? "");
  const [storagePath, setStoragePath] = React.useState<string | null>(playlist?.storagePath ?? null);
  const [allowEmbed, setAllowEmbed] = React.useState(playlist?.allowEmbed ?? true);
  const [isFeatured, setIsFeatured] = React.useState(playlist?.isFeatured ?? false);
  const [isPublished, setIsPublished] = React.useState(playlist?.isPublished ?? false);
  const [position, setPosition] = React.useState(playlist?.position?.toString() ?? "0");

  const [autofilling, setAutofilling] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function onUrlChange(v: string) {
    setExternalUrl(v);
    if (v.trim()) setPlatform(detectPlatform(v.trim()));
  }

  async function autofill() {
    if (!externalUrl.trim()) {
      toast({ title: "Paste a playlist URL first.", variant: "danger" });
      return;
    }
    setAutofilling(true);
    const res = await autofillFromUrl(externalUrl.trim());
    setAutofilling(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    setPlatform(res.platform);
    if (res.title && !title.trim()) setTitle(res.title);
    if (res.creatorName && !creatorName.trim()) setCreatorName(res.creatorName);
    if (res.coverUrl) {
      setCoverUrl(res.coverUrl);
      setStoragePath(res.storagePath);
    }
    const gotMeta = res.title || res.coverUrl || res.creatorName;
    toast({
      title: gotMeta ? "Details filled from the link" : "Platform detected — enter details manually",
      description: gotMeta ? "Edit anything before saving." : undefined,
      variant: gotMeta ? "success" : "warning",
    });
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      toast({ title: invalid, variant: "danger" });
      return;
    }
    setUploading(true);
    try {
      const target = await createCoverUploadTarget({ ext: imageExt(file), contentType: file.type });
      if ("error" in target) throw new Error(target.error);
      await putSigned(target.signedUrl, file);
      const done = await finalizeCoverUpload({ path: target.path });
      if ("error" in done) throw new Error(done.error);
      setCoverUrl(done.coverUrl);
      setStoragePath(done.storagePath);
      toast({ title: "Cover uploaded", variant: "success" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Upload failed.", variant: "danger" });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!title.trim()) {
      toast({ title: "Give the playlist a title.", variant: "danger" });
      return;
    }
    if (!externalUrl.trim()) {
      toast({ title: "Enter the playlist URL.", variant: "danger" });
      return;
    }
    setSaving(true);
    const input: PlaylistInput = {
      title,
      description,
      platform,
      externalUrl,
      allowEmbed,
      coverUrl,
      storagePath,
      creatorName,
      category,
      mood,
      isFeatured,
      isPublished,
      position: position ? Number(position) : 0,
    };
    const res = mode === "create" ? await createPlaylist(input) : await updatePlaylist(playlist!.id, input);
    setSaving(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    toast({ title: mode === "create" ? "Playlist created" : "Saved", variant: "success" });
    router.push("/admin/playlists");
    router.refresh();
  }

  return (
    <div className="grid max-w-3xl gap-6">
      {/* Link + autofill */}
      <fieldset className="grid gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Playlist link</legend>
        <Field label="Playlist URL" htmlFor="url">
          <div className="flex gap-2">
            <Input
              id="url"
              value={externalUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://open.spotify.com/playlist/…"
            />
            <Button type="button" variant="secondary" onClick={autofill} loading={autofilling}>
              <Sparkles /> Autofill
            </Button>
          </div>
        </Field>
        <Field label="Platform" htmlFor="platform">
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className={SELECT}
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowEmbed} onChange={(e) => setAllowEmbed(e.target.checked)} />
          Show the embedded player on the detail page (Spotify / Apple / YouTube)
        </label>
      </fieldset>

      {/* Details */}
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Details</legend>
        <Field label="Title" htmlFor="title">
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Description" htmlFor="desc">
          <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className={TEXTAREA} rows={3} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Creator" htmlFor="creator">
            <Input id="creator" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} />
          </Field>
          <Field label="Category" htmlFor="category">
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT}>
              <option value="">— none —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Mood" htmlFor="mood">
            <select id="mood" value={mood} onChange={(e) => setMood(e.target.value)} className={SELECT}>
              <option value="">— none —</option>
              {MOODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      {/* Cover */}
      <fieldset className="grid gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Cover art</legend>
        <div className="flex items-start gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-img border border-border bg-muted">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                No cover
              </span>
            )}
          </div>
          <div className="grid flex-1 gap-2">
            <div className="flex gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-btn border border-border bg-background px-3 text-xs font-medium transition-ui hover:bg-accent [&_svg]:size-3.5 aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={uploading}>
                <Upload /> {uploading ? "Uploading…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={onCoverFile} disabled={uploading} />
              </label>
              {coverUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCoverUrl("");
                    setStoragePath(null);
                  }}
                >
                  <X /> Remove
                </Button>
              )}
            </div>
            <Field label="…or paste a cover image URL" htmlFor="coverurl">
              <Input
                id="coverurl"
                value={coverUrl}
                onChange={(e) => {
                  setCoverUrl(e.target.value);
                  setStoragePath(null);
                }}
                placeholder="https://…"
              />
            </Field>
          </div>
        </div>
      </fieldset>

      {/* Visibility */}
      <fieldset className="grid gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Visibility & order</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Publish (show on /playlists)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Feature (large placement at the top)
        </label>
        <Field label="Position (lower shows first)" htmlFor="pos">
          <Input id="pos" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} className="max-w-32" />
        </Field>
      </fieldset>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={save} loading={saving}>
          {mode === "create" ? "Create playlist" : "Save changes"}
        </Button>
        {playlist && (
          <Button type="button" variant="outline" asChild>
            <Link href={`/playlists/${playlist.slug}`} target="_blank">Preview</Link>
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/playlists")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
