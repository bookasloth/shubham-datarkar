"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReply } from "@/lib/community/engage-actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CommunityAvatar } from "./community-avatar";

const MAX = 500;

export function ReplyBox({ postId, seed }: { postId: string; seed: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Optimistic echo: the reply text shows immediately (faded) under the composer
  // and clears when router.refresh brings the real thread in — so posting feels
  // instant. ponytail: the stub lives in the composer, not inline in the thread,
  // because the thread renders async server PostCards that can't mount here; lift
  // into a client thread wrapper if inline placement matters.
  const [optimistic, addReply] = useOptimistic<string[], string>([], (s, text) => [...s, text]);
  const empty = body.trim().length === 0;

  function submit() {
    // `pending` guard blocks the double-fire from Enter + click or a rapid
    // double-tap, so the same reply can't be posted twice.
    if (empty || pending) return;
    const text = body;
    setBody(""); // clear instantly; restored below if the post fails
    start(async () => {
      addReply(text);
      const r = await createReply(postId, text);
      if ("error" in r) {
        setBody(text);
        setError(r.error);
        toast({ title: "Reply didn't post", description: r.error, variant: "danger" });
      } else {
        setError(null);
        // Single-post route: refetch just this thread to swap the optimistic echo
        // for the real reply and bump the parent's comment count. Cheap — one
        // post, not the feed.
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
            disabled={empty || pending}
            onClick={submit}
          >
            Reply
          </Button>
        </div>
      </div>
      {optimistic.map((text, i) => (
        <div key={i} className="mt-3 flex gap-3 opacity-60">
          <CommunityAvatar seed={seed} size={36} />
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm">{text}</p>
        </div>
      ))}
      {error && <p className="mt-2 pl-[48px] text-sm text-danger">{error}</p>}
    </div>
  );
}
