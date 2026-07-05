"use client";

import * as React from "react";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditorPhoto = {
  cloudinaryPublicId: string;
  title: string;
  description: string | null;
  tags: string[];
  sortOrder: number;
  published: boolean;
};

const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function PhotoEditor({
  action,
  photo,
}: {
  action: (formData: FormData) => void | Promise<void>;
  photo?: EditorPhoto;
}) {
  const [publicId, setPublicId] = React.useState(photo?.cloudinaryPublicId ?? "");

  return (
    <form action={action} className="grid max-w-3xl gap-5">
      <div className="grid gap-1.5">
        <Label>Image</Label>
        {/* Hidden field carries the uploaded Cloudinary public_id to the action. */}
        <input type="hidden" name="cloudinary_public_id" value={publicId} required />

        {publicId ? (
          <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-card border border-border bg-muted">
            <CldImage
              src={publicId}
              alt="Selected photo preview"
              fill
              sizes="384px"
              crop="fill"
              gravity="auto"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[4/3] w-full max-w-sm items-center justify-center rounded-card border border-dashed border-border bg-muted text-sm text-muted-foreground">
            No image selected
          </div>
        )}

        <CldUploadWidget
          uploadPreset={UPLOAD_PRESET}
          // Restrict to local-file upload. Other sources (Google Drive, Unsplash,
          // etc.) load extra iframe content that a fresh/free Cloudinary account
          // may not have provisioned, which surfaces as a "server error" in the
          // widget even though the upload itself succeeds.
          options={{ sources: ["local"], multiple: false, maxFiles: 1 }}
          onSuccess={(result) => {
            const info = result?.info;
            if (info && typeof info === "object" && "public_id" in info) {
              setPublicId(String(info.public_id));
            }
          }}
          onError={(error) => {
            // Don't let a widget-side error bubble up as an unhandled failure;
            // the upload may still succeed. Log for diagnosis instead.
            console.error("[photos] Cloudinary upload widget error:", error);
          }}
        >
          {({ open }) => (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => open()}>
                {publicId ? "Replace image" : "Upload image"}
              </Button>
              {publicId ? (
                <span className="truncate text-xs text-muted-foreground">{publicId}</span>
              ) : null}
            </div>
          )}
        </CldUploadWidget>
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
