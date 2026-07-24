import Link from "next/link";
import type { MiniProfile } from "@/lib/community/queries";
import { CommunityAvatar } from "./community-avatar";
import { BadgeTick } from "./badge-tick";

/** A plain list of members — followers, following, and the muted list all
 *  render the same row. `action` is whatever button belongs on the right. */
export function PeopleList({
  people,
  empty,
  action,
}: {
  people: MiniProfile[];
  empty: string;
  action?: (p: MiniProfile) => React.ReactNode;
}) {
  if (people.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
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
          {action?.(p)}
        </li>
      ))}
    </ul>
  );
}
