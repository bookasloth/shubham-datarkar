import { notFound } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { getPost, listPollResults, listReplies, viewerCanPost } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { ReplyBox } from "@/components/community/reply-box";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const { user } = await getMemberContext();
  const [canPost, replies] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    listReplies(id),
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

      {canPost && <ReplyBox postId={post.id} />}

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
