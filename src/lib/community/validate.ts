import { parseVideoUrl } from "@/lib/support/video";
import { containsBlocked } from "./blocklist";

const MAX_BODY = 500;
const MAX_IMAGES = 4;

export type PostInput = { type: string; body: string; imageCount: number; youtubeUrl: string };
export type PostValid =
  | { ok: true; type: "text" | "image" | "youtube"; body: string | null; youtubeId: string | null }
  | { ok: false; error: string };

export function validatePost(input: PostInput): PostValid {
  const type = input.type;
  if (type !== "text" && type !== "image" && type !== "youtube") {
    return { ok: false, error: "Unknown post type." };
  }

  const body = input.body.trim();
  if (body.length > MAX_BODY) return { ok: false, error: `Keep it under ${MAX_BODY} characters.` };
  if (type === "text" && body.length === 0) return { ok: false, error: "Write something first." };
  if (containsBlocked(body)) return { ok: false, error: "That post looks like explicit content." };

  if (type === "image") {
    if (input.imageCount < 1) return { ok: false, error: "Attach at least one image." };
    if (input.imageCount > MAX_IMAGES) return { ok: false, error: `Up to ${MAX_IMAGES} images.` };
    return { ok: true, type, body: body || null, youtubeId: null };
  }

  if (type === "youtube") {
    const video = parseVideoUrl(input.youtubeUrl);
    if (!video || video.provider !== "youtube") {
      return { ok: false, error: "Paste a valid YouTube link." };
    }
    return { ok: true, type, body: body || null, youtubeId: video.videoId };
  }

  return { ok: true, type: "text", body, youtubeId: null };
}
