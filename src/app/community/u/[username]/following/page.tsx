import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { getMemberContext } from "@/lib/members/session";
import { getProfileByUsername, listFollowing } from "@/lib/community/queries";
import { PeopleList } from "@/components/community/people-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return buildMetadata({
    title: `@${username} is following`,
    path: `/community/u/${username}/following`,
    noIndex: true,
  });
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  // Gated exactly like the profile it hangs off — a member list is people data,
  // and leaving it open would be a way to enumerate the membership.
  const { user } = await getMemberContext();
  if (!user)
    redirect(`/members/login?next=/community/u/${profile.username}/following`);

  const people = await listFollowing(profile.id);

  return (
    <div>
      <header className="flex items-center gap-3 border-b border-border px-4 py-4">
        <Link
          href={`/community/u/${profile.username}`}
          aria-label="Back to profile"
          className="rounded-btn p-1 text-muted-foreground transition-ui hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-bold">
          Following{" "}
          <span className="font-normal text-muted-foreground">
            @{profile.username}
          </span>
        </h1>
      </header>
      <PeopleList
        people={people}
        empty="This account doesn't follow anyone yet."
      />
    </div>
  );
}
