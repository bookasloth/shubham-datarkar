import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";
import type { AdSlot, FeedPost, FeedSort, FeedWindow } from "./types";

export async function listFeed(opts: {
  sort: FeedSort;
  window: FeedWindow;
  viewerId: string | null;
  limit?: number;
  offset?: number;
}): Promise<FeedPost[]> {
  const sb = supabaseAnon();
  const { data, error } = await sb.rpc("community_feed", {
    p_sort: opts.sort,
    p_window: opts.window,
    p_viewer: opts.viewerId,
    p_limit: opts.limit ?? 20,
    p_offset: opts.offset ?? 0,
  });
  if (error) {
    console.warn("community_feed failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    username: r.username as string,
    displayName: (r.display_name as string) ?? null,
    badge: r.badge as FeedPost["badge"],
    type: r.type as FeedPost["type"],
    body: (r.body as string) ?? null,
    images: (r.images as string[]) ?? null,
    youtubeId: (r.youtube_id as string) ?? null,
    poll: (r.poll as FeedPost["poll"]) ?? null,
    upCount: r.up_count as number,
    downCount: r.down_count as number,
    score: r.score as number,
    replyCount: r.reply_count as number,
    reblogCount: r.reblog_count as number,
    reblogOf: (r.reblog_of as string) ?? null,
    createdAt: r.created_at as string,
    viewerVote: ((r.viewer_vote as number) ?? 0) as -1 | 0 | 1,
    viewerBookmarked: Boolean(r.viewer_bookmarked),
  }));
}

export async function listAds(): Promise<AdSlot[]> {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("community_ads")
    .select("slot, image_path, link_url")
    .eq("active", true)
    .order("slot");
  if (error) return [];
  return (data ?? []).map((a) => ({
    slot: a.slot as 1 | 2,
    imagePath: a.image_path,
    linkUrl: a.link_url,
  }));
}
