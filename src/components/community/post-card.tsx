import Image from "next/image";
import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import { getAdminUser } from "@/lib/auth/session";
import type { FeedPost, PollResult } from "@/lib/community/types";
import { tokenizeLinks } from "@/lib/community/linkify";
import { BadgeTick } from "./badge-tick";
import { CommunityAvatar } from "./community-avatar";
import { EngagementBar } from "./engagement-bar";
import { Poll } from "./poll";
import { PostMenu } from "./post-menu";

export async function PostCard({
  post,
  pollResult,
  canVote = false,
  viewerId = null,
}: {
  post: FeedPost;
  pollResult?: PollResult;
  canVote?: boolean;
  viewerId?: string | null;
}) {
  // Cached per request (getAdminUser is React.cache) — one auth check per render
  // regardless of how many cards map over it.
  const isAdmin = Boolean(await getAdminUser());
  const name = post.displayName || post.username;
  return (
    <article className="group relative border-b border-border px-4 py-3 transition-ui hover:bg-muted/40">
      {/* Whole-card click target → single post (Twitter-style). Absolutely
          positioned and z-10 so it paints over the static header/body/media
          (and the `relative` image cells) to catch clicks anywhere on the card.
          Every genuinely interactive descendant (menu, links, media, poll,
          engagement bar) is ALSO z-10 but comes later in the DOM, so it wins the
          equal-z tie and keeps its own behaviour. This overlay is the first
          child, guaranteeing it loses that tie to all of them. No nested-anchor
          problem — it's a sibling of those controls, not an ancestor. */}
      <Link
        href={`/community/p/${post.publicId}`}
        aria-label={`Open post by ${name}`}
        className="absolute inset-0 z-10"
      />
      {post.rebloggedBy && (
        <p className="mb-1 pl-[52px] text-xs text-muted-foreground">
          @{post.rebloggedBy} reblogged
        </p>
      )}
      <div className="flex gap-3">
        <CommunityAvatar name={name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="truncate font-semibold text-foreground">{name}</span>
            <BadgeTick badge={post.badge} />
            <span className="truncate text-muted-foreground">@{post.username}</span>
            <span className="text-muted-foreground">· {timeAgo(post.createdAt)}</span>
            {viewerId && (
              <span className="relative z-10 ml-auto">
                <PostMenu postId={post.id} isOwner={viewerId === post.userId} isAdmin={isAdmin} />
              </span>
            )}
          </div>

          {post.body && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {tokenizeLinks(post.body).map((t, i) =>
                t.type === "link" ? (
                  <a
                    key={i}
                    href={t.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="relative z-10 text-foreground underline underline-offset-2 hover:opacity-70"
                  >
                    {t.text}
                  </a>
                ) : (
                  <span key={i}>{t.value}</span>
                ),
              )}
            </p>
          )}

          {post.type === "image" && post.images?.length ? (
            <div
              className={cn(
                "mt-2 grid gap-1 overflow-hidden rounded-card",
                post.images.length > 1 ? "grid-cols-2" : "grid-cols-1",
              )}
            >
              {post.images.slice(0, 4).map((src) => (
                <div key={src} className="relative aspect-video bg-muted">
                  <Image src={src} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}

          {post.type === "youtube" && post.youtubeId ? (
            <div className="relative z-10 mt-2 aspect-video overflow-hidden rounded-card">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}`}
                title="YouTube video"
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          {post.type === "poll" && post.poll ? (
            <div className="relative z-10">
              <Poll post={post} result={pollResult} canVote={canVote} closed={post.pollClosed} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Full-width action bar (edge-to-edge under the avatar+content row), so
          the icons spread evenly across the whole card. */}
      <EngagementBar post={post} />
    </article>
  );
}
