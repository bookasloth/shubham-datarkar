import Link from "next/link";
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getMemberContext } from "@/lib/members/session";
import { listNotifications, type NotificationItem } from "@/lib/community/notifications-queries";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { MarkReadOnMount } from "@/components/community/mark-read-on-mount";
import { timeAgo } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Notifications",
  path: "/community/notifications",
  noIndex: true,
});

/** Verb → human phrasing. The actor's name is rendered separately; this is the
 *  predicate that follows it. */
const PHRASE: Record<NotificationItem["verb"], string> = {
  like: "liked your post",
  reply: "replied to you",
  mention: "mentioned you",
  follow: "started following you",
  reblog: "reblogged your post",
  quote: "quoted your post",
};

/** Where the row points: the post for post-linked verbs, else the actor's
 *  profile (a follow). Falls back to the feed if a handle is somehow missing. */
function hrefFor(n: NotificationItem): string {
  if (n.postPublicId) return `/community/p/${n.postPublicId}`;
  if (n.actorUsername) return `/community/u/${n.actorUsername}`;
  return "/community";
}

export default async function NotificationsPage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/login?next=/community/notifications");

  const items = await listNotifications(50);

  return (
    <div>
      <MarkReadOnMount />
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">Notifications</h1>

      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          Nothing yet. When someone likes, replies, follows, or reblogs, it shows up here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((n) => {
            const name = n.actorDisplayName || (n.actorUsername ? `@${n.actorUsername}` : "Someone");
            return (
              <li key={n.id}>
                <Link
                  href={hrefFor(n)}
                  className={`flex gap-3 px-4 py-3 transition-ui hover:bg-muted/40 ${
                    n.readAt ? "" : "bg-brand/5"
                  }`}
                >
                  <CommunityAvatar seed={n.actorUsername ?? "?"} src={n.actorAvatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-foreground">{name}</span>{" "}
                      <span className="text-muted-foreground">{PHRASE[n.verb]}</span>
                      <span className="text-muted-foreground"> · {timeAgo(n.createdAt)}</span>
                    </p>
                    {n.postSnippet && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{n.postSnippet}</p>
                    )}
                  </div>
                  {!n.readAt && <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-brand" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
