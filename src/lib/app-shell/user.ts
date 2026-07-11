import "server-only";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { getMemberContext, type MemberRole } from "@/lib/members/session";

export type ShellUser = {
  email: string;
  displayName: string;
  role: MemberRole;
  isAdmin: boolean;
  isPremium: boolean;
} | null;

/** The serializable identity slice the client AppShell renders. Null when signed out. */
export async function getShellUser(): Promise<ShellUser> {
  const ctx = await getMemberContext();
  if (!ctx.user) return null;

  const email = ctx.user.email ?? "";
  // display_name → username → email local part, in that order.
  const sb = await supabaseAuthServer();
  const { data: profile } = await sb
    .from("profiles")
    .select("display_name, username")
    .eq("id", ctx.user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    email.split("@")[0] ||
    "Account";

  return {
    email,
    displayName,
    role: ctx.role,
    isAdmin: ctx.role === "admin",
    isPremium: ctx.role === "premium" || ctx.role === "admin",
  };
}
