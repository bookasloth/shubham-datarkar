"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CommunityAvatar } from "./community-avatar";
import { JoinModal } from "./join-modal";

/**
 * The reply pill as a logged-out visitor sees it.
 *
 * ReplyBox only renders for someone who can post, so until now a logged-out
 * reader saw no reply affordance at all — the post just ended. This keeps the
 * invitation on screen and turns the tap into the join modal.
 *
 * Deliberately not a disabled control: it looks live and behaves live, because
 * the answer to "can I reply?" is yes, after one step.
 */
export function ReplyPrompt() {
  const [joining, setJoining] = useState(false);
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <CommunityAvatar seed="guest" size={36} />
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-4 pr-1.5 transition-ui focus-within:border-brand">
          <button
            type="button"
            onClick={() => setJoining(true)}
            className="min-w-0 flex-1 cursor-text bg-transparent py-1 text-left text-sm text-muted-foreground outline-none"
          >
            Post your reply
          </button>
          <Button type="button" size="sm" className="rounded-full" onClick={() => setJoining(true)}>
            Reply
          </Button>
        </div>
      </div>
      <JoinModal open={joining} onOpenChange={setJoining} />
    </div>
  );
}
