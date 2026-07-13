"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReply } from "@/lib/community/engage-actions";
import { Button } from "@/components/ui/button";
import { CommunityAvatar } from "./community-avatar";

const MAX = 500;

export function ReplyBox({ postId, seed }: { postId: string; seed: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const empty = body.trim().length === 0;

  function submit() {
    if (empty) return;
    start(async () => {
      const r = await createReply(postId, body);
      if ("error" in r) {
        setError(r.error);
      } else {
        setError(null);
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <CommunityAvatar seed={seed} size={36} />
        {/* Pill wraps input + button so the whole row reads as one control;
            focus-within lifts the border to brand like the composer. */}
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-4 pr-1.5 transition-ui focus-within:border-brand">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Post your reply"
            maxLength={MAX}
            aria-label="Post your reply"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            loading={pending}
            disabled={empty}
            onClick={submit}
          >
            Reply
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 pl-[48px] text-sm text-danger">{error}</p>}
    </div>
  );
}
