import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/** KalamAI analytics events. Mirrors the resource_events pattern. */
export type KalamaiEvent =
  | "analysis_created"
  | "analysis_completed"
  | "analysis_failed"
  | "article_created"
  | "article_completed"
  | "article_failed"
  | "export"
  | "quota_hit"
  | "teaser_viewed";

/** Log an analytics event. Never throws — analytics must not break a request. */
export async function logEvent(
  event: KalamaiEvent,
  fields: {
    userId?: string | null;
    analysisId?: string | null;
    articleId?: string | null;
    meta?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await supabaseAdmin()
      .from("kalamai_events")
      .insert({
        event,
        user_id: fields.userId ?? null,
        analysis_id: fields.analysisId ?? null,
        article_id: fields.articleId ?? null,
        meta: fields.meta ?? null,
      });
  } catch (e) {
    console.warn("[kalamai] logEvent failed", e);
  }
}
