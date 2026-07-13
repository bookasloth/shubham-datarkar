"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reportPost, deleteOwnPost } from "@/lib/community/engage-actions";
import { setPostHidden, setPostDemoted, adminDeletePost } from "@/lib/community/admin-actions";

export function PostMenu({
  postId,
  publicId,
  isLoggedIn,
  isOwner,
  isAdmin = false,
}: {
  postId: string;
  publicId: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community/p/${publicId}`);
      setNote("Link copied");
      setTimeout(() => setNote(null), 1500);
    } catch {
      setNote("Couldn't copy the link.");
    }
  }

  function onReport() {
    const reason = window.prompt("Why are you reporting this post? (optional)") ?? "";
    start(async () => {
      const r = await reportPost(postId, reason);
      setNote("error" in r ? r.error : "Reported. Thanks.");
    });
  }

  function onDelete() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    start(async () => {
      const r = await deleteOwnPost(postId);
      if ("error" in r) setNote(r.error);
      else router.refresh();
    });
  }

  // Admin actions throw on failure (unlike the {error} unions above). Hide/demote
  // drop the post from the feed RPC for everyone, so refresh to reflect it.
  // Reversal (unhide/undemote) lives in /admin/community — the feed can't show
  // what it filters out. ponytail: one-way inline is the takedown path; panel reverses.
  function runAdmin(fn: () => Promise<void>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setNote(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Post actions"
          className="rounded-btn p-1 text-muted-foreground transition-ui hover:bg-accent"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Copy link is available to everyone (feed is public), so it stays
              outside the auth-gated block. onSelect preventDefault keeps the menu
              open long enough for the "Link copied" note to register. */}
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={onCopyLink}>
            Copy link
          </DropdownMenuItem>
          {/* Download image is public too — the route sets Content-Disposition
              so the anchor's href triggers a PNG download of the post card. */}
          <DropdownMenuItem asChild>
            <a href={`/community/p/${publicId}/card`} download={`post-${publicId}.png`}>
              Download image
            </a>
          </DropdownMenuItem>
          {(isLoggedIn || isAdmin) && <DropdownMenuSeparator />}
          {isAdmin ? (
            <>
              <DropdownMenuItem onClick={() => runAdmin(() => setPostHidden(postId, true, "", false))}>
                Hide
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAdmin(() => setPostDemoted(postId, true))}>
                Demote
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => runAdmin(() => adminDeletePost(postId), "Delete this post? This can't be undone.")}
              >
                Delete
              </DropdownMenuItem>
            </>
          ) : isLoggedIn ? (
            <>
              <DropdownMenuItem onClick={onReport}>Report</DropdownMenuItem>
              {isOwner && <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {(note || pending) && (
        <p className="absolute right-0 top-7 whitespace-nowrap text-xs text-muted-foreground">
          {note ?? "Working…"}
        </p>
      )}
    </div>
  );
}
