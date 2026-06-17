"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { parseVideoUrl } from "./video";
import { insertUpdate, deleteUpdate, uploadSupportImage, getThankyouImages, setThankyouImages } from "./updates";

export type ActionState = { ok: boolean; message: string } | undefined;

/** Create a manual post from the admin editor FormData. */
export async function createUpdate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const type = String(formData.get("type") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);

  if (type === "text") {
    if (!body) return { ok: false, message: "Write something." };
    const res = await insertUpdate({ type: "text", body, media: {} });
    return finish(res);
  }

  if (type === "image") {
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image." };
    const up = await uploadSupportImage(file, "updates");
    if (!up.ok || !up.url) return { ok: false, message: `Upload failed: ${up.error}` };
    const res = await insertUpdate({ type: "image", body, media: { url: up.url } });
    return finish(res);
  }

  if (type === "video") {
    const embed = parseVideoUrl(String(formData.get("videoUrl") ?? ""));
    if (!embed) return { ok: false, message: "Paste a valid YouTube or Vimeo URL." };
    const res = await insertUpdate({ type: "video", body, media: embed });
    return finish(res);
  }

  return { ok: false, message: "Unknown post type." };
}

function finish(res: { ok: boolean; error?: string }): ActionState {
  if (!res.ok) return { ok: false, message: res.error ?? "Save failed." };
  revalidatePath("/support/updates");
  revalidatePath("/admin/updates");
  return { ok: true, message: "Posted." };
}

/** Delete a post by code (admin list). */
export async function removeUpdate(code: string): Promise<ActionState> {
  await requireAdmin();
  const res = await deleteUpdate(code);
  if (!res.ok) return { ok: false, message: res.error ?? "Delete failed." };
  revalidatePath("/support/updates");
  revalidatePath("/admin/updates");
  return { ok: true, message: "Deleted." };
}

/** Upload one thank-you image and append it to the settings list (max 5). */
export async function addThankyouImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image." };
  const existing = await getThankyouImages();
  if (existing.length >= 5) return { ok: false, message: "Maximum 5 thank-you images." };
  const up = await uploadSupportImage(file, "thankyou");
  if (!up.ok || !up.url) return { ok: false, message: `Upload failed: ${up.error}` };
  const res = await setThankyouImages([...existing, up.url]);
  if (!res.ok) return { ok: false, message: res.error ?? "Save failed." };
  revalidatePath("/admin/updates");
  return { ok: true, message: "Added." };
}

/** Remove a thank-you image by URL. */
export async function removeThankyouImage(url: string): Promise<ActionState> {
  await requireAdmin();
  const existing = await getThankyouImages();
  const res = await setThankyouImages(existing.filter((u) => u !== url));
  if (!res.ok) return { ok: false, message: res.error ?? "Save failed." };
  revalidatePath("/admin/updates");
  return { ok: true, message: "Removed." };
}
