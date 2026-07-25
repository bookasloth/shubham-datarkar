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
import { toggleMute } from "@/lib/community/social-actions";
import { setPostHidden, setPostDemoted, adminDeletePost } from "@/lib/community/admin-actions";
import { usePostCardFrame } from "./post-card-frame";
import { useToast } from "@/components/ui/toast";

export function PostMenu({
  postId,
  publicId,
  authorHandle,
  isLoggedIn,
  isOwner,
  isAdmin = false,
  standalone = false,
}: {
  postId: string;
  publicId: string;
  /** Handle of the post's AUTHOR — the mute target. On a reblog this is the
   *  source author, which is whose posts muting actually removes. */
  authorHandle: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  isAdmin?: boolean;
  /** Root card of a single-post page: a successful delete navigates to the feed
   *  rather than hiding the card in place. */
  standalone?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const frame = usePostCardFrame();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  // Optimistically pull the card, run the mutation, put it back on failure. On a
  // standalone post page there's nothing to hide into — succeed by navigating to
  // the feed instead. `settle` returns whether the caller should proceed.
  function errOf(r: unknown): string | null {
    return r && typeof r === "object" && "error" in r && typeof r.error === "string"
      ? r.error
      : null;
  }

  function removeThenRun(run: () => Promise<unknown>, failTitle: string) {
    if (standalone) {
      start(async () => {
        const err = errOf(await run());
        if (err) toast({ title: failTitle, description: err, variant: "danger" });
        else router.push("/community");
      });
      return;
    }
    frame?.remove();
    start(async () => {
      try {
        const err = errOf(await run());
        if (err) {
          frame?.restore();
          toast({ title: failTitle, description: err, variant: "danger" });
        }
      } catch (e) {
        frame?.restore();
        toast({
          title: failTitle,
          description: e instanceof Error ? e.message : "Please try again.",
          variant: "danger",
        });
      }
    });
  }

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

  // Mute removes every post by this author from the feed, so unlike the other
  // card actions it can't just hide one card — the action revalidates and the
  // router picks up a feed without them.
  function onMute() {
    if (!window.confirm(`Mute @${authorHandle}? Their posts disappear from your feed. They won't be told.`)) return;
    start(async () => {
      const r = await toggleMute(authorHandle);
      if ("error" in r) {
        toast({ title: "Couldn't mute", description: r.error, variant: "danger" });
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    removeThenRun(() => deleteOwnPost(postId), "Couldn't delete the post");
  }

  // Admin actions throw on failure (unlike the {error} unions above). Hide/demote
  // drop the post from the feed RPC for everyone; removeThenRun pulls the card
  // instantly and restores it if the mutation throws. Reversal (unhide/undemote)
  // lives in /admin/community — the feed can't show what it filters out.
  function runAdmin(fn: () => Promise<void>, confirmMsg?: string, failTitle = "Action failed") {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    removeThenRun(fn, failTitle);
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
              {!isOwner && (
                <DropdownMenuItem onClick={onMute}>Mute @{authorHandle}</DropdownMenuItem>
              )}
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
