import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { EMAIL_RE } from "@/lib/validation/email";
import { subscribe } from "@/lib/subscribers/actions";
import { logAuditEvent } from "@/lib/seo-audit/events-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email gate. Saves the lead against the audit and flips it from the free
 * `ready` state into `analyzing`, so the client's next /step call runs the deep
 * LLM pass. The headline scores are already computed and never change here.
 */
export async function POST(req: Request) {
  if (!(await allow(`seo-audit-unlock:${clientIp(req.headers)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  let id = "";
  let email = "";
  try {
    const body = (await req.json()) as { id?: unknown; email?: unknown };
    id = typeof body.id === "string" ? body.id : "";
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Send a JSON body with id and email." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Missing audit id." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: existing } = await db.from("seo_audits").select("id,status,report_status").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  // Record the lead + unlock. Only trigger the LLM pass from the free `ready`
  // state so a re-submit can't kick off a second (paid) analysis.
  const row = existing as { status: string; report_status: string };
  const nextStatus = row.status === "ready" ? "analyzing" : row.status;
  await db
    .from("seo_audits")
    .update({ email, report_status: "unlocked", status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  await logAuditEvent("email_submitted", id, { email });

  // Add to the Builders List (fail-safe; its own rate-limit + Kit dual-write).
  try {
    await subscribe(email, "tool:seo-audit");
  } catch {
    /* never block the unlock on the newsletter side */
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
