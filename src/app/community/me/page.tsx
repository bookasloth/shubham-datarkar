import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import {
  countAuthorPosts,
  getSocialCounts,
  listFeed,
  listMutedProfiles,
  listOwnUnpublished,
  listPollResults,
  viewerCanPost,
  viewerHandle,
} from "@/lib/community/queries";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { PostCard } from "@/components/community/post-card";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { FeedStream, FEED_PAGE } from "@/components/community/feed-stream";
import { PeopleList } from "@/components/community/people-list";
import { UnmuteButton } from "@/components/community/unmute-button";
import { DraftsList } from "@/components/community/drafts-list";
import Link from "next/link";

export const metadata = buildMetadata({ title: "Profile", path: "/community/me", noIndex: true });

export default async function ProfilePage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/login?next=/community/me");

  const handle = await viewerHandle();
  if (!handle) redirect("/community");

  const sb = await supabaseAuthServer();
  const { data: meProfile } = await sb
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const [canPost, posts, total, social, muted, drafts] = await Promise.all([
    viewerCanPost(),
    listFeed({ sort: "new", window: "all", author: handle, limit: FEED_PAGE }),
    // Not posts.length: that only ever counts the first page. Same bug the
    // public profile header carried until #224.
    countAuthorPosts(user.id),
    getSocialCounts(user.id),
    listMutedProfiles(),
    listOwnUnpublished(),
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
        <CommunityAvatar seed={handle} src={(meProfile?.avatar_url as string | null) ?? null} size={48} />
        <div>
          <h1 className="font-display text-lg font-bold">@{handle}</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "post" : "posts"}
          </p>
          <p className="mt-1 flex gap-4 text-sm">
            <Link href={`/community/u/${handle}/followers`} className="hover:underline">
              <strong>{social.followers}</strong>{" "}
              <span className="text-muted-foreground">
                {social.followers === 1 ? "follower" : "followers"}
              </span>
            </Link>
            <Link href={`/community/u/${handle}/following`} className="hover:underline">
              <strong>{social.following}</strong>{" "}
              <span className="text-muted-foreground">following</span>
            </Link>
          </p>
        </div>
      </header>

      {drafts.length > 0 && (
        <section className="mb-2 border-b border-border">
          <h2 className="px-4 pt-3 text-sm font-semibold text-muted-foreground">
            Drafts &amp; scheduled ({drafts.length})
          </h2>
          <DraftsList drafts={drafts} />
        </section>
      )}

      {muted.length > 0 && (
        <section className="mb-2 border-b border-border">
          <h2 className="px-4 pt-3 text-sm font-semibold text-muted-foreground">
            Muted ({muted.length})
          </h2>
          <PeopleList
            people={muted}
            empty=""
            action={(m) => <UnmuteButton username={m.username} />}
          />
        </section>
      )}

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
