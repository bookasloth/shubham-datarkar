import Link from "next/link";
import { getMemberContext } from "@/lib/members/session";
import { getShellUser } from "@/lib/app-shell/user";
import { listFeed, listPollResults, viewerCanPost } from "@/lib/community/queries";
import type { FeedSort, FeedWindow } from "@/lib/community/types";
import { SortMenu } from "@/components/community/sort-menu";
import { PostCard } from "@/components/community/post-card";
import { MeterGate } from "@/components/community/meter-gate";
import { Composer } from "@/components/community/composer";

const SORTS = new Set<FeedSort>(["new", "hot", "top", "controversial"]);
const WINDOWS = new Set<FeedWindow>(["all", "today", "week", "month", "year"]);

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; window?: string }>;
}) {
  const sp = await searchParams;
  const sort: FeedSort = SORTS.has(sp.sort as FeedSort) ? (sp.sort as FeedSort) : "new";
  const window: FeedWindow = WINDOWS.has(sp.window as FeedWindow)
    ? (sp.window as FeedWindow)
    : "all";

  const { user } = await getMemberContext();
  const [canPost, posts, shellUser] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    listFeed({ sort, window, limit: 30 }),
    user ? getShellUser() : Promise.resolve(null),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  return (
    <div>
      <SortMenu sort={sort} window={window} />

      {canPost ? (
        <Composer name={shellUser?.displayName ?? null} username={shellUser?.username ?? null} />
      ) : (
        <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
          {user ? (
            "Verify your email to post."
          ) : (
            <>
              <Link href="/members/login?next=/community" className="text-brand hover:underline">
                Sign in
              </Link>{" "}
              to join the conversation.
            </>
          )}
        </p>
      )}

      <MeterGate isLoggedIn={Boolean(user)}>
        {posts.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            No posts yet. Be the first once posting opens.
          </p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.rowId}
              post={post}
              pollResult={pollResults[post.id]}
              canVote={canPost}
              viewerId={user?.id ?? null}
            />
          ))
        )}
      </MeterGate>
    </div>
  );
}
