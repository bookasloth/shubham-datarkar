import { avatarUrl, avatarBg } from "@/lib/utils";

/**
 * Member avatar: one of 12 fixed CDN icons on a milk/off-white backdrop, both
 * derived from `seed` (the stable username) so a member's avatar is assigned
 * once and never changes. Plain <img>: the CDN host is CSP-allowed but not in
 * next/image remotePatterns, and these are 40px decorative icons.
 */
export function CommunityAvatar({ seed, size = 40 }: { seed: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size, background: avatarBg(seed) }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarUrl(seed)} alt="" width={size} height={size} className="h-full w-full object-cover" />
    </span>
  );
}
