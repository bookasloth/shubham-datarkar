import Link from "next/link";
import { MessagesSquare } from "lucide-react";

/**
 * What a logged-out visitor gets instead of the feed: a few real posts, faded
 * out under a sign-in card. The fade overlaps the last preview post on purpose
 * — a hard stop reads as "the end", a fade reads as "there's more".
 *
 * The preview is a taste, not a paywall dodge: every post still has its own
 * public permalink, and /community/p/[id] meters those separately.
 */
export function SignInWall({ returnPath }: { returnPath: string }) {
  const login = `/login?next=${encodeURIComponent(returnPath)}`;
  const register = `/register?next=${encodeURIComponent(returnPath)}`;
  return (
    <div className="relative -mt-24 pt-24">
      {/* The card sits below the last preview post; only this gradient overlaps it,
          fading the post's bottom into the page. A solid bordered card riding over
          live post content reads as a layout bug — the fade does the teasing, the
          card stays clear of the content. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent to-background" />

      <div className="flex flex-col items-center rounded-card border border-border bg-card px-6 py-10 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-card bg-muted">
          <MessagesSquare className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold">
          Sign in to join the conversation
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          You&apos;re seeing a few posts at random. Sign in to read the whole feed, reply,
          and keep your bookmarks — it&apos;s free.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href={register}
            className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
          >
            Create a free account
          </Link>
          <Link
            href={login}
            className="rounded-btn border border-border px-4 py-2 text-sm transition-ui hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
