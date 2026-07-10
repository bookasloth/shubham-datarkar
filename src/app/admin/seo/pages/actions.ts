"use server";

import { updateTag } from "next/cache";
import { SEO_AUDIT_TAG } from "@/lib/seo/fetch-html";

/**
 * Drops the cached HTML for every audited route so the next load refetches.
 * `updateTag` (not the deprecated single-arg `revalidateTag`) is the Server-Action
 * API for read-your-own-writes: the reload after clicking waits for fresh data.
 */
export async function rerunAudit(): Promise<void> {
  updateTag(SEO_AUDIT_TAG);
}
