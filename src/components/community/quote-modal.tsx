"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createQuote } from "@/lib/community/engage-actions";
import { useToast } from "@/components/ui/toast";
import { MentionField } from "./mention-field";
import type { FeedPost } from "@/lib/community/types";

const MAX = 500;

/**
 * Quote composer. A quote is a reblog that carries your own words, so this is a
 * plain body box over the source card — no images/poll/YouTube in v1 (spec §6),
 * which keeps the card sane and the action a single insert.
 */
export function QuoteModal({
  post,
  open,
  onOpenChange,
  onQuoted,
}: {
  post: FeedPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoted?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const over = body.length > MAX;
  const empty = body.trim().length === 0;

  function submit() {
    if (empty || over || pending) return;
    start(async () => {
      const r = await createQuote(post.id, body);
      if ("error" in r) {
        toast({ title: "Couldn't quote", description: r.error, variant: "danger" });
        return;
      }
      setBody("");
      onOpenChange(false);
      onQuoted?.();
      // A quote is a brand-new feed row (not an in-place edit of a card already
      // on screen), so refetch to bring it in — mirrors createReply.
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quote this post</DialogTitle>
        </DialogHeader>

        <MentionField
          as="textarea"
          value={body}
          onChange={setBody}
          placeholder="Add your take… tag someone with @"
          rows={3}
          className="w-full resize-none rounded-input border border-border bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />

        {/* The source, shown the way it'll embed under the quote. */}
        <div className="rounded-card border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-semibold text-foreground">@{post.username}</span>
          </div>
          {post.body && (
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {post.body}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className={over ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
            {body.length}/{MAX}
          </span>
          <Button type="button" size="sm" loading={pending} disabled={empty || over} onClick={submit}>
            Quote
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
