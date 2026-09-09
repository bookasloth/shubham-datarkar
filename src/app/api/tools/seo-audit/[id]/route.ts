import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { projectAudit, type AuditRowView } from "@/lib/seo-audit/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public status + gated report for one audit, addressed by its unguessable uuid. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin()
    .from("seo_audits")
    .select("id,url,domain,status,progress,report_status,page_count,scores,findings,report,error")
    .eq("id", id)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  const row = data as AuditRowView & { error: string | null };
  if (row.status === "failed") {
    return NextResponse.json({ error: row.error ?? "The audit failed. Try again." }, { status: 422 });
  }
  return NextResponse.json(projectAudit(row));
}
