import { NextResponse, type NextRequest } from "next/server";
import { getMemberContext } from "@/lib/members/session";
import { resolveKalamaiRole, checkAndConsume } from "@/lib/kalamai/quota-server";
import { logEvent } from "@/lib/kalamai/events-server";

export const dynamic = "force-dynamic";

const BLOCK_MESSAGE: Record<string, string> = {
  quota_exceeded: "You've used all your analyses this month.",
  too_many_concurrent: "You already have analyses running. Wait for one to finish.",
  rate_limited: "Too many analyses this hour. Try again shortly.",
};

/** Create an analysis (quota-gated). The client then pokes /api/kalamai/step. */
export async function POST(req: NextRequest) {
  const ctx = await getMemberContext();
  if (!ctx.user) return NextResponse.json({ error: "Sign in to use KalamAI." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const keyword = String(body.keyword ?? "").trim();
  const country = (String(body.country ?? "IN").trim() || "IN").toUpperCase();
  const locale = String(body.locale ?? "en").trim() || "en";
  if (keyword.length < 2 || keyword.length > 200) {
    return NextResponse.json({ error: "Enter a keyword between 2 and 200 characters." }, { status: 400 });
  }

  const role = await resolveKalamaiRole(ctx);
  const res = await checkAndConsume({ userId: ctx.user.id, role, kind: "analysis", keyword, country, locale });

  if (res.outcome === "created" || res.outcome === "deduped") {
    if (res.outcome === "created") await logEvent("analysis_created", { userId: ctx.user.id, analysisId: res.id! });
    return NextResponse.json({ id: res.id, deduped: res.outcome === "deduped" });
  }

  await logEvent("quota_hit", { userId: ctx.user.id, meta: { kind: "analysis", reason: res.outcome } });
  const status = res.outcome === "quota_exceeded" ? 402 : 429;
  return NextResponse.json({ error: BLOCK_MESSAGE[res.outcome] ?? "Blocked.", outcome: res.outcome }, { status });
}
