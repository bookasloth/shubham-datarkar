"use client";
import { useState, useTransition } from "react";
import { toggleFollow } from "@/lib/community/social-actions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Optimistic follow toggle.
 *
 * The happy path deliberately does NOT call `router.refresh()` — this button is
 * authoritative for its own state and the server returns the true counts to
 * reconcile against. Refreshing would refetch the whole profile RSC tree to
 * change one word. [[community-optimistic-feed]]
 */
export function FollowButton({
  username,
  initialFollowing,
  initialFollowers,
  showCount = false,
}: {
  username: string;
  initialFollowing: boolean;
  initialFollowers: number;
  /** Render the follower count next to the label (profile header does; the
   *  suggestion list doesn't — it's already a dense row). */
  showCount?: boolean;
}) {
  const { toast } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [pending, start] = useTransition();

  function onClick() {
    const prevFollowing = following;
    const prevFollowers = followers;
    setFollowing(!prevFollowing);
    setFollowers(prevFollowers + (prevFollowing ? -1 : 1));

    start(async () => {
      const r = await toggleFollow(username);
      if ("error" in r) {
        setFollowing(prevFollowing);
        setFollowers(prevFollowers);
        toast({
          title: "Couldn't do that",
          description: r.error,
          variant: "danger",
        });
        return;
      }
      // Reconcile against the server's count, not the guess: someone else may
      // have followed them while this request was in flight.
      setFollowing(r.following);
      setFollowers(r.followers);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        "rounded-btn px-4 py-1.5 text-sm font-medium transition-ui disabled:opacity-60",
        following
          ? "border border-border text-foreground hover:border-destructive hover:text-destructive"
          : "bg-foreground text-background hover:opacity-90",
      )}
    >
      {/* Hover-swapping the label to "Unfollow" is a CSS-only affordance in
          X; here the aria-pressed state carries it for screen readers and the
          border turning red carries it visually. */}
      {following ? "Following" : "Follow"}
      {showCount && <span className="ml-1.5 opacity-70">{followers}</span>}
    </button>
  );
}
