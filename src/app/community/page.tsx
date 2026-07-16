import { getMemberContext } from "@/lib/members/session";
import { getShellUser } from "@/lib/app-shell/user";
import {
  listFeed,
  listPollResults,
  listRandomFeed,
  viewerCanPost,
} from "@/lib/community/queries";
import type { FeedSort, FeedWindow } from "@/lib/community/types";
import { SortMenu } from "@/components/community/sort-menu";
import { PostCard } from "@/components/community/post-card";
import { SignInWall } from "@/components/community/sign-in-wall";
import { ComposerFab } from "@/components/community/composer-fab";

const SORTS = new Set<FeedSort>(["new", "hot", "top"]);
const WINDOWS = new Set<FeedWindow>(["all", "today", "week", "month", "year"]);

/** Posts a logged-out visitor sees before the wall. */
const PREVIEW = 3;

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

  // Logged out: a random handful, then the wall. Sorting is the signed-in
  // feed's job — a sort menu over three random posts is furniture.
  const [canPost, posts, shellUser] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    user ? listFeed({ sort, window, limit: 30 }) : listRandomFeed(PREVIEW),
    user ? getShellUser() : Promise.resolve(null),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  return (
    <div>
      {user && <SortMenu sort={sort} window={window} />}

      {canPost && (
        <ComposerFab name={shellUser?.displayName ?? null} username={shellUser?.username ?? null} />
      )}
      {user && !canPost && (
        <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
          Verify your email to post.
        </p>
      )}

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

      {!user && posts.length > 0 && <SignInWall returnPath="/community" />}
    </div>
  );
}
