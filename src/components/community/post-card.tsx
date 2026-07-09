import Image from "next/image";
import { cn, timeAgo } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";
import { BadgeTick } from "./badge-tick";
import { CommunityAvatar } from "./community-avatar";
import { EngagementBar } from "./engagement-bar";

export function PostCard({ post }: { post: FeedPost }) {
  const name = post.displayName || post.username;
  return (
    <article className="border-b border-border px-4 py-3">
      <div className="flex gap-3">
        <CommunityAvatar name={name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="truncate font-semibold text-foreground">{name}</span>
            <BadgeTick badge={post.badge} />
            <span className="truncate text-muted-foreground">@{post.username}</span>
            <span className="text-muted-foreground">· {timeAgo(post.createdAt)}</span>
          </div>

          {post.body && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{post.body}</p>
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

          {post.type === "poll" && post.poll ? <PollStatic post={post} /> : null}

          <EngagementBar post={post} />
        </div>
      </div>
    </article>
  );
}

// Read-only poll render (voting lands in Plan 5). Shows options as static rows.
function PollStatic({ post }: { post: FeedPost }) {
  const opts = post.poll?.options ?? [];
  return (
    <div className="mt-2 space-y-1.5">
      {opts.map((o) => (
        <div key={o.i} className="rounded-input border border-border px-3 py-1.5 text-sm">
          {o.label}
        </div>
      ))}
    </div>
  );
}
