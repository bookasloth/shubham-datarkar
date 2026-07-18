// Shared raster-image upload validation. Raster only: `startsWith("image/")`
// would admit image/svg+xml, and an SVG can carry <script> — these buckets are
// public and served inline from *.supabase.co (audit L-2).
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** Error message string, or null when the file is an acceptable image. */
export function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) return "Image must be under 5MB.";
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "Use a JPG, PNG, WebP, GIF, or AVIF image.";
  return null;
}

/** Lowercased, alphanumeric-only file extension; "bin" when absent. */
export function imageExt(file: File): string {
  const parts = file.name.split(".");
  if (parts.length < 2) return "bin";
  return parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}
