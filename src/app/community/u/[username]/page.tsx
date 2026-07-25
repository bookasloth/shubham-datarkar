import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getMemberContext } from "@/lib/members/session";
import {
  getProfileByUsername,
  getSocialCounts,
  listAuthorMedia,
  listFeed,
  listPollResults,
  listRandomFeed,
  viewerCanPost,
} from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { SignInWall } from "@/components/community/sign-in-wall";
import { FeedStream, FEED_PAGE } from "@/components/community/feed-stream";
import { ProfileHeader } from "@/components/community/profile-header";
import { ProfileTabs, PROFILE_TABS, type ProfileTab } from "@/components/community/profile-tabs";
import Link from "next/link";

/** Posts a logged-out visitor sees before the wall — matches /community. */
const PREVIEW = 3;

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
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  // An unknown handle 404s rather than rendering an empty feed — a mistyped
  // @mention should look broken, not like a real member with nothing to say.
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const tab: ProfileTab = (PROFILE_TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as ProfileTab)
    : "posts";

  const { user } = await getMemberContext();
  const isSelf = user?.id === profile.id;
  const social = await getSocialCounts(profile.id);

  return (
    <div>
      <ProfileHeader
        profile={profile}
        social={social}
        isSelf={isSelf}
        showFollow={Boolean(user) && !isSelf}
      />
      <ProfileTabs username={profile.username} active={tab} />

      {tab === "posts" && <PostsTab profile={profile} user={user} />}
      {tab === "about" && <AboutTab profile={profile} />}
      {tab === "media" && <MediaTab userId={profile.id} user={user} username={profile.username} />}
      {tab === "network" && <NetworkTab profile={profile} social={social} />}
      {tab === "financial" && <FinancialTab />}
    </div>
  );
}

async function PostsTab({
  profile,
  user,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;
  user: Awaited<ReturnType<typeof getMemberContext>>["user"];
}) {
  // Logged out, a profile is gated exactly like the feed — it IS a feed, just
  // filtered to one author. Leaving it open would be the hole around /community.
  const [canPost, posts] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    user
      ? listFeed({ sort: "new", window: "all", author: profile.username, limit: FEED_PAGE })
      : listRandomFeed(PREVIEW, { author: profile.username }),
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
      viewerId={user?.id ?? null}
    />
  ));

  if (posts.length === 0) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">No posts yet.</p>;
  }
  return (
    <>
      {user ? (
        <FeedStream query={{ author: profile.username }} initialCount={posts.length}>
          {cards}
        </FeedStream>
      ) : (
        cards
      )}
      {!user && <SignInWall returnPath={`/community/u/${profile.username}`} />}
    </>
  );
}

function AboutTab({
  profile,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;
}) {
  const since = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="space-y-4 px-4 py-6 text-sm">
      {profile.headline && (
        <div>
          <h2 className="mb-1 font-display font-semibold">Headline</h2>
          <p>{profile.headline}</p>
        </div>
      )}
      <div>
        <h2 className="mb-1 font-display font-semibold">About</h2>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {profile.bio ?? "Nothing here yet."}
        </p>
      </div>
      <div>
        <h2 className="mb-1 font-display font-semibold">Member since</h2>
        <p className="text-muted-foreground">{since}</p>
      </div>
    </div>
  );
}

async function MediaTab({
  userId,
  user,
  username,
}: {
  userId: string;
  user: Awaited<ReturnType<typeof getMemberContext>>["user"];
  username: string;
}) {
  if (!user) {
    return <SignInWall returnPath={`/community/u/${username}?tab=media`} />;
  }
  const media = await listAuthorMedia(userId);
  if (media.length === 0) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">No media yet.</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {media.map((m, i) => (
        <Link key={`${m.publicId}-${i}`} href={`/community/p/${m.publicId}`} className="block aspect-square overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt="" className="h-full w-full object-cover" />
        </Link>
      ))}
    </div>
  );
}

function NetworkTab({
  profile,
  social,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;
  social: Awaited<ReturnType<typeof getSocialCounts>>;
}) {
  return (
    <div className="flex gap-4 px-4 py-6 text-sm">
      <Link href={`/community/u/${profile.username}/followers`} className="rounded-lg border border-border px-4 py-3 hover:bg-muted">
        <strong className="text-lg">{social.followers}</strong>
        <span className="ml-1 text-muted-foreground">{social.followers === 1 ? "follower" : "followers"}</span>
      </Link>
      <Link href={`/community/u/${profile.username}/following`} className="rounded-lg border border-border px-4 py-3 hover:bg-muted">
        <strong className="text-lg">{social.following}</strong>
        <span className="ml-1 text-muted-foreground">following</span>
      </Link>
    </div>
  );
}

function FinancialTab() {
  return (
    <div className="px-4 py-10 text-center">
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        Support the creator directly.
      </p>
      <Link
        href="/support"
        className="mt-4 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90"
      >
        Go to Support
      </Link>
    </div>
  );
}
