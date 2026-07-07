"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";

/* ---- announcements ---- */

export async function saveAnnouncement(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!message) throw new Error("Message is required.");
  const row = {
    message,
    href: String(formData.get("href") ?? "").trim() || null,
    active: formData.get("active") === "on",
    ends_at: String(formData.get("ends_at") ?? "").trim()
      ? new Date(String(formData.get("ends_at"))).toISOString()
      : null,
  };
  const supabase = await supabaseAuthServer();
  const { error } = id
    ? await supabase.from("announcements").update(row).eq("id", id)
    : await supabase.from("announcements").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/announcements");
}

export async function deleteAnnouncement(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/announcements");
}

/* ---- member requests ---- */

export async function updateRequestStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["open", "planned", "shipped", "declined"].includes(status)) return;
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("member_requests").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/requests");
}
