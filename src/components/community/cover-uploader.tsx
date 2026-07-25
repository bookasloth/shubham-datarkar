"use client";

import { useRef, useState, useTransition } from "react";
import { uploadCover, removeCover } from "@/lib/members/profile-actions";
import { validateImageFile, ALLOWED_IMAGE_TYPES } from "@/lib/media/image-upload";
import { Button } from "@/components/ui/button";

export function CoverUploader({ current }: { current: string | null }) {
  const [saved, setSaved] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) return setError(invalid);
    setError(null);
    const fd = new FormData();
    fd.set("cover", file);
    start(async () => {
      const res = await uploadCover(fd);
      if ("ok" in res) setSaved(URL.createObjectURL(file));
      else setError(res.error);
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await removeCover();
      if ("ok" in res) setSaved(null);
      else setError(res.error);
    });
  }

  return (
    <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" loading={pending} onClick={() => inputRef.current?.click()}>
          {saved ? "Change cover" : "Add cover"}
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
      {error && <p className="rounded bg-background/90 px-2 py-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
