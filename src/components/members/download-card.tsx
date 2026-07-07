"use client";

import { Download } from "lucide-react";
import { useState, useTransition } from "react";
import { getDownloadUrl } from "@/lib/members/download-actions";
import type { DownloadMeta } from "@/lib/resources/types";

export function DownloadCard({
  resourceId,
  meta,
  downloadCount,
}: {
  resourceId: string;
  meta: DownloadMeta;
  downloadCount: number;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onDownload() {
    setError("");
    startTransition(async () => {
      const result = await getDownloadUrl(resourceId);
      if (result.error) setError(result.error);
      else if (result.url) window.location.assign(result.url);
    });
  }

  return (
    <div className="rounded-card border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-card bg-muted">
          <Download className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {meta.version ? `Version ${meta.version}` : "Downloadable file"}
          </div>
          <div className="text-xs text-muted-foreground">
            {downloadCount} download{downloadCount === 1 ? "" : "s"}
          </div>
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={pending}
          className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Preparing…" : "Download"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {meta.changelog && meta.changelog.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {meta.changelog.map((c) => (
            <li key={c.version}>
              <span className="font-medium text-foreground">{c.version}</span> ({c.date}) — {c.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
