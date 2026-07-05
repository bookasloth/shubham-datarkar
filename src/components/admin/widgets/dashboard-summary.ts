/** Tally post statuses for the dashboard KPIs. Unknown statuses are ignored. */
export function postStatusCounts(
  posts: { status: string }[],
): { published: number; drafts: number; scheduled: number } {
  let published = 0, drafts = 0, scheduled = 0;
  for (const p of posts) {
    if (p.status === "published") published++;
    else if (p.status === "draft") drafts++;
    else if (p.status === "scheduled") scheduled++;
  }
  return { published, drafts, scheduled };
}
