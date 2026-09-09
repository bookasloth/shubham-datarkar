import type { Platform } from "@/lib/playlists/types";

// Official embed players only (Spotify / Apple / YouTube). The iframe hosts are
// on the CSP frame-src allowlist (see next.config.ts). Never hosts audio itself.
const HEIGHTS: Partial<Record<Platform, string>> = {
  spotify: "352",
  apple_music: "450",
  youtube: "",
};

/** Embedded external player. Renders nothing when there's no supported embed. */
export function PlaylistEmbed({
  platform,
  embedUrl,
  title,
}: {
  platform: Platform;
  embedUrl: string | null;
  title: string;
}) {
  if (!embedUrl) return null;

  if (platform === "youtube") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-card border border-border bg-black">
        <iframe
          src={embedUrl}
          title={`${title} — player`}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <iframe
      src={embedUrl}
      title={`${title} — player`}
      height={HEIGHTS[platform] ?? "352"}
      className="w-full overflow-hidden rounded-card border border-border"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  );
}
