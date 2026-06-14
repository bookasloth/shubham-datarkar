"use client";

import * as React from "react";
import { File, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dropzone({
  onFiles,
  hint = "PNG, JPG or PDF, up to 10MB",
  className,
}: {
  onFiles?: (files: File[]) => void;
  hint?: string;
  className?: string;
}) {
  const [over, setOver] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    setFiles(next);
    onFiles?.(next);
  }

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
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
          "flex w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed px-6 py-10 text-center transition-ui",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          over ? "border-foreground bg-accent" : "border-border hover:bg-accent/50",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">
          Drag & drop, or <span className="underline">browse</span>
        </span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => add(e.target.files)}
        aria-hidden
      />
      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-input border border-border px-3 py-2 text-sm">
              <File className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => {
                  const next = files.filter((_, idx) => idx !== i);
                  setFiles(next);
                  onFiles?.(next);
                }}
                aria-label={`Remove ${f.name}`}
                className="text-muted-foreground hover:text-foreground"
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
