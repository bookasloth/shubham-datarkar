"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

const ADMIN_PATH = "/admin/community";

/**
 * Two independent admin gates exist: requireAdmin() reads ADMIN_EMAIL from env,
 * while the RLS policies call is_admin() (JWT email literal). If they ever
 * disagree, the RLS-guarded writes below would filter to zero rows and report
 * success — the console would look like it worked and silently do nothing.
 * Check both, and fail loudly.
 */
async function adminClient() {
  await requireAdmin();
  const sb = await supabaseAuthServer();
  const { data: ok } = await sb.rpc("is_admin");
  if (!ok) {
    throw new Error("Admin gates disagree: ADMIN_EMAIL does not match the database is_admin().");
  }
  return sb;
}

/** A moderation write that touches no rows means RLS filtered it — not success. */
function assertTouched(rows: unknown[] | null, what: string): void {
  if (!rows || rows.length === 0) throw new Error(`${what} affected no rows.`);
}

export async function resolveReport(reportId: string): Promise<void> {
  const sb = await adminClient();
  const { data, error } = await sb
    .from("community_reports")
    .update({ resolved: true })
    .eq("id", reportId)
    .select("id");
  if (error) throw new Error(error.message);
  assertTouched(data, "Resolve report");
  revalidatePath(ADMIN_PATH);
}

/**
 * `hidden_notified` records whether the author was MEANT to be told. No email
 * is sent here — wire a notifier separately if that's ever needed.
 */
export async function setPostHidden(
  postId: string,
  hidden: boolean,
  reason: string,
  notify: boolean,
): Promise<void> {
  const sb = await adminClient();
  const { data, error } = await sb
    .from("community_posts")
    .update({
      hidden,
      hidden_reason: hidden ? reason.trim().slice(0, 300) || null : null,
      hidden_notified: hidden ? notify : false,
    })
    .eq("id", postId)
    .select("id");
  if (error) throw new Error(error.message);
  assertTouched(data, "Hide post");
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}

export async function setPostDemoted(postId: string, demoted: boolean): Promise<void> {
  const sb = await adminClient();
  const { data, error } = await sb
    .from("community_posts")
    .update({ demoted })
    .eq("id", postId)
    .select("id");
  if (error) throw new Error(error.message);
  assertTouched(data, "Demote post");
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}

export async function adminDeletePost(postId: string): Promise<void> {
  const sb = await adminClient();
  const { data, error } = await sb
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .select("id");
  if (error) throw new Error(error.message);
  assertTouched(data, "Delete post");
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}

/** profiles is self-write only — banning must go through the admin-gated RPC. */
export async function setUserBanned(userId: string, banned: boolean, reason: string): Promise<void> {
  const sb = await adminClient();
  const { error } = await sb.rpc("community_ban_user", {
    p_user: userId,
    p_banned: banned,
    p_reason: reason.trim().slice(0, 300) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}

export async function saveAd(formData: FormData): Promise<void> {
  const slot = Number(formData.get("slot"));
  if (slot !== 1 && slot !== 2) throw new Error("Slot must be 1 or 2.");

  const sb = await adminClient();
  const { data, error } = await sb
    .from("community_ads")
    .upsert(
      {
        slot,
        image_path: String(formData.get("image_path") ?? "").trim() || null,
        link_url: String(formData.get("link_url") ?? "").trim() || null,
        active: formData.get("active") === "on",
      },
      { onConflict: "slot" }, // needs community_ads_slot_key (migration 20260710000007)
    )
    .select("slot");
  if (error) throw new Error(error.message);
  assertTouched(data, "Save ad");
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}
