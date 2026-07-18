"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateImageFile, imageExt } from "@/lib/media/image-upload";

const BUCKET = "member-avatars";

export type AvatarState = { ok: true } | { error: string };

/** Remove every stored object under a user's avatar folder. Non-fatal on
 *  failure — a lingering orphan is cleaned by the next successful upload.
 *  ponytail: no retry; a stale object is cosmetic, not a correctness bug. */
async function clearFolder(admin: ReturnType<typeof supabaseAdmin>, uid: string): Promise<void> {
  const { data } = await admin.storage.from(BUCKET).list(uid);
  if (data && data.length) {
    await admin.storage.from(BUCKET).remove(data.map((o) => `${uid}/${o.name}`));
  }
}

function revalidateProfiles(handle?: string | null): void {
  revalidatePath("/members/account");
  revalidatePath("/community/me");
  if (handle) revalidatePath(`/community/u/${handle}`);
}

export async function uploadAvatar(formData: FormData): Promise<AvatarState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  const invalid = validateImageFile(file);
  if (invalid) return { error: invalid };

  const admin = supabaseAdmin();
  // Fresh path per upload = free cache-bust vs a stable CDN URL.
  const path = `${user.id}/${Date.now()}.${imageExt(file)}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  // Write via the service role: security_hardening.sql column-allowlists the
  // authenticated UPDATE on profiles to (username, display_name, bio), so an
  // auth-client update of avatar_url is silently denied. We've already
  // authenticated the user above, and scope the write to their own id.
  const { error: dbErr } = await admin.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
  if (dbErr) return { error: "Could not save your photo." };

  // Remove the previous object(s) only after the new one is committed.
  const { data: prev } = await admin.storage.from(BUCKET).list(user.id);
  const current = path.split("/")[1];
  const stale = (prev ?? []).filter((o) => o.name !== current).map((o) => `${user.id}/${o.name}`);
  if (stale.length) await admin.storage.from(BUCKET).remove(stale);

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}

export async function removeAvatar(): Promise<AvatarState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const admin = supabaseAdmin();
  // Service role: profiles UPDATE is column-allowlisted to username/display_name/bio
  // for authenticated (security_hardening.sql). Own id only.
  const { error } = await admin.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) return { error: "Could not remove your photo." };
  // DB is already null — storage cleanup can't leave a dangling URL now.
  await clearFolder(admin, user.id);

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}

export async function removeAvatarAsAdmin(userId: string): Promise<AvatarState> {
  const sb = await supabaseAuthServer();
  // Server-side admin gate, not just storage RLS.
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return { error: "Not authorised." };

  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) return { error: "Could not remove that photo." };
  // DB is already null — storage cleanup can't leave a dangling URL now.
  await clearFolder(admin, userId);

  const { data: p } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  revalidatePath("/admin/members");
  return { ok: true };
}
