import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { AdSlot, FeedPost, FeedSort, FeedWindow } from "./types";

export async function listFeed(opts: {
  sort: FeedSort;
  window: FeedWindow;
  limit?: number;
  offset?: number;
}): Promise<FeedPost[]> {
  // Call as the request user (cookie-scoped): the RPC derives the viewer from
  // auth.uid(), so vote/bookmark state can't be spoofed for another user.
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_feed", {
    p_sort: opts.sort,
    p_window: opts.window,
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

/** True when the signed-in viewer may post (verified email, not banned). */
export async function viewerCanPost(): Promise<boolean> {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_can_post");
  if (error) return false;
  return Boolean(data);
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
