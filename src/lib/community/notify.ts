import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type NotifyVerb = "like" | "reply" | "mention" | "follow" | "reblog" | "quote";

/**
 * Record one in-app notification. The single choke point every community action
 * calls, so the rules live in one place:
 *   - never notify yourself,
 *   - never notify someone who muted the actor (mute quiets them, notifications
 *     included),
 *   - best-effort: any failure logs and returns, exactly like the email
 *     notifiers — a notification must never break the write that earned it.
 *
 * Written with the service role (bypasses RLS); there is no client INSERT policy
 * on community_notifications by design.
 */
export async function notify(input: {
  recipientId: string;
  actorId: string;
  verb: NotifyVerb;
  /** The post to deep-link to. Null for a follow (links to the actor instead). */
  postId?: string | null;
}): Promise<void> {
  const { recipientId, actorId, verb, postId = null } = input;
  if (!recipientId || recipientId === actorId) return; // never self
  try {
    const admin = supabaseAdmin();
    // Suppress if the recipient has muted the actor — mute silences them here too.
    const { data: muted } = await admin
      .from("community_mutes")
      .select("muted_id")
      .eq("muter_id", recipientId)
      .eq("muted_id", actorId)
      .maybeSingle();
    if (muted) return;

    await admin.from("community_notifications").insert({
      user_id: recipientId,
      actor_id: actorId,
      verb,
      post_id: postId,
    });
  } catch (e) {
    console.warn("[notify] insert failed:", (e as Error).message);
  }
}
