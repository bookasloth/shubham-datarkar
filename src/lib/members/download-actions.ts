"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { canAccess } from "./access";
import { getMemberContext } from "./session";
import type { Resource } from "@/lib/resources/types";

export type DownloadUrlResult = { url?: string; error?: string };

/** Mint a short-lived signed URL for a download resource after a server-side access check. */
export async function getDownloadUrl(resourceId: string): Promise<DownloadUrlResult> {
  const { role, user } = await getMemberContext();

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("resources")
    .select("id,status,visibility,meta")
    .eq("id", resourceId)
    .maybeSingle();
  if (error || !data) return { error: "Resource not found." };

  const resource = data as Pick<Resource, "id" | "status" | "visibility" | "meta">;
  if (resource.status !== "published" && role !== "admin") return { error: "Resource not found." };
  if (!canAccess(resource.visibility, role)) {
    return {
      error:
        resource.visibility === "premium"
          ? "Upgrade to premium to download this file."
          : "Sign in to download this file.",
    };
  }

  const filePath = resource.meta.filePath;
  if (!filePath) return { error: "No file attached to this resource yet." };

  const { data: signed, error: signError } = await db.storage
    .from("member-files")
    .createSignedUrl(filePath, 60);
  if (signError || !signed) return { error: "Could not create a download link." };

  try {
    await Promise.all([
      db.from("resource_events").insert({
        resource_id: resource.id,
        user_id: user?.id ?? null,
        event: "download",
      }),
      db.rpc("bump_resource_counter", { rid: resource.id, kind: "download" }),
    ]);
  } catch (e) {
    console.warn("[members] download tracking failed", e);
  }

  return { url: signed.signedUrl };
}
