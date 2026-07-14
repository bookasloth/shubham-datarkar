"use client";

import * as React from "react";
import { File, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dropzone({
  onFiles,
  hint = "PNG, JPG or PDF, up to 10MB",
  className,
  name,
  accept,
}: {
  onFiles?: (files: File[]) => void;
  hint?: string;
  className?: string;
  /** When set, the internal input carries this name and submits the current
   *  files inside a form — dropped files included. */
  name?: string;
  accept?: string;
}) {
  const [over, setOver] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  // Parallel to `files`: an object URL for images, null for everything else.
  const [previews, setPreviews] = React.useState<(string | null)[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // A <input type=file> only receives click-browsed files natively; dropped
  // files live in React state. Mirror state → input.files so a form submit
  // sends whatever the list currently shows.
  React.useEffect(() => {
    if (!name || !inputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }, [files, name]);

  // Object URLs are an external resource, so they're minted here where the
  // cleanup can revoke them. A useMemo would leak them, and would hand back
  // already-revoked URLs under StrictMode's double-invoke.
  React.useEffect(() => {
    const next = files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(next);
    return () => next.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    setFiles(next);
    onFiles?.(next);
  }

  function remove(i: number) {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    onFiles?.(next);
  }

  const browse = () => inputRef.current?.click();
  const hasPreview = previews.some(Boolean);
  // Anything without a thumbnail (PDFs et al) still lists by name.
  const named = files.map((f, i) => ({ f, i })).filter(({ i }) => !previews[i]);

  return (
    <div className={cn("w-full", className)}>
      {/* A div, not a button: each thumbnail carries its own remove button, and
          those can't legally nest inside one. The drop handlers sit here so a
          drop anywhere in the box — thumbnails included — still registers. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "w-full rounded-card border border-dashed transition-ui",
          over ? "border-foreground bg-accent" : "border-border",
        )}
      >
        {hasPreview ? (
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {files.map((f, i) =>
                previews[i] ? (
                  <div
                    key={`${f.name}-${i}`}
                    className="relative aspect-square overflow-hidden rounded-input border border-border bg-muted"
                  >
                    {/* Blob URL of a local file: next/image would only add a
                        loader round-trip it can't optimise anyway. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews[i]!} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove ${f.name}`}
                      className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground shadow-sm transition-ui hover:bg-background"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : null,
              )}
            </div>
            <button
              type="button"
              onClick={browse}
              className="mt-2 w-full rounded-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
            >
              Drag &amp; drop, or <span className="underline">browse</span> to add more
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={browse}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-card px-6 py-10 text-center transition-ui",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              !over && "hover:bg-accent/50",
            )}
          >
            <UploadCloud className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">
              Drag &amp; drop, or <span className="underline">browse</span>
            </span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple
        className="sr-only"
        onChange={(e) => add(e.target.files)}
        aria-hidden
      />
      {named.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {named.map(({ f, i }) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-3 rounded-input border border-border px-3 py-2 text-sm"
            >
              <File className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${f.name}`}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
