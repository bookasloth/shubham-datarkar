import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { listFeed, listPollResults, viewerCanPost } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { FeedStream, FEED_PAGE } from "@/components/community/feed-stream";

export const metadata = buildMetadata({ title: "Likes", path: "/community/likes", noIndex: true });

export default async function LikesPage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/login?next=/community/likes");

  const [canPost, posts] = await Promise.all([
    viewerCanPost(),
    listFeed({ sort: "new", window: "all", liked: true, limit: FEED_PAGE }),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  const cards = posts.map((post) => (
    <PostCard
      key={post.rowId}
      post={post}
      pollResult={pollResults[post.id]}
      canVote={canPost}
      viewerId={user.id}
    />
  ));

  return (
    <div>
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">Likes</h1>
      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          Nothing liked yet.
        </p>
      ) : (
        <FeedStream query={{ liked: true }} initialCount={posts.length}>
          {cards}
        </FeedStream>
      )}
    </div>
  );
}
