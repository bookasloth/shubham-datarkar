import { NextResponse, type NextRequest } from "next/server";
import { getMemberContext } from "@/lib/members/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resolveKalamaiRole, checkAndConsume } from "@/lib/kalamai/quota-server";
import { logEvent } from "@/lib/kalamai/events-server";

export const dynamic = "force-dynamic";

const BLOCK_MESSAGE: Record<string, string> = {
  quota_exceeded: "You've used all your articles this month.",
  too_many_concurrent: "You already have articles being written. Wait for one to finish.",
  rate_limited: "Too many articles this hour. Try again shortly.",
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Create an article from a completed analysis (quota-gated). Client then pokes /api/kalamai/article-step. */
export async function POST(req: NextRequest) {
  const ctx = await getMemberContext();
  if (!ctx.user) return NextResponse.json({ error: "Sign in to use KalamAI." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const analysisId = String(body.analysisId ?? "");
  if (!analysisId) return NextResponse.json({ error: "Missing analysisId." }, { status: 400 });

  const params = {
    targetWords: clamp(Math.round(Number(body.targetWords) || 1600), 1000, 2200),
    tone: String(body.tone ?? "professional").slice(0, 40) || "professional",
    audience: String(body.audience ?? "").slice(0, 200),
    brandFacts: String(body.brandFacts ?? "").slice(0, 1000) || undefined,
  };

  // The article is only writable from a completed analysis the caller owns.
  const db = supabaseAdmin();
  const { data: analysis } = await db
    .from("kalamai_analyses")
    .select("user_id, status, report")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis || analysis.user_id !== ctx.user.id) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  if (analysis.status !== "complete" || !(analysis.report as { brief?: unknown } | null)?.brief) {
    return NextResponse.json({ error: "This analysis has no finished brief to write from." }, { status: 400 });
  }

  const role = await resolveKalamaiRole(ctx);
  const res = await checkAndConsume({ userId: ctx.user.id, role, kind: "article", analysisId });

  if (res.outcome === "created") {
    await db.from("kalamai_articles").update({ params }).eq("id", res.id!);
    await logEvent("article_created", { userId: ctx.user.id, articleId: res.id!, analysisId });
    return NextResponse.json({ id: res.id });
  }

  await logEvent("quota_hit", { userId: ctx.user.id, meta: { kind: "article", reason: res.outcome } });
  const status = res.outcome === "quota_exceeded" ? 402 : 429;
  return NextResponse.json({ error: BLOCK_MESSAGE[res.outcome] ?? "Blocked.", outcome: res.outcome }, { status });
}
