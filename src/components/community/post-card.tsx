import Image from "next/image";
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
    <article className="border-b border-border px-4 py-3">
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
              <span className="ml-auto">
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
                    className="text-foreground underline underline-offset-2 hover:opacity-70"
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
            <div className="mt-2 aspect-video overflow-hidden rounded-card">
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
            <Poll post={post} result={pollResult} canVote={canVote} closed={post.pollClosed} />
          ) : null}

          <EngagementBar post={post} />
        </div>
      </div>
    </article>
  );
}
