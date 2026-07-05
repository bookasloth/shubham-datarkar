"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import type { GameKey } from "@/lib/games/registry";
import { parseAlfazyWordForm, validateAlfazyWord } from "@/lib/games/alfazy-word-form";
import { puzzleNumberFor } from "@/lib/daily";

export async function deleteResult(userId: string, resultId: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("admin_delete_result", { p_result: resultId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/games/players/${userId}`);
}

export async function resetStreak(userId: string, game: GameKey): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("admin_reset_streak", { p_user: userId, p_game: game });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/games/players/${userId}`);
}

export async function renameUser(userId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("admin_rename_user", { p_user: userId, p_username: username });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/games/players/${userId}`);
}

export async function upsertAlfazyWord(formData: FormData): Promise<void> {
  await requireAdmin();
  const { puzzleNumber, word } = parseAlfazyWordForm(formData);
  // Guard: never rewrite a past/current puzzle — that would change a played answer.
  if (!Number.isFinite(puzzleNumber) || puzzleNumber <= puzzleNumberFor()) {
    throw new Error("Can only edit future puzzles.");
  }
  const check = validateAlfazyWord(word);
  if (!check.ok) throw new Error(check.error);

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("admin_upsert_alfazy_puzzle", {
    p_puzzle: puzzleNumber,
    p_word: check.word,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/games/words");
}
