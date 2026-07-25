"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishDraft } from "@/lib/community/actions";
import { deleteOwnPost } from "@/lib/community/engage-actions";
import { useToast } from "@/components/ui/toast";
import type { DraftPost } from "@/lib/community/queries";

/** The viewer's drafts and scheduled posts, with publish-now and delete. There
 *  is no editing (edit-post is out of scope) — a draft is publish-or-bin. */
export function DraftsList({ drafts }: { drafts: DraftPost[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok?: true; error?: string } | { ok: true } | { error: string }>, fail: string) {
    start(async () => {
      const r = await fn();
      if ("error" in r && r.error) {
        toast({ title: fail, description: r.error, variant: "danger" });
        return;
      }
      router.refresh();
    });
  }

  return (
    <ul className="divide-y divide-border">
      {drafts.map((d) => {
        const scheduled = d.publishAt != null;
        return (
          <li key={d.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{d.body || `(${d.type} post)`}</p>
              <p className="text-xs text-muted-foreground">
                {scheduled ? `Scheduled for ${new Date(d.publishAt!).toLocaleString()}` : "Draft"}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => publishDraft(d.id), "Couldn't publish")}
              className="rounded-btn bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-ui hover:opacity-90 disabled:opacity-60"
            >
              Publish now
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Delete this draft?")) run(() => deleteOwnPost(d.id), "Couldn't delete");
              }}
              className="rounded-btn border border-border px-3 py-1.5 text-xs transition-ui hover:bg-accent disabled:opacity-60"
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
}
