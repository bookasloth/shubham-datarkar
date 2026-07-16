import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import {
  countAuthorPosts,
  listFeed,
  listPollResults,
  viewerCanPost,
  viewerHandle,
} from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { FeedStream, FEED_PAGE } from "@/components/community/feed-stream";

export const metadata = buildMetadata({ title: "Profile", path: "/community/me", noIndex: true });

export default async function ProfilePage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/members/login?next=/community/me");

  const handle = await viewerHandle();
  if (!handle) redirect("/community");

  const [canPost, posts, total] = await Promise.all([
    viewerCanPost(),
    listFeed({ sort: "new", window: "all", author: handle, limit: FEED_PAGE }),
    // Not posts.length: that only ever counts the first page. Same bug the
    // public profile header carried until #224.
    countAuthorPosts(user.id),
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
      <header className="mb-2 flex items-center gap-3 border-b border-border px-4 py-4">
        <CommunityAvatar seed={handle} size={48} />
        <div>
          <h1 className="font-display text-lg font-bold">@{handle}</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "post" : "posts"}
          </p>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          You haven&apos;t posted yet.
        </p>
      ) : (
        <FeedStream query={{ author: handle }} initialCount={posts.length}>
          {cards}
        </FeedStream>
      )}
    </div>
  );
}
