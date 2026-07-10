import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type AnalysisListItem = {
  id: string;
  keyword: string;
  status: string;
  createdAt: string;
};

/** A user's recent analyses for the home + history lists. Ownership-scoped. */
export async function listRecentAnalyses(userId: string, limit = 20): Promise<AnalysisListItem[]> {
  const { data } = await supabaseAdmin()
    .from("kalamai_analyses")
    .select("id, keyword, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    keyword: r.keyword as string,
    status: r.status as string,
    createdAt: r.created_at as string,
  }));
}
