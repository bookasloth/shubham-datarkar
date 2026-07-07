"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type RequestState = { error?: string; ok?: boolean } | undefined;

const KINDS = ["template", "prompt", "tool", "article", "review"];

export async function createRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const kind = String(formData.get("kind") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();

  if (!KINDS.includes(kind)) return { error: "Pick a request type." };
  if (!title) return { error: "A short title is required." };

  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to send a request." };

  const { error } = await supabase.from("member_requests").insert({
    user_id: user.id,
    kind,
    title: title.slice(0, 200),
    details: details.slice(0, 2000) || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/members/requests");
  return { ok: true };
}
