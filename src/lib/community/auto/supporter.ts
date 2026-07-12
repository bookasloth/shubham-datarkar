import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import { autoPost } from "./post";
import { pick } from "./templates";
import type { SupportRow } from "@/lib/support/server";

const SUPPORTER_THRESHOLDS = [10, 25, 50, 100, 250];

/** The crossed threshold, or null. Exact match — supporters land one at a time. */
export function supporterMilestoneFor(count: number): number | null {
  return SUPPORTER_THRESHOLDS.includes(count) ? count : null;
}

/**
 * On a freshly-paid support: post an ANONYMOUS shout-out to /community (never
 * the supporter's name — no review gate to catch a mistake) plus a support CTA,
 * and, if the paid-supporter count just hit a threshold, a milestone post.
 * Best-effort via autoPost; the count query is guarded too.
 */
export async function postCommunitySupporter(_support: SupportRow): Promise<void> {
  const url = `${site.url}/support`;
  await autoPost({ sourceKey: `supporter:${_support.id}`, body: pick("supporter", { url }) });

  const { count, error } = await supabaseAdmin()
    .from("supports")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid");
  if (error) {
    console.warn("[auto] supporter count failed:", error.message);
    return;
  }
  const n = supporterMilestoneFor(count ?? 0);
  if (n) await autoPost({ sourceKey: `supporter-milestone:${n}`, body: pick("supporterMilestone", { n, url }) });
}
