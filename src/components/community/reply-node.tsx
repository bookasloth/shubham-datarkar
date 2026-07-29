"use client";
import { useState } from "react";
import { CornerDownRight } from "lucide-react";
import { ReplyBox } from "./reply-box";

/**
 * One node in a threaded reply list. Wraps the server-rendered PostCard
 * (`children`) and adds what needs interactivity: an indent by depth, a context
 * line naming the parent, and a Reply toggle that opens an inline box targeting
 * THIS reply.
 *
 * The replies arrive pre-ordered (pre-order traversal by the RPC's `path`), so
 * a flat map with per-node indent renders the tree — no tree-building here.
 */
export function ReplyNode({
  depth,
  parentHandle,
  replyToId,
  canReply,
  viewerSeed,
  viewerAvatar,
  children,
}: {
  /** 1 = top-level reply. Indent steps in from there, capped so deep threads
   *  don't march off a phone screen. */
  depth: number;
  /** Handle of the reply this one answers — shown as context, and the only
   *  threading cue on mobile where per-level indent is unreadable. */
  parentHandle: string | null;
  replyToId: string;
  canReply: boolean;
  viewerSeed: string;
  viewerAvatar: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Flat, Twitter-style: replies share ONE column so the thread line drawn in
  // the avatar column (by PostCard's connectAbove/connectBelow) runs continuously
  // avatar-to-avatar. No per-level indent — depth is conveyed by "replying to
  // @handle", not by marching the card rightward. The reply affordance is
  // aligned under the content (pl-[52px] ≈ avatar width + gap) so it doesn't
  // sit on the thread line.
  const nested = depth > 1;

  return (
    <div>
      {nested && parentHandle && (
        <p className="flex items-center gap-1 pl-[52px] pt-2 text-xs text-muted-foreground">
          <CornerDownRight className="size-3" />
          replying to <span className="font-medium">@{parentHandle}</span>
        </p>
      )}

      {children}

      {canReply && (
        <div className="pl-[52px]">
          {open ? (
            <ReplyBox
              postId={replyToId}
              seed={viewerSeed}
              avatarSrc={viewerAvatar}
              placeholder={`Reply${parentHandle ? ` to @${parentHandle}` : ""}…`}
              onDone={() => setOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="-mt-1 mb-1 rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent"
            >
              Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}
