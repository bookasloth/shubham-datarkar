"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { AdminButton, StatusBadge } from "@/components/admin";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { GalleryAlbum } from "@/lib/gallery/types";
import {
  createAlbum, deleteAlbum, reorderAlbums, setAlbumPublished, updateAlbum,
} from "@/lib/gallery/actions";

export function AlbumManager({
  albums,
  setAlbums,
}: {
  albums: GalleryAlbum[];
  setAlbums: React.Dispatch<React.SetStateAction<GalleryAlbum[]>>;
}) {
  const { toast } = useToast();
  const [dialog, setDialog] = React.useState<{ mode: "new" } | { mode: "edit"; album: GalleryAlbum } | null>(null);

  const submit = async (fd: FormData) => {
    if (!dialog) return;
    if (dialog.mode === "new") {
      const result = await createAlbum(fd);
      if ("error" in result) {
        toast({ title: "Could not create album", description: result.error, variant: "danger" });
        return;
      }
      setAlbums((prev) => [...prev, result.album]);
      toast({ title: "Album created", variant: "success" });
    } else {
      const { album } = dialog;
      const patch = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
      };
      const before = albums;
      setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, ...patch } : a)));
      const result = await updateAlbum(album.id, fd);
      if ("error" in result) {
        setAlbums(before);
        toast({ title: "Save failed", description: result.error, variant: "danger" });
      }
    }
    setDialog(null);
  };

  const togglePublished = async (album: GalleryAlbum) => {
    const next = !album.isPublished;
    setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, isPublished: next } : a)));
    const result = await setAlbumPublished(album.id, next);
    if ("error" in result) {
      setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, isPublished: album.isPublished } : a)));
      toast({ title: "Could not update visibility", description: result.error, variant: "danger" });
    }
  };

  const remove = async (album: GalleryAlbum) => {
    if (!window.confirm(`Delete "${album.title}"? Its photos stay, just unfiled.`)) return;
    const before = albums;
    setAlbums((prev) => prev.filter((a) => a.id !== album.id));
    const result = await deleteAlbum(album.id);
    if ("error" in result) {
      setAlbums(before);
      toast({ title: "Delete failed", description: result.error, variant: "danger" });
    } else {
      toast({ title: "Album deleted", variant: "success" });
    }
  };

  const move = async (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= albums.length) return;
    const before = albums;
    const next = [...albums];
    [next[index], next[to]] = [next[to], next[index]];
    setAlbums(next);
    const result = await reorderAlbums(next.map((a) => a.id));
    if ("error" in result) {
      setAlbums(before);
      toast({ title: "Reorder failed", description: result.error, variant: "danger" });
    }
  };

  return (
    <section className="rounded-card border border-admin-border bg-admin-surface">
      <header className="flex items-center justify-between gap-3 border-b border-admin-border p-4">
        <div>
          <h2 className="text-sm font-semibold text-admin-text">Albums</h2>
          <p className="text-xs text-admin-text-muted">Group photos into named collections.</p>
        </div>
        <AdminButton size="sm" onClick={() => setDialog({ mode: "new" })}>
          <Plus /> New album
        </AdminButton>
      </header>

      {albums.length === 0 ? (
        <p className="p-4 text-sm text-admin-text-muted">No albums yet.</p>
      ) : (
        <ul className="divide-y divide-admin-border">
          {albums.map((album, index) => (
            <li key={album.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-admin-text">{album.title}</span>
                  {!album.isPublished && <StatusBadge tone="warning">Hidden</StatusBadge>}
                </div>
                <span className="text-xs text-admin-text-muted">/gallery/{album.slug}</span>
              </div>
              <div className="flex items-center gap-1">
                <AdminButton size="icon" variant="ghost" aria-label="Move up" title="Move up" disabled={index === 0} onClick={() => void move(index, -1)}>
                  <ArrowUp />
                </AdminButton>
                <AdminButton size="icon" variant="ghost" aria-label="Move down" title="Move down" disabled={index === albums.length - 1} onClick={() => void move(index, 1)}>
                  <ArrowDown />
                </AdminButton>
                <AdminButton
                  size="icon"
                  variant="ghost"
                  aria-label={album.isPublished ? "Hide album" : "Publish album"}
                  title={album.isPublished ? "Hide" : "Publish"}
                  onClick={() => void togglePublished(album)}
                >
                  {album.isPublished ? <Eye /> : <EyeOff />}
                </AdminButton>
                <AdminButton size="icon" variant="ghost" aria-label="Edit album" title="Edit" onClick={() => setDialog({ mode: "edit", album })}>
                  <Pencil />
                </AdminButton>
                <AdminButton size="icon" variant="ghost" aria-label="Delete album" title="Delete" className="text-admin-danger" onClick={() => void remove(album)}>
                  <Trash2 />
                </AdminButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          {dialog && (
            <form action={(fd) => void submit(fd)} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{dialog.mode === "new" ? "New album" : "Edit album"}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="album-title">Title</Label>
                <Input
                  id="album-title"
                  name="title"
                  required
                  maxLength={300}
                  defaultValue={dialog.mode === "edit" ? dialog.album.title : ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="album-description">Description</Label>
                <Textarea
                  id="album-description"
                  name="description"
                  rows={2}
                  maxLength={2000}
                  defaultValue={dialog.mode === "edit" ? dialog.album.description ?? "" : ""}
                />
              </div>
              <DialogFooter>
                <AdminButton type="button" variant="secondary" onClick={() => setDialog(null)}>
                  Cancel
                </AdminButton>
                <AdminButton type="submit">{dialog.mode === "new" ? "Create" : "Save"}</AdminButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
