import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { SafeComment } from "./comment-tree";

/**
 * Comment data access. The table is service-role only (RLS denies clients), so
 * every read goes through supabaseAdmin and strips the private email column
 * before the rows leave the server. Reads fail-safe to empty.
 */

type Row = {
  id: string;
  parent_id: string | null;
  name: string;
  tier: string | null;
  body: string;
  created_at: string;
};

const PUBLIC_COLS = "id,parent_id,name,tier,body,created_at";

function toSafe(r: Row): SafeComment {
  return {
    id: String(r.id),
    parentId: r.parent_id ? String(r.parent_id) : null,
    name: r.name,
    tier: r.tier,
    body: r.body,
    createdAt: r.created_at,
  };
}

/** All comments for an update, oldest first, email stripped. Fail-safe to []. */
export async function getComments(code: string): Promise<SafeComment[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("support_comments")
      .select(PUBLIC_COLS)
      .eq("update_code", code)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data as Row[]) ?? []).map(toSafe);
  } catch (e) {
    console.warn("[comments] getComments failed; returning empty:", (e as Error).message);
    return [];
  }
}

/** Minimal parent info to validate a reply + notify its author. Null if gone. */
export async function getCommentParent(
  id: string,
): Promise<{ updateCode: string; name: string; email: string } | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("support_comments")
      .select("update_code,name,email")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const r = data as { update_code: string; name: string; email: string };
    return { updateCode: r.update_code, name: r.name, email: r.email };
  } catch (e) {
    console.warn("[comments] getCommentParent failed:", (e as Error).message);
    return null;
  }
}

/** Insert a comment. Returns the new id, or null on failure. */
export async function insertComment(input: {
  updateCode: string;
  parentId: string | null;
  name: string;
  email: string;
  tier: string | null;
  body: string;
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("support_comments")
    .insert({
      update_code: input.updateCode,
      parent_id: input.parentId,
      name: input.name,
      email: input.email,
      tier: input.tier,
      body: input.body,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[comments] insertComment failed:", error.message);
    return null;
  }
  return String(data.id);
}

/** Admin: delete a comment (cascade removes its replies). */
export async function deleteCommentById(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin().from("support_comments").delete().eq("id", id);
  if (error) {
    console.warn("[comments] deleteCommentById failed:", error.message);
    return false;
  }
  return true;
}
