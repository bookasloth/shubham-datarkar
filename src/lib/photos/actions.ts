"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { uploadPhoto, deleteStoragePhoto } from "@/lib/photos/storage";
import { photoRowFromFormData } from "@/lib/photos/form";

function revalidatePhotos(): void {
  revalidatePath("/photos");
  revalidatePath("/admin/photos");
}

export async function createPhoto(formData: FormData): Promise<void> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No image file provided");

  const result = await uploadPhoto(file);
  if (!result.ok) throw new Error(result.error);

  formData.set("storage_path", result.path);

  const supabase = await supabaseAuthServer();
  const row = photoRowFromFormData(formData);
  const { error } = await supabase.from("photos").insert(row);
  if (error) {
    await deleteStoragePhoto(result.path);
    throw new Error(error.message);
  }

  revalidatePhotos();
  redirect("/admin/photos");
}

export async function updatePhoto(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();

  const file = formData.get("file") as File | null;
  let oldPath: string | undefined;
  if (file && file.size > 0) {
    const result = await uploadPhoto(file);
    if (!result.ok) throw new Error(result.error);
    formData.set("storage_path", result.path);

    const { data } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    oldPath = (data as { storage_path: string } | null)?.storage_path ?? undefined;
  }

  const row = photoRowFromFormData(formData);
  const { error } = await supabase.from("photos").update(row).eq("id", id);
  if (error) throw new Error(error.message);

  if (oldPath) await deleteStoragePhoto(oldPath);

  revalidatePhotos();
  redirect("/admin/photos");
}

export async function deletePhoto(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();

  const { data, error: readError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const storagePath = (data as { storage_path: string } | null)?.storage_path;

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (storagePath) {
    await deleteStoragePhoto(storagePath);
  }

  revalidatePhotos();
  redirect("/admin/photos");
}
