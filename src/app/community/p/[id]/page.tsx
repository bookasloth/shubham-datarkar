import { notFound } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { getShellUser } from "@/lib/app-shell/user";
import { getPostByPublicId, listPollResults, listReplies, viewerCanPost } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { ReplyBox } from "@/components/community/reply-box";
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
      <PostCard
        post={post}
        pollResult={pollResults[post.id]}
        canVote={canPost}
        viewerId={user?.id ?? null}
      />

      {canPost && (
        <ReplyBox postId={post.id} seed={shellUser?.username ?? ""} />
      )}

      {replies.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">No replies yet.</p>
      ) : (
        replies.map((reply) => (
          <PostCard key={reply.rowId} post={reply} viewerId={user?.id ?? null} />
        ))
      )}
    </div>
  );
}
