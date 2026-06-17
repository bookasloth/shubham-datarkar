/** Parse a YouTube/Vimeo share URL into embed metadata. Pure — no server deps. */

export type VideoEmbed = {
  provider: "youtube" | "vimeo";
  videoId: string;
  embedUrl: string;
};

export function parseVideoUrl(input: string): VideoEmbed | null {
  const url = (input ?? "").trim();
  if (!url) return null;

  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (yt) {
    return { provider: "youtube", videoId: yt[1], embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  }

  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return { provider: "vimeo", videoId: vm[1], embedUrl: `https://player.vimeo.com/video/${vm[1]}` };
  }

  return null;
}
