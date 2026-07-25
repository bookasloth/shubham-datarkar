import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { getShellUser } from "@/lib/app-shell/user";
import {
  listFeed,
  listPollResults,
  listRandomFeed,
  listSuggestedProfiles,
  viewerCanPost,
} from "@/lib/community/queries";
import type { FeedSort, FeedWindow } from "@/lib/community/types";
import { clampSeed, newSeed } from "@/lib/community/feed-query";
import { SortMenu } from "@/components/community/sort-menu";
import { PostCard } from "@/components/community/post-card";
import { SignInWall } from "@/components/community/sign-in-wall";
import { FeedStream, FEED_PAGE } from "@/components/community/feed-stream";
import { ComposerFab } from "@/components/community/composer-fab";
import { SuggestedFollows } from "@/components/community/suggested-follows";

const SORTS = new Set<FeedSort>(["new", "hot", "top"]);
const WINDOWS = new Set<FeedWindow>(["all", "today", "week", "month", "year"]);

/** Posts a logged-out visitor sees before the wall. */
const PREVIEW = 3;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; window?: string; seed?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const sort: FeedSort = SORTS.has(sp.sort as FeedSort) ? (sp.sort as FeedSort) : "new";
  const window: FeedWindow = WINDOWS.has(sp.window as FeedWindow)
    ? (sp.window as FeedWindow)
    : "all";

  // Hot is a seeded shuffle. The seed lives in the URL so SSR and the
  // loadFeedPage client action agree without extra plumbing, a refresh keeps the
  // order, and a shared link reproduces exactly what the sharer saw. Arriving at
  // ?sort=hot with no seed mints one and redirects, which is what makes a fresh
  // visit a fresh shuffle.
  if (sort === "hot" && !sp.seed) {
    redirect(`/community?sort=hot&seed=${newSeed()}`);
  }
  const seed = clampSeed(sp.seed);
  const following = sp.tab === "following";

  const { user } = await getMemberContext();

  // Logged out: a random handful, then the wall. Sorting is the signed-in
  // feed's job — a sort menu over three random posts is furniture.
  const [canPost, posts, shellUser] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    user ? listFeed({ sort, window, seed, following, limit: FEED_PAGE }) : listRandomFeed(PREVIEW),
    user ? getShellUser() : Promise.resolve(null),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  // The first page, rendered here; FeedStream appends the rest around it.
  const cards = posts.map((post) => (
    <PostCard
      key={post.rowId}
      post={post}
      pollResult={pollResults[post.id]}
      canVote={canPost}
      viewerId={user?.id ?? null}
    />
  ));

  return (
    <div>
      {user && <SortMenu sort={sort} window={window} tab={following ? "following" : "foryou"} />}

      {canPost && (
        <ComposerFab name={shellUser?.displayName ?? null} username={shellUser?.username ?? null} />
      )}
      {user && !canPost && (
        <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
          Verify your email to post.
        </p>
      )}

      {posts.length === 0 ? (
        following ? (
          // An empty Following feed is the one empty state that can fix itself:
          // give it handles to follow rather than a dead sentence.
          <SuggestedFollows people={await listSuggestedProfiles(3)} />
        ) : (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            No posts yet. Be the first once posting opens.
          </p>
        )
      ) : user ? (
        <FeedStream query={{ sort, window, seed, following }} initialCount={posts.length}>
          {cards}
        </FeedStream>
      ) : (
        cards
      )}

      {!user && posts.length > 0 && <SignInWall returnPath="/community" />}
    </div>
  );
}
