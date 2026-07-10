"use server";

import { updateTag } from "next/cache";
import { SEO_AUDIT_TAG } from "@/lib/seo/fetch-html";

/**
 * Invalidates the cached page analyses (tagged `SEO_AUDIT_TAG` by
 * `unstable_cache` in analyzer.ts) so the next load re-audits from fresh HTML.
 * `updateTag` (not the deprecated single-arg `revalidateTag`) is the Server-Action
 * API for read-your-own-writes: the reload after clicking waits for fresh data.
 */
export async function rerunAudit(): Promise<void> {
  updateTag(SEO_AUDIT_TAG);
}
