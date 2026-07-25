"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateImageFile, imageExt } from "@/lib/media/image-upload";
import { normalizeProfileText } from "@/lib/members/profile-text";

const BUCKET = "member-covers";

export type ProfileActionState = { ok: true } | { error: string };

function revalidateProfiles(handle?: string | null): void {
  revalidatePath("/members/account");
  revalidatePath("/community/me");
  if (handle) revalidatePath(`/community/u/${handle}`);
}

/** headline + bio. Service-role write: the authenticated UPDATE on profiles is
 *  column-allowlisted to (username, display_name, bio), so headline would be
 *  denied on the auth client. Authenticated above, scoped to own id. */
export async function updateProfileText(formData: FormData): Promise<ProfileActionState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { headline, bio } = normalizeProfileText({
    headline: formData.get("headline") as string | null,
    bio: formData.get("bio") as string | null,
  });

  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").update({ headline, bio }).eq("id", user.id);
  if (error) return { error: "Could not save your profile." };

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}

export async function uploadCover(formData: FormData): Promise<ProfileActionState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  const invalid = validateImageFile(file);
  if (invalid) return { error: invalid };

  const admin = supabaseAdmin();
  const path = `${user.id}/${Date.now()}.${imageExt(file)}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: dbErr } = await admin.from("profiles").update({ cover_url: publicUrl }).eq("id", user.id);
  if (dbErr) return { error: "Could not save your cover." };

  // Drop older objects only after the new one is committed.
  const { data: prev } = await admin.storage.from(BUCKET).list(user.id);
  const current = path.split("/")[1];
  const stale = (prev ?? []).filter((o) => o.name !== current).map((o) => `${user.id}/${o.name}`);
  if (stale.length) await admin.storage.from(BUCKET).remove(stale);

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}

export async function removeCover(): Promise<ProfileActionState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").update({ cover_url: null }).eq("id", user.id);
  if (error) return { error: "Could not remove your cover." };
  const { data } = await admin.storage.from(BUCKET).list(user.id);
  if (data && data.length) {
    await admin.storage.from(BUCKET).remove(data.map((o) => `${user.id}/${o.name}`));
  }

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}
