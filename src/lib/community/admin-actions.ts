"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

const ADMIN_PATH = "/admin/community";

export async function resolveReport(reportId: string): Promise<void> {
  await requireAdmin();
  const sb = await supabaseAuthServer();
  const { error } = await sb.from("community_reports").update({ resolved: true }).eq("id", reportId);
  if (error) throw new Error(error.message);
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
  await requireAdmin();
  const sb = await supabaseAuthServer();
  const { error } = await sb
    .from("community_posts")
    .update({
      hidden,
      hidden_reason: hidden ? reason.trim().slice(0, 300) || null : null,
      hidden_notified: hidden ? notify : false,
    })
    .eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}

export async function setPostDemoted(postId: string, demoted: boolean): Promise<void> {
  await requireAdmin();
  const sb = await supabaseAuthServer();
  const { error } = await sb.from("community_posts").update({ demoted }).eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}

export async function adminDeletePost(postId: string): Promise<void> {
  await requireAdmin();
  const sb = await supabaseAuthServer();
  const { error } = await sb.from("community_posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}

/** profiles is self-write only — banning must go through the admin-gated RPC. */
export async function setUserBanned(userId: string, banned: boolean, reason: string): Promise<void> {
  await requireAdmin();
  const sb = await supabaseAuthServer();
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
  await requireAdmin();
  const slot = Number(formData.get("slot"));
  if (slot !== 1 && slot !== 2) throw new Error("Slot must be 1 or 2.");

  const sb = await supabaseAuthServer();
  const { error } = await sb.from("community_ads").upsert(
    {
      slot,
      image_path: String(formData.get("image_path") ?? "").trim() || null,
      link_url: String(formData.get("link_url") ?? "").trim() || null,
      active: formData.get("active") === "on",
    },
    { onConflict: "slot" }, // needs community_ads_slot_key (migration 20260710000007)
  );
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath("/community");
}
