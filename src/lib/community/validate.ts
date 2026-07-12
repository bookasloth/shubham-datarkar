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
  /** "quiz" turns the poll into a quiz; anything else is a plain poll. */
  pollMode?: string;
  /** Original array position (pre-filter) of the correct option, when quiz. */
  pollCorrect?: string;
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
    // Keep the original array position so a quiz's marked-correct index can be
    // re-mapped after blanks are dropped (else deleting a blank shifts the answer).
    const kept = (input.pollOptions ?? [])
      .map((o, origIndex) => ({ origIndex, label: o.trim() }))
      .filter((o) => o.label.length > 0);
    if (kept.length < MIN_OPTIONS) return { ok: false, error: `Add at least ${MIN_OPTIONS} options.` };
    if (kept.length > MAX_OPTIONS) return { ok: false, error: `Up to ${MAX_OPTIONS} options.` };
    if (kept.some((o) => o.label.length > MAX_OPTION_LEN)) {
      return { ok: false, error: `Each option must be under ${MAX_OPTION_LEN} characters.` };
    }
    if (kept.some((o) => containsBlocked(o.label))) {
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
      options: kept.map((o, i) => ({ i, label: o.label })),
      ...(closesAt ? { closes_at: closesAt } : {}),
    };

    if (input.pollMode === "quiz") {
      // pollCorrect is the ORIGINAL position; re-map it to the kept index.
      const origCorrect = Number(input.pollCorrect);
      const correct = Number.isInteger(origCorrect)
        ? kept.findIndex((o) => o.origIndex === origCorrect)
        : -1;
      if (correct < 0) return { ok: false, error: "Mark the correct answer." };
      poll.mode = "quiz";
      poll.correct = correct;
    }

    return { ok: true, type, body: body || null, youtubeId: null, poll };
  }

  return { ok: true, type: "text", body, youtubeId: null, poll: null };
}
