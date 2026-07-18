"use client";

import { useRef, useState, useTransition } from "react";
import { uploadAvatar, removeAvatar } from "@/lib/members/avatar-actions";
import { validateImageFile, ALLOWED_IMAGE_TYPES } from "@/lib/media/image-upload";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { Button } from "@/components/ui/button";

export function AvatarUploader({ seed, current }: { seed: string; current: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(file: File) {
    const invalid = validateImageFile(file); // client-side fast feedback; server re-checks
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    const fd = new FormData();
    fd.set("avatar", file);
    start(async () => {
      const res = await uploadAvatar(fd);
      if ("ok" in res) {
        // Server stored a fresh URL; keep showing the local preview until reload.
        setSaved(localPreview);
      } else {
        setError(res.error);
        setPreview(null);
      }
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await removeAvatar();
      if ("ok" in res) {
        setSaved(null);
        setPreview(null);
      } else {
        setError(res.error);
      }
    });
  }

  const shown = preview ?? saved;

  return (
    <div className="flex items-center gap-4">
      <CommunityAvatar seed={seed} src={shown} size={64} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={pending}
            onClick={() => inputRef.current?.click()}
          >
            {saved ? "Change photo" : "Upload photo"}
          </Button>
          {saved && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={remove}>
              Remove
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={[...ALLOWED_IMAGE_TYPES].join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
        {error && <p className="text-danger text-xs">{error}</p>}
        <p className="text-muted-foreground text-xs">JPG, PNG, WebP, GIF, or AVIF. Under 5MB.</p>
      </div>
    </div>
  );
}
