import { getMemberContext } from "@/lib/members/session";
import { listFeed } from "@/lib/community/queries";
import type { FeedSort, FeedWindow } from "@/lib/community/types";
import { SortMenu } from "@/components/community/sort-menu";
import { PostCard } from "@/components/community/post-card";
import { MeterGate } from "@/components/community/meter-gate";

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
  const posts = await listFeed({ sort, window, limit: 30 });

  return (
    <div>
      <SortMenu sort={sort} window={window} />
      <MeterGate isLoggedIn={Boolean(user)}>
        {posts.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            No posts yet. Be the first once posting opens.
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </MeterGate>
    </div>
  );
}
