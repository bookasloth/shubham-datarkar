import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateImageFile, imageExt } from "@/lib/media/image-upload";

const BUCKET = "community-media";

/**
 * Validate + upload community image files, returning their public URLs. Shared by
 * createPost and createReply so both agree on validation, bucket, and pathing.
 * Validates every file BEFORE uploading any, so a rejected batch leaves no orphans.
 */
export async function uploadCommunityImages(
  userId: string,
  files: File[],
): Promise<{ urls: string[] } | { error: string }> {
  for (const f of files) {
    const err = validateImageFile(f);
    if (err) return { error: err };
  }
  const admin = supabaseAdmin();
  const urls: string[] = [];
  for (const f of files) {
    const ext = imageExt(f);
    const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, f, {
      contentType: f.type || "application/octet-stream",
      upsert: false,
    });
    if (error) return { error: `Upload failed: ${error.message}` };
    urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return { urls };
}
