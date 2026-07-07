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

/* ---- membership plans ---- */

export async function savePlan(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount") ?? 0));
  const interval = String(formData.get("interval") ?? "monthly");
  if (!key || !name) throw new Error("Key and name are required.");
  if (!Number.isFinite(amount) || amount < 100) throw new Error("Amount (paise) must be at least 100.");
  if (!["monthly", "yearly"].includes(interval)) throw new Error("Bad interval.");

  const row = {
    key,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    amount,
    interval,
    razorpay_plan_id: String(formData.get("razorpay_plan_id") ?? "").trim() || null,
    active: formData.get("active") === "on",
    sort: Number(formData.get("sort") ?? 0) || 0,
  };
  const supabase = await supabaseAuthServer();
  const { error } = await supabase
    .from("membership_plans")
    .upsert(row, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plans");
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
