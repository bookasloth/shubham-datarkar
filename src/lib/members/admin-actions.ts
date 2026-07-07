"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { createPlan } from "@/lib/razorpay/subscriptions";

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

/* ---- member tools ---- */

export async function saveTool(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const component = String(formData.get("component") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  if (!slug || !name || !component) throw new Error("Slug, name, and component are required.");
  if (!["draft", "live", "archived"].includes(status)) throw new Error("Bad status.");

  const row = {
    slug,
    name,
    component,
    description: String(formData.get("description") ?? "").trim() || null,
    status,
    sort: Number(formData.get("sort") ?? 0) || 0,
  };
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("member_tools").upsert(row, { onConflict: "slug" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/resources/tools");
}

export async function deleteTool(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("member_tools").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/resources/tools");
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

/**
 * Create the plan in Razorpay (via their Plans API) and link + activate it —
 * so the admin never opens the Razorpay dashboard. Razorpay plans are
 * immutable, so this uses the amount/name/interval currently in the form.
 * Guarded: if a razorpay_plan_id is already linked, it only saves edits +
 * activates (no duplicate Razorpay plan).
 */
export async function createRazorpayPlan(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount") ?? 0));
  const interval = String(formData.get("interval") ?? "monthly");
  const description = String(formData.get("description") ?? "").trim();
  if (!key || !name) throw new Error("Key and name are required.");
  if (!Number.isFinite(amount) || amount < 100) throw new Error("Amount (paise) must be at least 100.");
  if (!["monthly", "yearly"].includes(interval)) throw new Error("Bad interval.");

  const supabase = await supabaseAuthServer();

  const { data: existing } = await supabase
    .from("membership_plans")
    .select("razorpay_plan_id")
    .eq("key", key)
    .maybeSingle();

  // Already has a Razorpay plan → don't create a second one; just save + activate.
  if (existing?.razorpay_plan_id) {
    const { error } = await supabase
      .from("membership_plans")
      .update({ name, amount, description: description || null, active: true })
      .eq("key", key);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/plans");
    return;
  }

  const created = await createPlan({
    interval: interval as "monthly" | "yearly",
    name,
    amountPaise: amount,
    description: description || undefined,
  });
  if (!created.ok) throw new Error(created.error);

  const { error } = await supabase.from("membership_plans").upsert(
    {
      key,
      name,
      description: description || null,
      amount,
      interval,
      razorpay_plan_id: created.id,
      active: true,
      sort: Number(formData.get("sort") ?? 0) || 0,
    },
    { onConflict: "key" },
  );
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
