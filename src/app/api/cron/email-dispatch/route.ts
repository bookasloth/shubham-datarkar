import { NextResponse } from "next/server";
import { istParts } from "@/lib/email/dispatch/dedupe";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const now = new Date();
  const t = istParts(now);
  const ran: Record<string, unknown> = {};
  // Sub-tasks (Tasks 2–3) are invoked here, each wrapped so one failure can't abort the run.
  return NextResponse.json({ ok: true, ist: t.date, ran });
}
