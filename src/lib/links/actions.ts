"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";

function parseCategoryRow(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    sort: Number(formData.get("sort") ?? 0) || 0,
    published: formData.get("published") === "on",
  };
}

function parseLinkRow(formData: FormData) {
  return {
    category_id: String(formData.get("category_id") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    color: String(formData.get("color") ?? "").trim(),
    sort: Number(formData.get("sort") ?? 0) || 0,
    published: formData.get("published") === "on",
  };
}

export async function createCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const row = parseCategoryRow(formData);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("link_categories").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/link");
  redirect("/admin/links");
}

export async function updateCategory(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const row = parseCategoryRow(formData);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("link_categories").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/link");
  redirect("/admin/links");
}

export async function deleteCategory(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("link_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/link");
  redirect("/admin/links");
}

export async function createLink(formData: FormData): Promise<void> {
  await requireAdmin();
  const row = parseLinkRow(formData);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("links").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/link");
  redirect("/admin/links");
}

export async function updateLink(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const row = parseLinkRow(formData);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("links").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/link");
  redirect("/admin/links");
}

export async function deleteLink(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("links").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/link");
  redirect("/admin/links");
}
