"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FolderPlus, Images, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { AdminButton, StatusBadge } from "@/components/admin";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { GalleryAlbum, GalleryImage } from "@/lib/gallery/types";
import { createAlbum } from "@/lib/gallery/actions";

/** Cover URL + count for an album, computed from the full image list. */
function summarize(albumId: string | null, images: GalleryImage[], coverImageId?: string | null) {
  const members = images.filter((i) => i.albumId === albumId);
  const cover =
    (coverImageId && members.find((i) => i.id === coverImageId)?.imageUrl) ||
    members[0]?.imageUrl ||
    null;
  return { count: members.length, cover };
}

export function GalleryAlbumsIndex({
  albums,
  images,
}: {
  albums: GalleryAlbum[];
  images: GalleryImage[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = React.useState(false);

  const unfiled = summarize(null, images);

  const submit = async (fd: FormData) => {
    const result = await createAlbum(fd);
    if ("error" in result) {
      toast({ title: "Could not create album", description: result.error, variant: "danger" });
      return;
    }
    setCreating(false);
    toast({ title: "Album created", variant: "success" });
    // Drop the admin straight into the new album to start dropping photos.
    router.push(`/admin/gallery/${result.album.slug}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-admin-text-muted">
          Open an album to drag &amp; drop photos into it.
        </p>
        <AdminButton size="sm" onClick={() => setCreating(true)}>
          <FolderPlus /> New album
        </AdminButton>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {albums.map((album) => {
          const { count, cover } = summarize(album.id, images, album.coverImageId);
          return (
            <li key={album.id}>
              <FolderCard
                href={`/admin/gallery/${album.slug}`}
                title={album.title}
                count={count}
                cover={cover}
                hidden={!album.isPublished}
              />
            </li>
          );
        })}

        {unfiled.count > 0 && (
          <li>
            <FolderCard
              href="/admin/gallery/unfiled"
              title="Unfiled"
              count={unfiled.count}
              cover={unfiled.cover}
              muted
            />
          </li>
        )}
      </ul>

      {albums.length === 0 && unfiled.count === 0 && (
        <div className="rounded-card border border-dashed border-admin-border p-10 text-center">
          <Images className="mx-auto size-6 text-admin-text-muted" aria-hidden />
          <p className="mt-2 text-sm font-medium">No albums yet</p>
          <p className="text-xs text-admin-text-muted">Create an album, then drop photos inside it.</p>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <form action={(fd) => void submit(fd)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>New album</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="album-title">Title</Label>
              <Input id="album-title" name="title" required maxLength={300} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="album-description">Description</Label>
              <Textarea id="album-description" name="description" rows={2} maxLength={2000} />
            </div>
            <DialogFooter>
              <AdminButton type="button" variant="secondary" onClick={() => setCreating(false)}>
                Cancel
              </AdminButton>
              <AdminButton type="submit">Create</AdminButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderCard({
  href,
  title,
  count,
  cover,
  hidden,
  muted,
}: {
  href: string;
  title: string;
  count: number;
  cover: string | null;
  hidden?: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-card border border-admin-border bg-admin-surface transition-colors hover:border-admin-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
    >
      <div className="relative aspect-[4/3] bg-admin-surface-hover">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={cn("object-cover", muted && "opacity-70")}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="size-6 text-admin-text-muted" aria-hidden />
          </div>
        )}
        {hidden && <StatusBadge tone="warning" className="absolute left-2 top-2">Hidden</StatusBadge>}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="truncate text-sm font-medium text-admin-text" title={title}>{title}</span>
        <span className="shrink-0 text-xs text-admin-text-muted">{count}</span>
      </div>
    </Link>
  );
}
