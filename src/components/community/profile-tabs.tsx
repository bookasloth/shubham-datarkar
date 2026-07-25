import Link from "next/link";

export const PROFILE_TABS = ["posts", "about", "media", "network", "financial"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

const LABELS: Record<ProfileTab, string> = {
  posts: "Posts",
  about: "About",
  media: "Media",
  network: "Network",
  financial: "Financial Help",
};

export function ProfileTabs({ username, active }: { username: string; active: ProfileTab }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-2">
      {PROFILE_TABS.map((tab) => {
        const href = tab === "posts" ? `/community/u/${username}` : `/community/u/${username}?tab=${tab}`;
        const on = tab === active;
        return (
          <Link
            key={tab}
            href={href}
            className={`whitespace-nowrap px-3 py-3 text-sm font-medium ${
              on ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {LABELS[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
