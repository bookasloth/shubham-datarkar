"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { getEntity } from "@/lib/content/registry";

/** Parse the editor form into a row. Throws on invalid JSON or unknown entity. */
function parseRow(entityKey: string, formData: FormData) {
  const def = getEntity(entityKey);
  if (!def) throw new Error(`Unknown entity: ${entityKey}`);

  const rawData = String(formData.get("data") ?? "").trim();
  let data: unknown;
  try {
    data = rawData ? JSON.parse(rawData) : {};
  } catch {
    throw new Error("Data is not valid JSON.");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Data must be a JSON object.");
  }

  const slugRaw = String(formData.get("slug") ?? "").trim();
  return {
    def,
    row: {
      slug: def.hasSlug ? slugRaw || null : null,
      data,
      sort: Number(formData.get("sort") ?? 0) || 0,
      published: formData.get("published") === "on",
    },
  };
}

export async function createEntity(entityKey: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const { def, row } = parseRow(entityKey, formData);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from(def.table).insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/admin/content/${def.key}`);
}

export async function updateEntity(entityKey: string, id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const { def, row } = parseRow(entityKey, formData);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from(def.table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/admin/content/${def.key}`);
}

export async function deleteEntity(entityKey: string, id: string): Promise<void> {
  await requireAdmin();
  const def = getEntity(entityKey);
  if (!def) throw new Error(`Unknown entity: ${entityKey}`);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from(def.table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/admin/content/${def.key}`);
}
