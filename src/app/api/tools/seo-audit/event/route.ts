import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { logAuditEvent, type AuditEvent } from "@/lib/seo-audit/events-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Client-side funnel events the server can't observe on its own (spec §30).
const CLIENT_EVENTS: AuditEvent[] = ["email_gate_viewed", "report_opened", "cta_clicked"];

export async function POST(req: Request) {
  if (!(await allow(`seo-audit-event:${clientIp(req.headers)}`, 60, 60_000))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  try {
    const body = (await req.json()) as { id?: unknown; event?: unknown };
    const id = typeof body.id === "string" ? body.id : null;
    const event = body.event as AuditEvent;
    if (!CLIENT_EVENTS.includes(event)) return NextResponse.json({ ok: false }, { status: 400 });
    await logAuditEvent(event, id);
  } catch {
    /* analytics must never fail loudly */
  }
  return NextResponse.json({ ok: true });
}
