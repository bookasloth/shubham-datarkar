"use server";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { notifyFollow } from "./community-notify";
import { notify } from "./notify";
import { GATE } from "./gate-messages";

export type FollowResult =
  { following: boolean; followers: number } | { error: string };
export type MuteResult = { muted: boolean } | { error: string };

/** Handles are lowercase alnum plus dot/underscore/dash — real ones contain dots. */
const HANDLE_RE = /^[a-z0-9._-]{1,64}$/;

/**
 * Resolve an untrusted handle to a member id, with the same gate every
 * engagement write uses.
 *
 * The handle arrives from a browser, so it is charset-checked before it reaches
 * the query rather than trusted into an `.eq()`.
 */
type ResolvedTarget =
  | { error: string; sb?: undefined }
  | {
      error?: undefined;
      sb: Awaited<ReturnType<typeof supabaseAuthServer>>;
      user: { id: string };
      targetId: string;
      handle: string;
    };

async function resolveTarget(username: string): Promise<ResolvedTarget> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: GATE.SIGNED_OUT as string };

  const { data: canPost } = await sb.rpc("community_can_post");
  if (!canPost) return { error: GATE.UNVERIFIED as string };

  const handle = username.trim().toLowerCase();
  if (!HANDLE_RE.test(handle))
    return { error: "That handle doesn't look right." };

  const { data: target } = await sb
    .from("profiles")
    .select("id, banned")
    .eq("username", handle)
    .maybeSingle();
  if (!target || target.banned) return { error: "No such member." };

  return { sb, user, targetId: target.id as string, handle };
}

/** Public follower count for a member. Follows are public, so this is readable
 *  by anyone — the RLS select policy is `using (true)`. */
async function countFollowers(
  sb: Awaited<ReturnType<typeof supabaseAuthServer>>,
  userId: string,
): Promise<number> {
  const { count } = await sb
    .from("community_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followee_id", userId);
  return count ?? 0;
}

/**
 * Follow or unfollow a member. Returns the resulting state so the optimistic
 * button can reconcile against the truth instead of assuming its own guess held.
 *
 * The composite primary key is the idempotency guard: a double-click can't
 * create two rows, so a 23505 means the end state is already what was wanted.
 */
export async function toggleFollow(username: string): Promise<FollowResult> {
  const r = await resolveTarget(username);
  if (r.error !== undefined || r.sb === undefined)
    return { error: r.error ?? "Something went wrong." };
  const { sb, user, targetId } = r;

  // Also enforced by the no_self_follow CHECK; caught here for a readable message.
  if (targetId === user.id) return { error: "You can't follow yourself." };

  const { data: existing } = await sb
    .from("community_follows")
    .select("followee_id")
    .eq("follower_id", user.id)
    .eq("followee_id", targetId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from("community_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", targetId);
    if (error) return { error: error.message };
    return { following: false, followers: await countFollowers(sb, targetId) };
  }

  const { error } = await sb
    .from("community_follows")
    .insert({ follower_id: user.id, followee_id: targetId });
  if (error && error.code !== "23505") return { error: error.message };

  // Best-effort and awaited after the write is committed — a dead SMTP box must
  // never fail a follow that already happened.
  await notifyFollow(targetId, user.id);
  // In-app follow notification (no post to link — the bell resolves it to the
  // actor's profile).
  await notify({ recipientId: targetId, actorId: user.id, verb: "follow" });
  return { following: true, followers: await countFollowers(sb, targetId) };
}

/**
 * Mute or unmute a member.
 *
 * Mute is applied unconditionally inside `community_feed` and
 * `community_replies`, so the feed has to be refetched for it to take effect —
 * this is the one social write that DOES revalidate. Unlike like/bookmark, the
 * change isn't confined to one card: it removes every post by that author.
 */
export async function toggleMute(username: string): Promise<MuteResult> {
  const r = await resolveTarget(username);
  if (r.error !== undefined || r.sb === undefined)
    return { error: r.error ?? "Something went wrong." };
  const { sb, user, targetId } = r;

  if (targetId === user.id) return { error: "You can't mute yourself." };

  const { data: existing } = await sb
    .from("community_mutes")
    .select("muted_id")
    .eq("muter_id", user.id)
    .eq("muted_id", targetId)
    .maybeSingle();

  const { error } = existing
    ? await sb
        .from("community_mutes")
        .delete()
        .eq("muter_id", user.id)
        .eq("muted_id", targetId)
    : await sb
        .from("community_mutes")
        .insert({ muter_id: user.id, muted_id: targetId });
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/community");
  revalidatePath("/community/me");
  // NO notification, ever. Mute is private — the RLS policy is self-only read
  // precisely so a muted member can't discover they're muted, and an email would
  // hand them the fact the policy is hiding.
  return { muted: !existing };
}
