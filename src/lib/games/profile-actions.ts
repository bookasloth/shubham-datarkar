"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { getGameUser } from "@/lib/games/session";

export type RenameState = { error: string } | { ok: true } | undefined;

export async function renameUsername(_prev: RenameState, formData: FormData): Promise<RenameState> {
  const user = await getGameUser();
  if (!user) return { error: "Not signed in." };

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "3–20 chars: letters, numbers, underscore." };
  }

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
  if (error) {
    // 23505 = unique_violation
    if (error.code === "23505") return { error: "That username is taken." };
    return { error: "Could not update username." };
  }
  revalidatePath("/games/profile");
  return { ok: true };
}
