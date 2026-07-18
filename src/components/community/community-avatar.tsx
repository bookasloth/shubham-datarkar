import { avatarUrl, avatarBg } from "@/lib/utils";

/**
 * Member avatar. With `src` (a stored profile photo) it renders that image;
 * without, it falls back to one of 12 fixed CDN icons on a milk backdrop, both
 * derived from `seed` (the stable username) so the icon is assigned once and
 * never changes. Plain <img>: the hosts are CSP-allowed but decorative and
 * small, so next/image optimization isn't worth the config.
 */
export function CommunityAvatar({
  seed,
  src,
  size = 40,
}: {
  seed: string;
  src?: string | null;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size, background: src ? undefined : avatarBg(seed) }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || avatarUrl(seed)}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
