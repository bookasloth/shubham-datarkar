import Image from "next/image";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { getAdminUser } from "@/lib/auth/session";
import type { FeedPost, PollResult } from "@/lib/community/types";
import { tokenizeLinks, prettyLabel } from "@/lib/community/linkify";
import { ensureShortLinks, SHORT_HOST } from "@/lib/community/short-link";
import { BadgeTick } from "./badge-tick";
import { CommunityAvatar } from "./community-avatar";
import { EngagementBar } from "./engagement-bar";
import { Poll } from "./poll";
import { PostMenu } from "./post-menu";
import { PostCardFrame } from "./post-card-frame";
import { QuotedCard } from "./quoted-card";
import { PostTitle, ChatBody, QuoteBody, LinkCard } from "./post-extras";

export async function PostCard({
  post,
  pollResult,
  canVote = false,
  viewerId = null,
  standalone = false,
  removeOnUnbookmark = false,
  flat = false,
}: {
  post: FeedPost;
  pollResult?: PollResult;
  canVote?: boolean;
  viewerId?: string | null;
  /** The root card on a single-post page. Deleting it navigates away instead of
   *  hiding it in place (hiding would leave the page's replies orphaned). */
  standalone?: boolean;
  /** On /community/bookmarks, un-bookmarking removes the card. */
  removeOnUnbookmark?: boolean;
  /** Thread rendering (replies): a flat row with a hairline divider instead of a
   *  floating rounded card box, so a thread reads as one continuous Twitter-style
   *  column rather than a stack of separate cards. */
  flat?: boolean;
}) {
  // Cached per request (getAdminUser is React.cache) — one auth check per render
  // regardless of how many cards map over it.
  const isAdmin = Boolean(await getAdminUser());
  const name = post.displayName || post.username;
  // Shorten every link in the body to SHORT_HOST/s/{slug}. Codes are minted on
  // read, so old and auto-posted links get shortened too. ensureShortLinks is a
  // no-op (no RPC) when the body has no links.
  const tokens = post.body ? tokenizeLinks(post.body) : [];
  const short = await ensureShortLinks(
    tokens.flatMap((t) => (t.type === "link" ? [t.href] : [])),
  );
  return (
    <PostCardFrame>
    <article
      className={
        flat
          ? "group relative border-b border-border bg-card px-4 py-3 transition-ui hover:bg-muted/30"
          : "group relative mb-3 rounded-card border border-border bg-card p-4 transition-ui hover:bg-muted/30"
      }
    >
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
        <CommunityAvatar seed={post.username} src={post.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="truncate font-semibold text-foreground">{name}</span>
            <BadgeTick badge={post.badge} />
            <span className="truncate text-muted-foreground">@{post.username}</span>
            <span className="text-muted-foreground">· {timeAgo(post.createdAt)}</span>
          </div>

          <PostTitle title={post.meta?.title} />

          {/* Standalone quote and chat posts render their body their own way;
              everything else (including a quote-reblog's commentary) uses the
              tokenized paragraph. A quote-reblog has post.quoted set, so it is
              NOT treated as a standalone quote here. */}
          {post.type === "quote" && !post.quoted && post.body ? (
            <QuoteBody body={post.body} source={post.meta?.source} />
          ) : post.type === "chat" && post.body ? (
            <ChatBody body={post.body} />
          ) : post.body ? (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {tokens.map((t, i) => {
                if (t.type === "mention") {
                  return (
                    <Link
                      key={i}
                      href={`/community/u/${t.handle}`}
                      className="relative z-10 font-medium text-[#fe4000] hover:underline"
                    >
                      {t.value}
                    </Link>
                  );
                }
                if (t.type === "hashtag") {
                  return (
                    <Link
                      key={i}
                      href={`/community?tag=${t.tag}`}
                      className="relative z-10 font-medium text-[#fe4000] hover:underline"
                    >
                      {t.value}
                    </Link>
                  );
                }
                if (t.type !== "link") return <span key={i}>{t.value}</span>;
                const slug = short.get(t.href);
                return (
                  <a
                    key={i}
                    href={slug ? `/s/${slug}` : t.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="relative z-10 text-[#fe4000] underline underline-offset-2 hover:opacity-70"
                  >
                    {slug ? `${SHORT_HOST}/s/${slug}` : prettyLabel(t.href)}
                  </a>
                );
              })}
            </p>
          ) : null}

          {post.type === "link" && post.meta ? <LinkCard meta={post.meta} /> : null}

          {post.type === "image" && post.images?.length ? (
            post.images.length === 1 ? (
              // Single image: render at its natural aspect (uncropped), full column
              // width. Dimensions aren't stored, so width/height are placeholders
              // that only seed the srcset — `h-auto w-full` lets the real file's
              // aspect ratio drive layout (Next's documented responsive pattern).
              <div className="mt-2 overflow-hidden rounded-card border border-border bg-muted">
                <Image
                  src={post.images[0]}
                  alt=""
                  width={1200}
                  height={1200}
                  sizes="(max-width: 640px) 100vw, 600px"
                  className="h-auto w-full"
                />
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-1 overflow-hidden rounded-card">
                {post.images.slice(0, 4).map((src) => (
                  <div key={src} className="relative aspect-video bg-muted">
                    <Image src={src} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
            )
          ) : null}


          {post.type === "poll" && post.poll ? (
            <div className="relative z-10">
              <Poll post={post} result={pollResult} canVote={canVote} closed={post.pollClosed} />
            </div>
          ) : null}

          {post.quoted && <QuotedCard quoted={post.quoted} />}

          <EngagementBar
            post={post}
            removeOnUnbookmark={removeOnUnbookmark}
            endSlot={
              <PostMenu
                postId={post.id}
                publicId={post.publicId}
                authorHandle={post.username}
                isLoggedIn={Boolean(viewerId)}
                isOwner={viewerId === post.userId}
                isAdmin={isAdmin}
                standalone={standalone}
              />
            }
          />
        </div>
      </div>
    </article>
    </PostCardFrame>
  );
}
