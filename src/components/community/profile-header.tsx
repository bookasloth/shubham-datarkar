import Image from "next/image";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { BadgeTick } from "@/components/community/badge-tick";
import { FollowButton } from "@/components/community/follow-button";
import { CoverUploader } from "@/components/community/cover-uploader";
import { ProfileTextEdit } from "@/components/community/profile-text-edit";
import type { Badge } from "@/lib/community/types";

const BADGE_LABEL: Record<Badge, string | null> = {
  gold: "Founder",
  orange: "Supporter",
  grey: null, // plain verified — the tick alone, no pill
};

export type ProfileHeaderProps = {
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    headline: string | null;
    coverUrl: string | null;
    createdAt: string;
    bio: string | null;
    badge: Badge;
  };
  social: { followers: number; following: number; viewerFollows: boolean | null };
  isSelf: boolean;
  showFollow: boolean;
};

export function ProfileHeader({ profile, social, isSelf, showFollow }: ProfileHeaderProps) {
  const name = profile.displayName ?? `@${profile.username}`;
  const pill = BADGE_LABEL[profile.badge];
  const since = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="border-b border-border">
      {/* Cover band */}
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-muted to-muted-foreground/20 sm:h-52">
        {profile.coverUrl && (
          <Image src={profile.coverUrl} alt="" fill sizes="(max-width: 640px) 100vw, 600px" className="object-cover" />
        )}
        {isSelf && <CoverUploader current={profile.coverUrl} />}
      </div>

      {/* Avatar overlaps the cover */}
      <div className="px-4">
        <div className="-mt-10 flex items-end justify-between">
          <div className="rounded-full ring-4 ring-background">
            <CommunityAvatar seed={profile.username} src={profile.avatarUrl} size={80} />
          </div>
          {showFollow && (
            <FollowButton
              username={profile.username}
              initialFollowing={social.viewerFollows ?? false}
              initialFollowers={social.followers}
            />
          )}
          {isSelf && <ProfileTextEdit headline={profile.headline} bio={profile.bio} />}
        </div>

        <div className="mt-2 pb-4">
          <h1 className="flex items-center gap-1.5 font-display text-xl font-bold">
            {name}
            <BadgeTick badge={profile.badge} />
            {pill && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {pill}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.headline && <p className="mt-1 text-sm">{profile.headline}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Member since {since}</p>
        </div>
      </div>
    </header>
  );
}
