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

  // Twitter-style: a gentle single indent per level (capped at 2 so a deep
  // thread never marches off a phone), and ONE thread line hugging the content
  // — not an empty gutter column. `border-l` on the nested block means the line
  // touches the reply and consecutive same-depth nodes stack into one continuous
  // vertical line, connecting a reply to its parent instead of floating in space.
  const step = Math.min(depth - 1, 2);
  const nested = depth > 1;

  return (
    <div
      style={{ ["--indent" as string]: `${step}` }}
      className="ml-[calc(var(--indent)*14px)] sm:ml-[calc(var(--indent)*20px)]"
    >
      <div className={nested ? "border-l-2 border-border pl-2 sm:pl-3" : undefined}>
        {nested && parentHandle && (
          <p className="flex items-center gap-1 pl-3 pt-2 text-xs text-muted-foreground">
            <CornerDownRight className="size-3" />
            replying to <span className="font-medium">@{parentHandle}</span>
          </p>
        )}

        {children}

        {canReply && (
          <div className="pl-3">
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
    </div>
  );
}
