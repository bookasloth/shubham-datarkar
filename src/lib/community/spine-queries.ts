import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";

/** A note in a thread/release story list. Lighter than FeedPost — these pages
 *  are a read-only timeline; interaction happens on each note's permalink. */
export type SpineNote = { publicId: string; body: string | null; createdAt: string; type: string };

async function listBy(col: "thread" | "version", val: string, asc: boolean): Promise<SpineNote[]> {
  const sb = supabaseAnon();
  const { data } = await sb
    .from("community_posts")
    .select("public_id, body, created_at, type")
    .eq(col, val)
    .is("parent_id", null)
    .eq("hidden", false)
    .order("created_at", { ascending: asc })
    .limit(100);
  return (data ?? []).map((r) => ({
    publicId: String(r.public_id),
    body: (r.body as string) ?? null,
    createdAt: r.created_at as string,
    type: r.type as string,
  }));
}

/** A thread arc reads oldest → newest (the story). */
export const listThreadNotes = (thread: string) => listBy("thread", thread, true);
/** Release notes read newest first. */
export const listReleaseNotes = (version: string) => listBy("version", version, false);
