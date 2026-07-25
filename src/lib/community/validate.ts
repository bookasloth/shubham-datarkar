import { parseVideoUrl } from "@/lib/support/video";
import { containsBlocked } from "./blocklist";
import type { PollData, PostMeta, PostType } from "./types";

const MAX_BODY = 500;
const MAX_IMAGES = 4;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;
const MAX_OPTION_LEN = 80;
const MAX_TITLE = 120;
const MAX_SOURCE = 120;
const MAX_PLACE = 60;
const MAX_TAGS = 5;
const MAX_TAG_LEN = 32;

// A tag is a slug: letters, digits, hyphen. No '#', no spaces — the composer
// strips a leading '#' before it gets here.
const TAG_RE = /^[a-z0-9][a-z0-9-]*$/;

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
  // --- §7 composer fields, all optional ---
  title?: string;
  /** Quote attribution line. */
  source?: string;
  /** Link post URL. Unfurled server-side (validate only checks the scheme). */
  linkUrl?: string;
  tags?: string[];
  /** Free-text place label — never coordinates. */
  place?: string;
  audience?: string;
  /** datetime-local value for a scheduled post; empty = post now. */
  publishAt?: string;
  /** Save as a draft (publish_at null) instead of publishing. */
  saveDraft?: boolean;
};

export type PostValid =
  | {
      ok: true;
      type: PostType;
      body: string | null;
      youtubeId: string | null;
      poll: PollData | null;
      meta: PostMeta | null;
      tags: string[] | null;
      audience: "everyone" | "followers";
      /** ISO string = scheduled; null = draft; undefined = publish now (DB
       *  default). The three states the publish_at column encodes. */
      publishAt: string | null | undefined;
    }
  | { ok: false; error: string };

type Common = {
  meta: PostMeta;
  tags: string[] | null;
  audience: "everyone" | "followers";
  publishAt: string | null | undefined;
};

/** Validate the fields shared by every type (title, tags, place, audience,
 *  schedule). Returns the assembled bits or an error message. */
function validateCommon(input: PostInput): Common | { error: string } {
  const meta: PostMeta = {};

  const title = (input.title ?? "").trim();
  if (title) {
    if (title.length > MAX_TITLE) return { error: `Keep the title under ${MAX_TITLE} characters.` };
    if (containsBlocked(title)) return { error: "That title looks like explicit content." };
    meta.title = title;
  }

  const place = (input.place ?? "").trim();
  if (place) {
    if (place.length > MAX_PLACE) return { error: `Keep the location under ${MAX_PLACE} characters.` };
    if (containsBlocked(place)) return { error: "That location looks off." };
    meta.place = place;
  }

  let tags: string[] | null = null;
  const rawTags = (input.tags ?? [])
    .map((t) => t.trim().replace(/^#/, "").toLowerCase())
    .filter((t) => t.length > 0);
  if (rawTags.length) {
    const unique = [...new Set(rawTags)];
    if (unique.length > MAX_TAGS) return { error: `Up to ${MAX_TAGS} tags.` };
    for (const t of unique) {
      if (t.length > MAX_TAG_LEN) return { error: `Each tag must be under ${MAX_TAG_LEN} characters.` };
      if (!TAG_RE.test(t)) return { error: "Tags can only use letters, numbers and hyphens." };
      if (containsBlocked(t)) return { error: "That tag looks like explicit content." };
    }
    tags = unique;
  }

  const audience = input.audience === "followers" ? "followers" : "everyone";

  // Schedule/draft: draft wins if both are set. A scheduled time must be in the
  // future, or it's just "post now" with extra steps.
  let publishAt: string | null | undefined;
  if (input.saveDraft) {
    publishAt = null;
  } else {
    const raw = (input.publishAt ?? "").trim();
    if (raw) {
      const when = new Date(raw);
      if (Number.isNaN(when.getTime())) return { error: "That publish time isn't valid." };
      if (when.getTime() <= Date.now()) return { error: "A scheduled time must be in the future." };
      publishAt = when.toISOString();
    }
  }

  return { meta, tags, audience, publishAt };
}

export function validatePost(input: PostInput): PostValid {
  const type = input.type;
  const KNOWN: PostType[] = ["text", "image", "youtube", "poll", "quote", "link", "chat"];
  if (!KNOWN.includes(type as PostType)) return { ok: false, error: "Unknown post type." };

  const body = input.body.trim();
  if (body.length > MAX_BODY) return { ok: false, error: `Keep it under ${MAX_BODY} characters.` };
  if (containsBlocked(body)) return { ok: false, error: "That post looks like explicit content." };

  const common = validateCommon(input);
  if ("error" in common) return { ok: false, error: common.error };
  const base = {
    ok: true as const,
    tags: common.tags,
    audience: common.audience,
    publishAt: common.publishAt,
  };
  const ok = (
    t: PostType,
    extra: { body: string | null; youtubeId?: string | null; poll?: PollData | null; meta?: PostMeta },
  ): PostValid => ({
    ...base,
    type: t,
    body: extra.body,
    youtubeId: extra.youtubeId ?? null,
    poll: extra.poll ?? null,
    meta: metaOrNull(extra.meta ?? common.meta),
  });

  if (type === "text") {
    if (body.length === 0) return { ok: false, error: "Write something first." };
    return ok("text", { body });
  }

  if (type === "chat") {
    // A chat post is "Name: line" per line. Require at least one such line so it
    // renders as a script, not just a paragraph with a colon in it.
    if (body.length === 0) return { ok: false, error: "Write the conversation first." };
    const hasSpeaker = body.split("\n").some((line) => /^\s*[^:\n]{1,40}:\s+\S/.test(line));
    if (!hasSpeaker) return { ok: false, error: 'Use "Name: message" on each line.' };
    return ok("chat", { body });
  }

  if (type === "quote") {
    if (body.length === 0) return { ok: false, error: "Add the quote." };
    const source = (input.source ?? "").trim();
    if (source.length > MAX_SOURCE) return { ok: false, error: `Keep the source under ${MAX_SOURCE} characters.` };
    if (source && containsBlocked(source)) return { ok: false, error: "That source looks off." };
    const meta = { ...common.meta, ...(source ? { source } : {}) };
    return ok("quote", { body, meta });
  }

  if (type === "link") {
    const url = (input.linkUrl ?? "").trim();
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, error: "Paste a valid link (http:// or https://)." };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Only http and https links are allowed." };
    }
    // body is optional commentary on the link.
    const meta = { ...common.meta, url: parsed.toString() };
    return ok("link", { body: body || null, meta });
  }

  if (type === "image") {
    if (input.imageCount < 1) return { ok: false, error: "Attach at least one image." };
    if (input.imageCount > MAX_IMAGES) return { ok: false, error: `Up to ${MAX_IMAGES} images.` };
    return ok("image", { body: body || null });
  }

  if (type === "youtube") {
    const video = parseVideoUrl(input.youtubeUrl);
    if (!video || video.provider !== "youtube") {
      return { ok: false, error: "Paste a valid YouTube link." };
    }
    return ok("youtube", { body: body || null, youtubeId: video.videoId });
  }

  // poll
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
    const origCorrect = Number(input.pollCorrect);
    const correct = Number.isInteger(origCorrect)
      ? kept.findIndex((o) => o.origIndex === origCorrect)
      : -1;
    if (correct < 0) return { ok: false, error: "Mark the correct answer." };
    poll.mode = "quiz";
    poll.correct = correct;
  }

  return ok("poll", { body: body || null, poll });
}

/** An all-empty meta object is stored as null, not `{}`. */
function metaOrNull(meta: PostMeta): PostMeta | null {
  return Object.keys(meta).length > 0 ? meta : null;
}
