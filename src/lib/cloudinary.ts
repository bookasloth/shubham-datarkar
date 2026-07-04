import "server-only";

import { v2 as cloudinary } from "cloudinary";

/**
 * Server-only Cloudinary (v2 SDK) config, used for admin operations like
 * deleting assets. Uploads happen client-side via `CldUploadWidget` +
 * an unsigned upload preset; rendering happens via `CldImage`. This module
 * must never be imported from client code — the API secret would leak.
 */

let configured = false;

function ensureConfigured(): void {
  if (configured) return;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName) throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  if (!apiKey) throw new Error("Missing CLOUDINARY_API_KEY");
  if (!apiSecret) throw new Error("Missing CLOUDINARY_API_SECRET");

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

export type DeleteAssetResult = { ok: true } | { ok: false; error: string };

/** Deletes a Cloudinary asset (image) by its public id. */
export async function deleteCloudinaryAsset(publicId: string): Promise<DeleteAssetResult> {
  ensureConfigured();

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    // Cloudinary returns { result: "ok" } on success, "not found" if the
    // asset is already gone (treated as success — nothing left to delete).
    if (result?.result === "ok" || result?.result === "not found") {
      return { ok: true };
    }
    return { ok: false, error: `Cloudinary destroy returned: ${result?.result ?? "unknown"}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
