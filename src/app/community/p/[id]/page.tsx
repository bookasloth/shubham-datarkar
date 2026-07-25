import { notFound } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { getShellUser } from "@/lib/app-shell/user";
import { getPostByPublicId, listPollResults, listReplies, viewerCanPost } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { ReplyBox } from "@/components/community/reply-box";
import { ReplyNode } from "@/components/community/reply-node";
import { ReplyPrompt } from "@/components/community/reply-prompt";
import { MeterGate } from "@/components/community/meter-gate";
import { buildMetadata } from "@/lib/seo";

/** First `max` chars of the post body, whitespace-collapsed, ellipsised. */
function snippet(body: string | null, max: number): string {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * OG/Twitter copy so shared post links get a real preview. `noIndex`: these are
 * member posts, and whether Google should index community UGC is a moderation
 * decision that has not been made — so previews yes, crawling no.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostByPublicId(id);
  if (!post) return buildMetadata({ title: "Community post", path: `/community/p/${id}`, noIndex: true });

  const author = post.displayName ?? `@${post.username}`;
  const body = snippet(post.body, 150);
  return buildMetadata({
    title: "Community post",
    description: body || `A post by ${author} in the community.`,
    ogTitle: `${author} in the community`,
    ogDescription: body || `A post by ${author} in the community.`,
    path: `/community/p/${post.publicId}`,
    noIndex: true,
  });
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // `id` is the public_id. Legacy /community/p/{uuid} links are 301'd to the
  // canonical public_id URL in proxy.ts before they reach here, so an id that
  // doesn't resolve as a public_id simply 404s.
  const post = await getPostByPublicId(id);
  if (!post) notFound();

  const { user } = await getMemberContext();
  const [canPost, replies, shellUser] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    listReplies(post.id),
    user ? getShellUser() : Promise.resolve(null),
  ]);
  const pollResults = await listPollResults(post.type === "poll" ? [post.id] : []);

  return (
    <div>
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">Post</h1>

      {/* The daily read meter lives here, not on the feed. A single post is the
          thing that gets shared and linked, so it's what a stranger arrives at;
          the feed gates logged-out visitors outright with its random preview. */}
      <MeterGate isLoggedIn={Boolean(user)} returnPath={`/community/p/${post.publicId}`}>
        <PostCard
          post={post}
          pollResult={pollResults[post.id]}
          canVote={canPost}
          viewerId={user?.id ?? null}
          standalone
        />

        {canPost && (
          <ReplyBox
            postId={post.id}
            seed={shellUser?.username ?? ""}
            avatarSrc={shellUser?.avatarUrl ?? null}
          />
        )}
        {/* Logged out, the pill stays and opens the join modal — the post used to
            simply end, with no sign the conversation was open to anyone. */}
        {!user && <ReplyPrompt />}

        {replies.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No replies yet.</p>
        ) : (
          (() => {
            // Replies arrive pre-ordered (RPC path traversal). Track the handle
            // seen at each depth so a node's parent handle is stack[depth-1];
            // depth-1 replies answer the root post itself.
            const stack: string[] = [post.username];
            return replies.map((reply) => {
              const depth = reply.depth ?? 1;
              stack[depth - 1] = stack[depth - 1] ?? post.username;
              const parentHandle = stack[depth - 1] ?? post.username;
              stack[depth] = reply.username;
              stack.length = depth + 1; // drop stale deeper entries
              return (
                <ReplyNode
                  key={reply.rowId}
                  depth={depth}
                  parentHandle={depth > 1 ? parentHandle : null}
                  replyToId={reply.id}
                  canReply={canPost}
                  viewerSeed={shellUser?.username ?? ""}
                  viewerAvatar={shellUser?.avatarUrl ?? null}
                >
                  <PostCard post={reply} viewerId={user?.id ?? null} />
                </ReplyNode>
              );
            });
          })()
        )}
      </MeterGate>
    </div>
  );
}
