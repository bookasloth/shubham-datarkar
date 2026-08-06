import { NextResponse } from "next/server";
import { auditExternalUrl } from "@/lib/tools/audit";
import { AuditError } from "@/lib/tools/safe-fetch";
import { allow, clientIp } from "@/lib/rate-limit";

// Fetching an arbitrary external URL needs Node (dns lookup for the SSRF guard).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Public, unauthenticated server-side fetch: cap per-IP so it can't be used as
  // a free bandwidth/fetch amplifier.
  if (!(await allow(`tools-seo-audit:${clientIp(req.headers)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  let url: string;
  try {
    const body = (await req.json()) as { url?: unknown };
    url = typeof body.url === "string" ? body.url : "";
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a url." }, { status: 400 });
  }
  if (!url.trim()) return NextResponse.json({ error: "Enter a URL to audit." }, { status: 400 });

  try {
    const report = await auditExternalUrl(url);
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof AuditError) {
      // Safe, user-facing message — no internal detail.
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[seo-audit] unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong running the audit. Try again." }, { status: 500 });
  }
}
