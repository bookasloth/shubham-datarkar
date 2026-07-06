import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

const BUCKET = "photos";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function uploadPhoto(
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}` };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: `File too large (max ${MAX_SIZE / 1024 / 1024} MB)` };
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const hex = randomBytes(6).toString("hex");
  const path = `${Date.now()}-${hex}.${ext}`;

  const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export async function deleteStoragePhoto(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove([storagePath]);
  if (error) {
    console.warn(`[photos] storage delete failed for "${storagePath}":`, error.message);
  }
}
