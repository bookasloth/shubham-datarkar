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
