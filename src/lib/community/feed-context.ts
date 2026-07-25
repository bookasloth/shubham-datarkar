import type { FeedSort, FeedWindow } from "./types";

const WINDOW_PHRASE: Record<FeedWindow, string> = {
  all: "of all time",
  today: "today",
  week: "this week",
  month: "this month",
  year: "this year",
};

/**
 * The honest "why you're seeing this" line for a stream. Same for every note in
 * the stream by design — it's rendered once at the top, not per note. Priority:
 * logged-out preview → following → tag → sort. Pure; derives only from the query.
 */
export function feedContextLine(
  q: { sort?: FeedSort; window?: FeedWindow; following?: boolean; tag?: string },
  signedIn: boolean,
): string {
  if (!signedIn) return "A few notes at random. Sign in to read the whole feed.";
  if (q.following) return "Only the people you follow.";
  if (q.tag) return `Notes tagged #${q.tag}.`;
  switch (q.sort) {
    case "hot":
      return "A one-time shuffle. Refresh for a new order — no profile of you involved.";
    case "top":
      return `The most-liked notes ${WINDOW_PHRASE[q.window ?? "all"]}.`;
    default:
      return "Latest notes, newest first. Nothing is ranked or hidden.";
  }
}
