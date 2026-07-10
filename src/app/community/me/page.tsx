import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { listFeed, listPollResults, viewerCanPost, viewerHandle } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { CommunityAvatar } from "@/components/community/community-avatar";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/members/login?next=/community/me");

  const handle = await viewerHandle();
  if (!handle) redirect("/community");

  const [canPost, posts] = await Promise.all([
    viewerCanPost(),
    listFeed({ sort: "new", window: "all", author: handle, limit: 50 }),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  return (
    <div>
      <header className="flex items-center gap-3 border-b border-border px-4 py-4">
        <CommunityAvatar name={handle} size={48} />
        <div>
          <h1 className="font-display text-lg font-bold">@{handle}</h1>
          <p className="text-sm text-muted-foreground">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          You haven&apos;t posted yet.
        </p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.rowId}
            post={post}
            pollResult={pollResults[post.id]}
            canVote={canPost}
            viewerId={user.id}
          />
        ))
      )}
    </div>
  );
}
