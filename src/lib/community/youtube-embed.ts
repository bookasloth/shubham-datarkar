import "server-only";

/**
 * Whether a YouTube video allows third-party embedding, via YouTube's own oEmbed
 * endpoint. 200 = embeddable; 401 = the owner disabled embedding; 404 =
 * private/removed. The request goes to a FIXED host (youtube.com) with only the
 * 11-char id interpolated, so there's no SSRF surface.
 *
 * Fail-OPEN: any ambiguous result (network error, timeout, unexpected status)
 * returns true. A flaky check must never block a post whose video is actually
 * fine — we only want to catch the definitive "embedding disabled" case.
 */
export async function youtubeEmbeddable(videoId: string): Promise<boolean> {
  // Belt-and-braces: the id already comes from parseVideoUrl's 11-char match.
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return true;

  const oembed =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);

  try {
    const res = await fetch(oembed, { signal: AbortSignal.timeout(4000) });
    // 401 = embedding disabled by owner, 404 = private/deleted. Both mean the
    // card would show "Video unavailable", so treat as not-embeddable.
    if (res.status === 401 || res.status === 404) return false;
    return true;
  } catch {
    return true;
  }
}
