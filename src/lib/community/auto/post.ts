import "server-only";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerProfileId } from "./owner";

/**
 * Insert one owner-authored text post to /community. Idempotent per `sourceKey`
 * (unique auto_key; a 23505 means it was already posted → success). Best-effort:
 * any failure only logs, never throws, so it can never break the host action.
 */
export async function autoPost(input: {
  sourceKey: string;
  body: string;
  thread?: string | null;
  version?: string | null;
  tags?: string[] | null;
}): Promise<void> {
  try {
    const owner = await getOwnerProfileId();
    if (!owner) return; // owner.ts already warned
    const { error } = await supabaseAdmin()
      .from("community_posts")
      .insert({
        user_id: owner,
        type: "text",
        body: input.body.slice(0, 500),
        auto_key: input.sourceKey,
        thread: input.thread ?? null,
        version: input.version ?? null,
        // The feed's tag filter (?tag=sd) matches the tags[] column, not body
        // text — so the embedded #hashtag must also land here to be findable.
        tags: input.tags?.length ? input.tags : null,
      });
    if (error && error.code !== "23505") {
      console.warn("[auto] insert failed", input.sourceKey, error.message);
      return;
    }
    revalidatePath("/community");
  } catch (e) {
    console.warn("[auto] autoPost threw", input.sourceKey, (e as Error).message);
  }
}
