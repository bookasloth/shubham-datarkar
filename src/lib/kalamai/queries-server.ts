import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { ContentType } from "./writing";

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

export type ArticleListItem = {
  id: string;
  title: string;
  status: string;
  overall: number | null;
  createdAt: string;
};

/** Articles written from a given analysis (any owner — the analysis page is
 *  already ownership/admin-scoped before this runs). Newest first. */
export async function listArticlesForAnalysis(analysisId: string): Promise<ArticleListItem[]> {
  const { data } = await supabaseAdmin()
    .from("kalamai_articles")
    .select("id, status, meta, score, created_at")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => {
    const meta = (r.meta ?? {}) as { title?: string };
    const score = (r.score ?? null) as { overall?: number } | null;
    return {
      id: r.id as string,
      title: meta.title || "Untitled article",
      status: r.status as string,
      overall: score?.overall ?? null,
      createdAt: r.created_at as string,
    };
  });
}

export type RecentArticleItem = {
  articleId: string;
  title: string;
  keyword: string;
  contentType: ContentType;
  status: string;
  overall: number | null;
  createdAt: string;
};

/** A user's finished + in-flight articles for the home + history lists, with the
 *  source keyword joined in. Ownership-scoped. Newest first. Links to /w/[id]. */
export async function listRecentArticles(userId: string, limit = 50): Promise<RecentArticleItem[]> {
  const { data } = await supabaseAdmin()
    .from("kalamai_articles")
    .select("id, status, meta, score, created_at, kalamai_analyses(keyword)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const meta = (r.meta ?? {}) as { title?: string; contentType?: ContentType };
    const score = (r.score ?? null) as { overall?: number } | null;
    const analysis = (r.kalamai_analyses ?? {}) as { keyword?: string } | { keyword?: string }[];
    const keyword = Array.isArray(analysis) ? (analysis[0]?.keyword ?? "") : (analysis.keyword ?? "");
    return {
      articleId: r.id as string,
      title: meta.title || "Untitled article",
      keyword,
      contentType: meta.contentType ?? "blog",
      status: r.status as string,
      overall: score?.overall ?? null,
      createdAt: r.created_at as string,
    };
  });
}
