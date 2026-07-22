"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import Link from "next/link";

// ponytail: standalone poller for the article endpoint + stages.
// Not shared with other pollers; fold into one <StepPoller> only if a third appears.
const STAGES = [
  { key: "queued", label: "Queued" },
  { key: "outlining", label: "Planning the outline" },
  { key: "drafting", label: "Writing the draft" },
  { key: "reviewing", label: "Reviewing against the brief" },
  { key: "scoring", label: "Scoring" },
  { key: "complete", label: "Done" },
];
const ORDER = STAGES.map((s) => s.key);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pokes /api/kalamai/article-step until terminal, then refreshes to render the article. */
export function ArticlePoller({ id, initialStatus, initialProgress }: { id: string; initialStatus: string; initialProgress: number }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [note, setNote] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      let st = initialStatus;
      while (!cancelled && st !== "complete" && st !== "failed") {
        try {
          const res = await fetch("/api/kalamai/article-step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          if (!res.ok) {
            setNote("Hit a snag, retrying…");
            await sleep(1500);
            continue;
          }
          const data = (await res.json()) as { status: string; progress: number };
          st = data.status;
          if (cancelled) return;
          setStatus(data.status);
          setProgress(data.progress);
          setNote(null);
        } catch {
          if (cancelled) return;
          setNote("Network hiccup, retrying…");
          await sleep(1500);
        }
      }
      if (!cancelled) router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [id, initialStatus, router]);

  const activeIndex = Math.max(0, ORDER.indexOf(status));

  if (status === "failed") {
    return (
      <div className="rounded-card border border-border bg-card p-6">
        <p className="text-sm font-medium text-danger">Writing this article failed.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your quota was not charged.{" "}
          <Link href="/tools/kalamai/history" className="font-medium text-foreground hover:underline">
            Back to history
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-card p-6">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(5, progress))}%` }} />
      </div>
      <ol className="mt-5 space-y-2">
        {STAGES.map((s, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
          return (
            <li key={s.key} className="flex items-center gap-3 text-sm">
              <span
                className={
                  "flex size-5 items-center justify-center rounded-full border text-[10px] tabular-nums " +
                  (state === "done"
                    ? "border-foreground bg-foreground text-background"
                    : state === "active"
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground")
                }
              >
                {state === "done" ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={state === "todo" ? "text-muted-foreground" : "text-foreground"}>{s.label}</span>
            </li>
          );
        })}
      </ol>
      {note && <p className="mt-4 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
