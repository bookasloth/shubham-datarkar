"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { photoRowFromFormData } from "@/lib/photos/form";

/** Revalidate both the public gallery and the admin list after a write. */
function revalidatePhotos(): void {
  revalidatePath("/photos");
  revalidatePath("/admin/photos");
}

export async function createPhoto(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const row = photoRowFromFormData(formData);
  const { error } = await supabase.from("photos").insert(row);
  if (error) throw new Error(error.message);
  revalidatePhotos();
  redirect("/admin/photos");
}

export async function updatePhoto(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const row = photoRowFromFormData(formData);
  const { error } = await supabase.from("photos").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePhotos();
  redirect("/admin/photos");
}

export async function deletePhoto(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();

  // Look up the Cloudinary public id BEFORE deleting the row, so we can clean
  // up the stored asset too. If the lookup fails, surface it — don't blindly
  // delete a row whose asset we can no longer identify.
  const { data, error: readError } = await supabase
    .from("photos")
    .select("cloudinary_public_id")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const publicId = (data as { cloudinary_public_id: string } | null)?.cloudinary_public_id;

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Remove the Cloudinary asset. A cleanup failure must NOT crash the delete —
  // the DB row is already gone — so we log and continue rather than throw.
  if (publicId) {
    try {
      const result = await deleteCloudinaryAsset(publicId);
      if (!result.ok) {
        console.warn(
          `[photos] deletePhoto: row ${id} deleted but Cloudinary asset "${publicId}" cleanup failed: ${result.error}`,
        );
      }
    } catch (e) {
      console.warn(
        `[photos] deletePhoto: row ${id} deleted but Cloudinary cleanup threw for "${publicId}":`,
        (e as Error)?.message ?? e,
      );
    }
  }

  revalidatePhotos();
  redirect("/admin/photos");
}
