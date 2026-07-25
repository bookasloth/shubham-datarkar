import Link from "next/link";
import type { MiniProfile } from "@/lib/community/queries";
import { CommunityAvatar } from "./community-avatar";
import { BadgeTick } from "./badge-tick";
import { FollowButton } from "./follow-button";

/** Empty Following feed. The suggestions are the most-followed members, so the
 *  fix for "nothing here" is one tap away instead of a dead sentence. */
export function SuggestedFollows({ people }: { people: MiniProfile[] }) {
  if (people.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-sm text-muted-foreground">
        Follow a few people and their posts land here.
      </p>
    );
  }

  return (
    <div className="px-4 py-10">
      <h2 className="font-display text-base font-bold">Nothing here yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Follow a few people and this becomes your feed.
      </p>

      <ul className="mt-5 divide-y divide-border border-y border-border">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <CommunityAvatar seed={p.username} src={p.avatarUrl} size={40} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/community/u/${p.username}`}
                className="flex items-center gap-1.5 truncate text-sm font-medium hover:underline"
              >
                {p.displayName ?? `@${p.username}`}
                <BadgeTick badge={p.badge} />
              </Link>
              <p className="truncate text-sm text-muted-foreground">
                @{p.username}
              </p>
            </div>
            {/* initialFollowers is 0 and the count is hidden: this list only
                renders people the viewer does NOT follow, and the real count
                comes back from the server on the first toggle. */}
            <FollowButton
              username={p.username}
              initialFollowing={false}
              initialFollowers={0}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
