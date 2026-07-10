import { parseVideoUrl } from "@/lib/support/video";
import { containsBlocked } from "./blocklist";
import type { PollData } from "./types";

const MAX_BODY = 500;
const MAX_IMAGES = 4;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;
const MAX_OPTION_LEN = 80;

export type PostInput = {
  type: string;
  body: string;
  imageCount: number;
  youtubeUrl: string;
  pollOptions?: string[];
  pollClosesAt?: string;
};

export type PostValid =
  | {
      ok: true;
      type: "text" | "image" | "youtube" | "poll";
      body: string | null;
      youtubeId: string | null;
      poll: PollData | null;
    }
  | { ok: false; error: string };

export function validatePost(input: PostInput): PostValid {
  const type = input.type;
  if (type !== "text" && type !== "image" && type !== "youtube" && type !== "poll") {
    return { ok: false, error: "Unknown post type." };
  }

  const body = input.body.trim();
  if (body.length > MAX_BODY) return { ok: false, error: `Keep it under ${MAX_BODY} characters.` };
  if (type === "text" && body.length === 0) return { ok: false, error: "Write something first." };
  if (containsBlocked(body)) return { ok: false, error: "That post looks like explicit content." };

  if (type === "image") {
    if (input.imageCount < 1) return { ok: false, error: "Attach at least one image." };
    if (input.imageCount > MAX_IMAGES) return { ok: false, error: `Up to ${MAX_IMAGES} images.` };
    return { ok: true, type, body: body || null, youtubeId: null, poll: null };
  }

  if (type === "youtube") {
    const video = parseVideoUrl(input.youtubeUrl);
    if (!video || video.provider !== "youtube") {
      return { ok: false, error: "Paste a valid YouTube link." };
    }
    return { ok: true, type, body: body || null, youtubeId: video.videoId, poll: null };
  }

  if (type === "poll") {
    const options = (input.pollOptions ?? []).map((o) => o.trim()).filter((o) => o.length > 0);
    if (options.length < MIN_OPTIONS) return { ok: false, error: `Add at least ${MIN_OPTIONS} options.` };
    if (options.length > MAX_OPTIONS) return { ok: false, error: `Up to ${MAX_OPTIONS} options.` };
    if (options.some((o) => o.length > MAX_OPTION_LEN)) {
      return { ok: false, error: `Each option must be under ${MAX_OPTION_LEN} characters.` };
    }
    if (options.some((o) => containsBlocked(o))) {
      return { ok: false, error: "That poll looks like explicit content." };
    }

    const raw = (input.pollClosesAt ?? "").trim();
    let closesAt: string | undefined;
    if (raw) {
      const when = new Date(raw);
      if (Number.isNaN(when.getTime())) return { ok: false, error: "That closing time isn't valid." };
      if (when.getTime() <= Date.now()) return { ok: false, error: "Closing time must be in the future." };
      closesAt = when.toISOString();
    }

    const poll: PollData = {
      options: options.map((label, i) => ({ i, label })),
      ...(closesAt ? { closes_at: closesAt } : {}),
    };
    return { ok: true, type, body: body || null, youtubeId: null, poll };
  }

  return { ok: true, type: "text", body, youtubeId: null, poll: null };
}
