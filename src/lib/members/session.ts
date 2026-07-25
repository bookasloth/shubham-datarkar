import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { resolveCapabilities } from "./capability-resolver";

/** Coarse display tier only — gating reads `capabilities`, not this. */
export type MemberRole = "guest" | "member" | "premium" | "admin";

export type MembershipInfo = {
  planKey: string;
  status: string;
  currentPeriodEnd: string | null;
};

export type MemberContext = {
  user: User | null;
  role: MemberRole;
  membership: MembershipInfo | null;
  capabilities: Set<string>;
};

const GUEST: MemberContext = {
  user: null,
  role: "guest",
  membership: null,
  capabilities: new Set(),
};

/**
 * Memoized per render: current user, coarse tier, and the resolved capability
 * set the gate checks. Admin holds every capability.
 */
export const getMemberContext = cache(async (): Promise<MemberContext> => {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return GUEST;

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = !!adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase();
  if (isAdmin) {
    return {
      user,
      role: "admin",
      membership: null,
      capabilities: resolveCapabilities({ isAdmin: true, planCapabilities: [] }),
    };
  }

  const { data: m } = await supabase
    .from("memberships")
    .select("plan_key,status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const membership: MembershipInfo | null = m
    ? { planKey: m.plan_key, status: m.status, currentPeriodEnd: m.current_period_end }
    : null;

  const active =
    m?.status === "active" &&
    !!m.current_period_end &&
    new Date(m.current_period_end) > new Date();

  let planCapabilities: string[] = [];
  if (active && m) {
    const { data: caps } = await supabase
      .from("plan_capabilities")
      .select("capability")
      .eq("plan_key", m.plan_key);
    planCapabilities = (caps ?? []).map((r) => r.capability as string);
  }

  return {
    user,
    role: active ? "premium" : "member",
    membership,
    capabilities: resolveCapabilities({ isAdmin: false, planCapabilities }),
  };
});

/** Route guard: redirect to the members login (preserving return path) when signed out. */
export async function requireMember(next?: string): Promise<MemberContext> {
  const ctx = await getMemberContext();
  if (!ctx.user) {
    redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return ctx;
}
