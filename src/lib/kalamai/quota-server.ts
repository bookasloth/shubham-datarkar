import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { can } from "@/lib/members/capabilities";
import type { MemberContext } from "@/lib/members/session";

/** KalamAI quota tiers. Free members (signed-in, no membership) resolve to `member`. */
export type KalamaiRole = "guest" | "member" | "premium" | "founder" | "admin";

export type QuotaKind = "analysis" | "article";

export type ConsumeOutcome =
  | "created"
  | "deduped"
  | "quota_exceeded"
  | "too_many_concurrent"
  | "rate_limited";

export type ConsumeResult = { id: string | null; outcome: ConsumeOutcome };

export type QuotaUsage = {
  role: KalamaiRole;
  analyses: { used: number; limit: number };
  articles: { used: number; limit: number };
};

/**
 * Resolve the KalamAI role from the member context. This is where the capability
 * gate and the free tier reconcile: a signed-in non-payer holds no capabilities,
 * isn't a founder, and lands on `member` (3/1) — without any row being created.
 * Founder outranks premium because a founder may also hold a paid membership.
 */
export async function resolveKalamaiRole(ctx: MemberContext): Promise<KalamaiRole> {
  if (!ctx.user) return "guest";
  if (ctx.role === "admin") return "admin";

  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("is_founder")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (data?.is_founder) return "founder";

  if (can(ctx.capabilities, "use_kalamai")) return "premium";
  return "member";
}

/**
 * Atomically check dedupe + concurrency + hourly + monthly quota and, if clear,
 * insert the job row. Delegates the whole decision to the DB RPC (service-role
 * only) so the count-then-insert can't race. Never consumes on a blocked outcome.
 */
export async function checkAndConsume(args: {
  userId: string;
  role: KalamaiRole;
  kind: QuotaKind;
  keyword?: string;
  country?: string;
  locale?: string;
  analysisId?: string;
}): Promise<ConsumeResult> {
  const { data, error } = await supabaseAdmin().rpc("kalamai_check_and_consume", {
    p_user: args.userId,
    p_role: args.role,
    p_kind: args.kind,
    p_keyword: args.keyword ?? null,
    p_country: args.country ?? null,
    p_locale: args.locale ?? null,
    p_analysis_id: args.analysisId ?? null,
  });
  if (error) throw new Error(`kalamai quota rpc failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row?.id ?? null, outcome: row?.outcome as ConsumeOutcome };
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Current-period usage for the quota badge. `-1` limit means unlimited. */
export async function getQuotaUsage(userId: string, role: KalamaiRole): Promise<QuotaUsage> {
  const db = supabaseAdmin();
  const since = monthStartIso();

  const [limits, aUsed, wUsed] = await Promise.all([
    db.from("kalamai_quotas").select("analyses_limit, articles_limit").eq("role", role).maybeSingle(),
    db
      .from("kalamai_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "failed")
      .gte("created_at", since),
    db
      .from("kalamai_articles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "failed")
      .gte("created_at", since),
  ]);

  return {
    role,
    analyses: { used: aUsed.count ?? 0, limit: limits.data?.analyses_limit ?? 0 },
    articles: { used: wUsed.count ?? 0, limit: limits.data?.articles_limit ?? 0 },
  };
}
