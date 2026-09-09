import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Analytics events for the public SEO audit (spec §30). Mirrors kalamai_events. */
export type AuditEvent =
  | "audit_started"
  | "audit_completed"
  | "audit_failed"
  | "email_gate_viewed"
  | "email_submitted"
  | "report_generated"
  | "report_opened"
  | "cta_clicked";

/** Log an event. Never throws — analytics must not break a request. */
export async function logAuditEvent(event: AuditEvent, auditId?: string | null, meta?: Record<string, unknown>): Promise<void> {
  try {
    await supabaseAdmin().from("seo_audit_events").insert({ event, audit_id: auditId ?? null, meta: meta ?? null });
  } catch (e) {
    console.warn("[seo-audit] logAuditEvent failed", e);
  }
}
