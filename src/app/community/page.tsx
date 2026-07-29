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
import { feedContextLine } from "@/lib/community/feed-context";
import Link from "next/link";
import { ComposerFab } from "@/components/community/composer-fab";
import { SuggestedFollows } from "@/components/community/suggested-follows";

const SORTS = new Set<FeedSort>(["new", "hot", "top"]);
const WINDOWS = new Set<FeedWindow>(["all", "today", "week", "month", "year"]);

/** Posts a logged-out visitor sees before the wall. */
const PREVIEW = 3;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; window?: string; seed?: string; tab?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const sort: FeedSort = SORTS.has(sp.sort as FeedSort) ? (sp.sort as FeedSort) : "hot";
  const window: FeedWindow = WINDOWS.has(sp.window as FeedWindow)
    ? (sp.window as FeedWindow)
    : "all";

  // Hot is a seeded shuffle. The seed lives in the URL so SSR and the
  // loadFeedPage client action agree without extra plumbing, a refresh keeps the
  // order, and a shared link reproduces exactly what the sharer saw. Arriving at
  // ?sort=hot with no seed mints one and redirects, which is what makes a fresh
  // visit a fresh shuffle.
  //
  // PRESERVE every other param when redirecting — hot is the DEFAULT sort now,
  // so this fires on a bare /community too, and "Share to Community" lands here
  // carrying ?compose/composeTitle/returnTo. A blind /community?sort=hot&seed=X
  // would drop them and the composer would never open.
  if (sort === "hot" && !sp.seed) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) params.set(k, v);
    params.set("sort", "hot");
    params.set("seed", String(newSeed()));
    redirect(`/community?${params.toString()}`);
  }
  const seed = clampSeed(sp.seed);
  const following = sp.tab === "following";
  // Tag filter (?tag=seo) — sanitized to the tag charset, else ignored.
  const tag = typeof sp.tag === "string" && /^[a-z0-9-]{1,32}$/.test(sp.tag.toLowerCase())
    ? sp.tag.toLowerCase()
    : undefined;

  const { user } = await getMemberContext();

  // Logged out: a random handful, then the wall. Sorting is the signed-in
  // feed's job — a sort menu over three random posts is furniture.
  const [canPost, posts, shellUser] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    user ? listFeed({ sort, window, seed, following, tag, limit: FEED_PAGE }) : listRandomFeed(PREVIEW),
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

      {tag && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
          <span>
            Posts tagged <span className="font-semibold">#{tag}</span>
          </span>
          <Link href="/community" className="text-muted-foreground hover:underline">
            Clear
          </Link>
        </div>
      )}

      {canPost && (
        <ComposerFab name={shellUser?.displayName ?? null} username={shellUser?.username ?? null} />
      )}
      {user && !canPost && (
        <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
          Verify your email to post.
        </p>
      )}

      {posts.length > 0 && (
        <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
          {feedContextLine({ sort, window, following, tag }, Boolean(user))}
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
        <FeedStream
          query={{ sort, window, seed, following, tag }}
          initialCount={posts.length}
          initialSince={posts[0]?.createdAt}
          // New sort only, and not on a tag drill-down — the count RPC mirrors
          // the main feed's filters, not the tag filter.
          showNewPill={sort === "new" && !tag}
        >
          {cards}
        </FeedStream>
      ) : (
        cards
      )}

      {!user && posts.length > 0 && <SignInWall returnPath="/community" />}
    </div>
  );
}
