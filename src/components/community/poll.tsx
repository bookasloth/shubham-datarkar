"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedPost, PollResult } from "@/lib/community/types";
import { voteOnPoll } from "@/lib/community/engage-actions";

export function Poll({
  post,
  result,
  canVote,
  closed,
}: {
  post: FeedPost;
  result?: PollResult;
  canVote: boolean;
  /** Computed on the server — calling Date.now() during render would be impure
   *  and could disagree between server render and client hydration. */
  closed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState<number | null>(result?.viewerChoice ?? null);
  const [error, setError] = useState<string | null>(null);

  const options = post.poll?.options ?? [];
  const counts = result?.counts ?? {};
  const total = result?.total ?? 0;
  const showTally = choice !== null || closed || !canVote;
  const isQuiz = post.poll?.mode === "quiz";
  const correct = post.poll?.correct;
  // ponytail: quiz answer reveals whenever the tally shows (post-vote / closed /
  // can't-vote) — same rule as a plain poll, no separate non-voter gating.

  function vote(i: number) {
    const prev = choice;
    setChoice(i);
    start(async () => {
      const r = await voteOnPoll(post.id, i);
      if ("error" in r) {
        setChoice(prev);
        setError(r.error);
      } else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2 space-y-1.5">
      {options.map((o) => {
        const votes = counts[o.i] ?? 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const mine = choice === o.i;

        if (!showTally) {
          return (
            <button
              key={o.i}
              type="button"
              disabled={pending}
              onClick={() => vote(o.i)}
              className="block w-full rounded-input border border-border px-3 py-1.5 text-left text-sm transition-ui hover:border-brand hover:bg-accent disabled:opacity-50"
            >
              {o.label}
            </button>
          );
        }

        const isCorrect = isQuiz && o.i === correct;
        const wrongPick = isQuiz && mine && o.i !== correct;

        return (
          <div
            key={o.i}
            className={cn(
              "relative overflow-hidden rounded-input border px-3 py-1.5 text-sm",
              isCorrect ? "border-foreground" : mine ? "border-brand" : "border-border",
            )}
          >
            <div
              className={cn("absolute inset-y-0 left-0", mine ? "bg-brand/25" : "bg-brand/15")}
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className={cn("flex items-center gap-1.5", (mine || isCorrect) && "font-medium")}>
                {isCorrect && <Check className="size-3.5 shrink-0" aria-label="Correct answer" />}
                {o.label}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {wrongPick && <span className="text-danger">Your pick</span>}
                {pct}%
              </span>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        {isQuiz && "Quiz · "}
        {total} {total === 1 ? "vote" : "votes"}
        {closed && " · Poll closed"}
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
