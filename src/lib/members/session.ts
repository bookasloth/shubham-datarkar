import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { MemberRole } from "./access";

export type MembershipInfo = {
  planKey: string;
  status: string;
  currentPeriodEnd: string | null;
};

export type MemberContext = {
  user: User | null;
  role: MemberRole;
  membership: MembershipInfo | null;
};

const GUEST: MemberContext = { user: null, role: "guest", membership: null };

/**
 * Memoized per render: current user + derived role.
 * guest = no session; admin = ADMIN_EMAIL; premium = active membership
 * with a future period end; member = any other authed user.
 */
export const getMemberContext = cache(async (): Promise<MemberContext> => {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return GUEST;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()) {
    return { user, role: "admin", membership: null };
  }

  const { data: m } = await supabase
    .from("memberships")
    .select("plan_key,status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const membership: MembershipInfo | null = m
    ? {
        planKey: m.plan_key,
        status: m.status,
        currentPeriodEnd: m.current_period_end,
      }
    : null;

  const premium =
    m?.status === "active" &&
    !!m.current_period_end &&
    new Date(m.current_period_end) > new Date();

  return { user, role: premium ? "premium" : "member", membership };
});

/** Route guard: redirect to the members login (preserving return path) when signed out. */
export async function requireMember(next?: string): Promise<MemberContext> {
  const ctx = await getMemberContext();
  if (!ctx.user) {
    redirect(`/members/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return ctx;
}
