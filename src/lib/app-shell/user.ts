import "server-only";
import { cache } from "react";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { getMemberContext, type MemberRole } from "@/lib/members/session";

export type ShellUser = {
  email: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: MemberRole;
  isAdmin: boolean;
  isPremium: boolean;
  /** Profile-card stats. HEAD counts — no rows cross the wire. */
  postCount: number;
  followers: number;
  following: number;
} | null;

/** The serializable identity slice the client AppShell renders. Null when signed out. */
export const getShellUser = cache(async (): Promise<ShellUser> => {
  const ctx = await getMemberContext();
  if (!ctx.user) return null;

  const email = ctx.user.email ?? "";
  // display_name → username → email local part, in that order.
  const sb = await supabaseAuthServer();
  const [{ data: profile }, posts, followers, following] = await Promise.all([
    sb
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", ctx.user.id)
      .maybeSingle(),
    sb.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id).is("reblog_of", null),
    sb.from("community_follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", ctx.user.id),
    sb.from("community_follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", ctx.user.id),
  ]);

  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    email.split("@")[0] ||
    "Account";

  return {
    email,
    displayName,
    username: profile?.username?.trim() || null,
    avatarUrl: (profile?.avatar_url as string | null) ?? null,
    role: ctx.role,
    isAdmin: ctx.role === "admin",
    isPremium: ctx.role === "premium" || ctx.role === "admin",
    postCount: posts.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
});
