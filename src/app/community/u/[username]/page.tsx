import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getMemberContext } from "@/lib/members/session";
import {
  getProfileByUsername,
  listFeed,
  listPollResults,
  viewerCanPost,
} from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { CommunityAvatar } from "@/components/community/community-avatar";

/**
 * Public profile — the thing an @mention points at. `noIndex` for the same reason
 * as /community/p/[id]: whether Google should crawl member UGC is a moderation
 * decision that hasn't been made, and this page is a re-listing of posts that
 * already have their own URLs.
 */
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return buildMetadata({ title: "Profile", path: `/community/u/${username}`, noIndex: true });
  const who = profile.displayName ?? `@${profile.username}`;
  return buildMetadata({
    title: `${who} in the community`,
    description: `Posts by ${who} in the community.`,
    path: `/community/u/${profile.username}`,
    noIndex: true,
  });
}

export default async function CommunityProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  // An unknown handle 404s rather than rendering an empty feed — a mistyped
  // @mention should look broken, not like a real member with nothing to say.
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const { user } = await getMemberContext();
  const [canPost, posts] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    listFeed({ sort: "new", window: "all", author: profile.username, limit: 50 }),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );
  const name = profile.displayName ?? `@${profile.username}`;

  return (
    <div>
      <header className="flex items-center gap-3 border-b border-border px-4 py-4">
        <CommunityAvatar seed={profile.username} size={48} />
        <div>
          <h1 className="font-display text-lg font-bold">{name}</h1>
          <p className="text-sm text-muted-foreground">
            @{profile.username} · {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          No posts yet.
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
    </div>
  );
}
