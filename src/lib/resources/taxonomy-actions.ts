"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";

function back(): void {
  revalidatePath("/admin/resources/taxonomy");
}

export async function saveCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");
  const row = {
    name,
    slug: String(formData.get("slug") ?? "").trim() || slugify(name),
    sort: Number(formData.get("sort") ?? 0) || 0,
    active: formData.get("active") === "on",
  };
  const supabase = await supabaseAuthServer();
  const { error } = id
    ? await supabase.from("resource_categories").update(row).eq("id", id)
    : await supabase.from("resource_categories").insert(row);
  if (error) throw new Error(error.message);
  back();
}

export async function saveType(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  if (!key || !label) throw new Error("Key and label are required.");
  const row = {
    key: slugify(key),
    label,
    sort: Number(formData.get("sort") ?? 0) || 0,
    active: formData.get("active") === "on",
  };
  const supabase = await supabaseAuthServer();
  const { error } = await supabase
    .from("resource_types")
    .upsert(row, { onConflict: "key" });
  if (error) throw new Error(error.message);
  back();
}

export async function deleteTag(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
  back();
}
