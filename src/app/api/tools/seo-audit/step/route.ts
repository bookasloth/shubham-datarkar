import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { runAuditStep } from "@/lib/seo-audit/job-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Advance one audit transition. The client polls this until status is terminal. */
export async function POST(req: Request) {
  // Generous cap — the client polls this, and each call does one bounded batch.
  if (!(await allow(`seo-audit-step:${clientIp(req.headers)}`, 120, 60_000))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let id: string;
  try {
    const body = (await req.json()) as { id?: unknown };
    id = typeof body.id === "string" ? body.id : "";
  } catch {
    return NextResponse.json({ error: "Send a JSON body with an id." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Missing audit id." }, { status: 400 });

  try {
    const result = await runAuditStep(id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[seo-audit] step error:", err);
    return NextResponse.json({ error: "Audit step failed." }, { status: 500 });
  }
}
