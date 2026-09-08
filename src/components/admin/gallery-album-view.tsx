"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Pencil, Star,
  Trash2, UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { AdminButton, AdminEmptyState, StatusBadge } from "@/components/admin";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MAX_IMAGE_BYTES } from "@/lib/media/image-upload";
import type { GalleryAlbum, GalleryImage } from "@/lib/gallery/types";
import {
  assignImagesToAlbum, deleteAlbum, deleteGalleryImage, reorderGalleryImages,
  setAlbumCover, setAlbumPublished, setGalleryPublished, updateAlbum,
  updateGalleryImage,
} from "@/lib/gallery/actions";
import { useGalleryUploader, UploadDock } from "./gallery-uploader";

/**
 * One album's contents (or the "Unfiled" bucket when `album` is null): a
 * drag-&-drop dropzone that uploads straight into this album, plus its photos.
 */
export function GalleryAlbumView({
  album: initialAlbum,
  initialImages,
  albums,
}: {
  album: GalleryAlbum | null;
  initialImages: GalleryImage[];
  albums: GalleryAlbum[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [album, setAlbum] = React.useState(initialAlbum);
  const [items, setItems] = React.useState<GalleryImage[]>(initialImages);
  const [editing, setEditing] = React.useState<GalleryImage | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const albumId = album?.id ?? null;
  const otherAlbums = albums.filter((a) => a.id !== albumId);

  // --- upload (direct-to-storage, targets this album) ----------------------

  const addUploaded = React.useCallback((image: GalleryImage) => {
    setItems((prev) => [...prev, image]);
  }, []);
  const uploader = useGalleryUploader({ albumId, onUploaded: addUploaded });

  // --- optimistic image mutations ------------------------------------------

  const togglePublished = async (image: GalleryImage) => {
    const next = !image.isPublished;
    setItems((prev) => prev.map((i) => (i.id === image.id ? { ...i, isPublished: next } : i)));
    const result = await setGalleryPublished(image.id, next);
    if ("error" in result) {
      setItems((prev) => prev.map((i) => (i.id === image.id ? { ...i, isPublished: image.isPublished } : i)));
      toast({ title: "Could not update visibility", description: result.error, variant: "danger" });
    }
  };

  const remove = async (image: GalleryImage) => {
    if (!window.confirm("Delete this image? This cannot be undone.")) return;
    const before = items;
    setItems((prev) => prev.filter((i) => i.id !== image.id));
    const result = await deleteGalleryImage(image.id);
    if ("error" in result) {
      setItems(before);
      toast({ title: "Delete failed", description: result.error, variant: "danger" });
    } else {
      toast({ title: "Image deleted", variant: "success" });
    }
  };

  const move = async (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    const before = items;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    setItems(next);
    const result = await reorderGalleryImages(next.map((i) => i.id));
    if ("error" in result) {
      setItems(before);
      toast({ title: "Reorder failed", description: result.error, variant: "danger" });
    }
  };

  // Move to a different album (or out to unfiled) — leaves this view.
  const moveToAlbum = async (image: GalleryImage, targetId: string | null) => {
    if (targetId === albumId) return;
    const before = items;
    setItems((prev) => prev.filter((i) => i.id !== image.id));
    const result = await assignImagesToAlbum([image.id], targetId);
    if ("error" in result) {
      setItems(before);
      toast({ title: "Could not move image", description: result.error, variant: "danger" });
    } else {
      toast({ title: "Moved", variant: "success" });
    }
  };

  const makeCover = async (image: GalleryImage) => {
    if (!album) return;
    const before = album;
    setAlbum({ ...album, coverImageId: image.id });
    const result = await setAlbumCover(album.id, image.id);
    if ("error" in result) {
      setAlbum(before);
      toast({ title: "Could not set cover", description: result.error, variant: "danger" });
    } else {
      toast({ title: "Cover updated", variant: "success" });
    }
  };

  const saveEdit = async (image: GalleryImage, fd: FormData) => {
    const patch = {
      caption: String(fd.get("caption") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      location: String(fd.get("location") ?? "").trim() || null,
      photographer: String(fd.get("photographer") ?? "").trim() || null,
    };
    const before = items;
    setItems((prev) => prev.map((i) => (i.id === image.id ? { ...i, ...patch } : i)));
    setEditing(null);
    const result = await updateGalleryImage(image.id, fd);
    if ("error" in result) {
      setItems(before);
      toast({ title: "Save failed", description: result.error, variant: "danger" });
    } else {
      toast({ title: "Details saved", variant: "success" });
    }
  };

  // --- album mutations ------------------------------------------------------

  const toggleAlbumPublished = async () => {
    if (!album) return;
    const next = !album.isPublished;
    const before = album;
    setAlbum({ ...album, isPublished: next });
    const result = await setAlbumPublished(album.id, next);
    if ("error" in result) {
      setAlbum(before);
      toast({ title: "Could not update visibility", description: result.error, variant: "danger" });
    }
  };

  const saveAlbum = async (fd: FormData) => {
    if (!album) return;
    const patch = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
    };
    if (!patch.title) return;
    const before = album;
    setAlbum({ ...album, ...patch });
    setSettingsOpen(false);
    const result = await updateAlbum(album.id, fd);
    if ("error" in result) {
      setAlbum(before);
      toast({ title: "Save failed", description: result.error, variant: "danger" });
    } else {
      toast({ title: "Album saved", variant: "success" });
      router.refresh(); // slug may have changed with the title
    }
  };

  const removeAlbum = async () => {
    if (!album) return;
    if (!window.confirm(`Delete "${album.title}"? Its photos stay, just unfiled.`)) return;
    const result = await deleteAlbum(album.id);
    if ("error" in result) {
      toast({ title: "Delete failed", description: result.error, variant: "danger" });
    } else {
      toast({ title: "Album deleted", variant: "success" });
      router.push("/admin/gallery");
    }
  };

  // --- render ---------------------------------------------------------------

  const title = album?.title ?? "Unfiled";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/gallery"
            className="inline-flex items-center gap-1 text-xs text-admin-text-muted hover:text-admin-text"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> Gallery
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-admin-text">{title}</h1>
            {album && !album.isPublished && <StatusBadge tone="warning">Hidden</StatusBadge>}
          </div>
          {album?.description && (
            <p className="mt-1 text-sm text-admin-text-muted">{album.description}</p>
          )}
        </div>
        {album && (
          <div className="flex shrink-0 items-center gap-2">
            <AdminButton size="sm" variant="secondary" onClick={() => void toggleAlbumPublished()}>
              {album.isPublished ? <EyeOff /> : <Eye />}
              {album.isPublished ? "Hide" : "Publish"}
            </AdminButton>
            <AdminButton size="sm" variant="secondary" onClick={() => setSettingsOpen(true)}>
              <Pencil /> Rename
            </AdminButton>
            <AdminButton size="sm" variant="ghost" className="text-admin-danger" onClick={() => void removeAlbum()}>
              <Trash2 /> Delete
            </AdminButton>
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploader.addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-card border border-dashed transition-[border-color,background-color] duration-150",
          dragOver ? "border-admin-accent bg-admin-surface-hover" : "border-admin-border",
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 px-6 py-10 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
        >
          <UploadCloud className="size-6 text-admin-text-muted" aria-hidden />
          <span className="text-sm font-medium">
            Drag &amp; drop photos into <span className="font-semibold">{title}</span>, or{" "}
            <span className="underline">browse</span>
          </span>
          <span className="text-xs text-admin-text-muted">
            JPG, PNG, WebP, GIF or AVIF — up to {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB each
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="sr-only"
          aria-hidden
          onChange={(e) => {
            void uploader.addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length === 0 ? (
        <AdminEmptyState
          title="No photos here yet"
          description="Drag photos onto the box above to fill this album."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((image, index) => {
            const isCover = album?.coverImageId === image.id;
            return (
              <li
                key={image.id}
                className="group overflow-hidden rounded-card border border-admin-border bg-admin-surface"
              >
                <div className="relative aspect-[4/3] bg-admin-surface-hover">
                  <Image
                    src={image.imageUrl}
                    alt={image.caption || ""}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className={cn("object-cover", !image.isPublished && "opacity-50")}
                  />
                  {!image.isPublished && (
                    <StatusBadge tone="warning" className="absolute left-2 top-2">Hidden</StatusBadge>
                  )}
                  {isCover && (
                    <StatusBadge tone="success" className="absolute right-2 top-2">Cover</StatusBadge>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <p className="min-h-5 truncate text-sm" title={image.caption}>
                    {image.caption || <span className="text-admin-text-muted">No caption</span>}
                  </p>
                  <label className="sr-only" htmlFor={`move-${image.id}`}>Move to album</label>
                  <select
                    id={`move-${image.id}`}
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) void moveToAlbum(image, v === "__unfiled" ? null : v);
                    }}
                    className="h-8 w-full rounded-input border border-admin-border bg-admin-surface px-2 text-xs text-admin-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
                  >
                    <option value="">Move to…</option>
                    {albumId && <option value="__unfiled">Unfiled</option>}
                    {otherAlbums.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <AdminButton
                      size="icon"
                      variant="ghost"
                      aria-label={image.isPublished ? "Hide image" : "Publish image"}
                      title={image.isPublished ? "Hide" : "Publish"}
                      onClick={() => void togglePublished(image)}
                    >
                      {image.isPublished ? <Eye /> : <EyeOff />}
                    </AdminButton>
                    {album && (
                      <AdminButton
                        size="icon"
                        variant="ghost"
                        aria-label="Set as album cover"
                        title={isCover ? "Album cover" : "Set as cover"}
                        className={cn(isCover && "text-admin-accent")}
                        onClick={() => void makeCover(image)}
                      >
                        <Star className={cn(isCover && "fill-current")} />
                      </AdminButton>
                    )}
                    <AdminButton
                      size="icon"
                      variant="ghost"
                      aria-label="Edit details"
                      title="Edit"
                      onClick={() => setEditing(image)}
                    >
                      <Pencil />
                    </AdminButton>
                    <AdminButton
                      size="icon"
                      variant="ghost"
                      aria-label="Move up"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => void move(index, -1)}
                    >
                      <ArrowUp />
                    </AdminButton>
                    <AdminButton
                      size="icon"
                      variant="ghost"
                      aria-label="Move down"
                      title="Move down"
                      disabled={index === items.length - 1}
                      onClick={() => void move(index, 1)}
                    >
                      <ArrowDown />
                    </AdminButton>
                    <AdminButton
                      size="icon"
                      variant="ghost"
                      aria-label="Delete image"
                      title="Delete"
                      className="ml-auto text-admin-danger"
                      onClick={() => void remove(image)}
                    >
                      <Trash2 />
                    </AdminButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Edit image details */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <form action={(fd) => void saveEdit(editing, fd)} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Edit image</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gallery-caption">Caption</Label>
                <Input id="gallery-caption" name="caption" defaultValue={editing.caption} maxLength={300} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gallery-description">Description</Label>
                <Textarea
                  id="gallery-description"
                  name="description"
                  defaultValue={editing.description ?? ""}
                  maxLength={2000}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gallery-location">Location</Label>
                  <Input id="gallery-location" name="location" defaultValue={editing.location ?? ""} maxLength={300} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gallery-photographer">Photographer</Label>
                  <Input
                    id="gallery-photographer"
                    name="photographer"
                    defaultValue={editing.photographer ?? ""}
                    maxLength={300}
                  />
                </div>
              </div>
              <DialogFooter>
                <AdminButton type="button" variant="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </AdminButton>
                <AdminButton type="submit">Save</AdminButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Album settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          {album && (
            <form action={(fd) => void saveAlbum(fd)} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Album settings</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="album-title">Title</Label>
                <Input id="album-title" name="title" required maxLength={300} defaultValue={album.title} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="album-description">Description</Label>
                <Textarea
                  id="album-description"
                  name="description"
                  rows={2}
                  maxLength={2000}
                  defaultValue={album.description ?? ""}
                />
              </div>
              <DialogFooter>
                <AdminButton type="button" variant="secondary" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </AdminButton>
                <AdminButton type="submit">Save</AdminButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <UploadDock
        items={uploader.items}
        onRetry={uploader.retry}
        onDismiss={uploader.dismiss}
        onClearFinished={uploader.clearFinished}
      />
    </div>
  );
}
