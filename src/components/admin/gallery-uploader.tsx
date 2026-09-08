"use client";

import * as React from "react";
import { CheckCircle2, ChevronDown, RotateCw, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateImageFile } from "@/lib/media/image-upload";
import type { GalleryImage } from "@/lib/gallery/types";
import { createGalleryUploadTarget, finalizeGalleryUpload } from "@/lib/gallery/actions";

export type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  progress: number; // 0..1 (upload fraction)
  status: "uploading" | "finalizing" | "done" | "error";
  error?: string;
};

async function readDimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dims;
}

function ext(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()! : "bin";
}

/** PUT the file straight to Supabase via the signed URL, reporting progress. */
function putWithProgress(signedUrl: string, file: File, onProgress: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file); // supabase signed-upload expects the file under the empty field
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) {
      xhr.setRequestHeader("apikey", anon);
      xhr.setRequestHeader("authorization", `Bearer ${anon}`);
    }
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage returned ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

/**
 * Direct-to-Supabase uploader with real progress. `addFiles` drops files into
 * the queue; each uploads straight to storage, then a row is recorded and
 * handed back through `onUploaded`.
 */
export function useGalleryUploader({
  albumId,
  onUploaded,
}: {
  albumId: string | null;
  onUploaded: (image: GalleryImage) => void;
}) {
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const counter = React.useRef(0);

  const patch = React.useCallback((id: string, next: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
  }, []);

  const run = React.useCallback(
    async (item: QueueItem) => {
      try {
        const target = await createGalleryUploadTarget({ ext: ext(item.file), contentType: item.file.type });
        if ("error" in target) {
          patch(item.id, { status: "error", error: target.error });
          return;
        }
        patch(item.id, { status: "uploading", progress: 0 });
        await putWithProgress(target.signedUrl, item.file, (f) => patch(item.id, { progress: f }));

        patch(item.id, { status: "finalizing", progress: 1 });
        const done = await finalizeGalleryUpload({
          path: target.path,
          width: item.width,
          height: item.height,
          fileSize: item.file.size,
          mimeType: item.file.type,
          albumId,
        });
        if ("error" in done) {
          patch(item.id, { status: "error", error: done.error });
          return;
        }
        patch(item.id, { status: "done", progress: 1 });
        onUploaded(done.image);
      } catch (e) {
        patch(item.id, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    },
    [albumId, onUploaded, patch],
  );

  const addFiles = React.useCallback(
    async (list: FileList | File[] | null) => {
      if (!list) return;
      for (const file of Array.from(list)) {
        const invalid = validateImageFile(file);
        const base: QueueItem = {
          id: `q-${++counter.current}`,
          file,
          previewUrl: URL.createObjectURL(file),
          width: 0,
          height: 0,
          progress: 0,
          status: "uploading",
        };
        if (invalid) {
          setItems((prev) => [...prev, { ...base, status: "error", error: invalid }]);
          continue;
        }
        try {
          const dims = await readDimensions(file);
          base.width = dims.width;
          base.height = dims.height;
        } catch {
          setItems((prev) => [...prev, { ...base, status: "error", error: "Could not read this image." }]);
          continue;
        }
        setItems((prev) => [...prev, base]);
        void run(base);
      }
    },
    [run],
  );

  const retry = (item: QueueItem) => {
    patch(item.id, { status: "uploading", progress: 0, error: undefined });
    void run({ ...item, status: "uploading", progress: 0, error: undefined });
  };

  const dismiss = (item: QueueItem) => {
    URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  };

  const clearFinished = React.useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => it.status === "done" && URL.revokeObjectURL(it.previewUrl));
      return prev.filter((it) => it.status !== "done");
    });
  }, []);

  return { items, addFiles, retry, dismiss, clearFinished };
}

/** Floating bottom-right upload dock, Google-Photos style. */
export function UploadDock({
  items,
  onRetry,
  onDismiss,
  onClearFinished,
}: {
  items: QueueItem[];
  onRetry: (item: QueueItem) => void;
  onDismiss: (item: QueueItem) => void;
  onClearFinished: () => void;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  if (items.length === 0) return null;

  const active = items.filter((i) => i.status === "uploading" || i.status === "finalizing").length;
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const allSettled = active === 0;

  const heading = active > 0
    ? `Uploading ${done + failed + 1} of ${items.length}`
    : failed > 0
      ? `${done} uploaded, ${failed} failed`
      : `${done} ${done === 1 ? "photo" : "photos"} uploaded`;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-admin-border bg-admin-surface shadow-lg">
      <header className="flex items-center gap-2 border-b border-admin-border bg-admin-surface px-3 py-2.5">
        {active > 0 ? (
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-admin-border border-t-admin-accent" aria-hidden />
        ) : failed > 0 ? (
          <AlertCircle className="size-4 shrink-0 text-admin-danger" aria-hidden />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-admin-success" aria-hidden />
        )}
        <span className="flex-1 truncate text-sm font-medium text-admin-text">{heading}</span>
        <button
          type="button"
          aria-label={collapsed ? "Expand" : "Collapse"}
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-admin-text-muted hover:bg-admin-surface-hover"
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {allSettled && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onClearFinished}
            className="rounded p-1 text-admin-text-muted hover:bg-admin-surface-hover"
          >
            <X className="size-4" />
          </button>
        )}
      </header>

      {!collapsed && (
        <ul className="max-h-72 divide-y divide-admin-border overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={item.previewUrl} alt="" className="size-10 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-admin-text" title={item.file.name}>{item.file.name}</p>
                {item.status === "error" ? (
                  <p className="truncate text-xs text-admin-danger" title={item.error}>{item.error}</p>
                ) : item.status === "finalizing" ? (
                  <p className="text-xs text-admin-text-muted">Finishing…</p>
                ) : item.status === "done" ? (
                  <p className="text-xs text-admin-success">Uploaded</p>
                ) : (
                  <ProgressBar value={item.progress} />
                )}
              </div>
              <div className="shrink-0">
                {item.status === "done" ? (
                  <CheckCircle2 className="size-5 text-admin-success" aria-hidden />
                ) : item.status === "error" ? (
                  <div className="flex items-center gap-0.5">
                    <button type="button" aria-label="Retry" onClick={() => onRetry(item)} className="rounded p-1 text-admin-text-muted hover:bg-admin-surface-hover">
                      <RotateCw className="size-4" />
                    </button>
                    <button type="button" aria-label="Remove" onClick={() => onDismiss(item)} className="rounded p-1 text-admin-text-muted hover:bg-admin-surface-hover">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <Ring value={item.progress} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-admin-surface-hover">
      <div className="h-full rounded-full bg-admin-accent transition-[width] duration-150" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden>
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2" className="stroke-admin-surface-hover" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-admin-accent transition-[stroke-dashoffset] duration-150"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
      />
    </svg>
  );
}
