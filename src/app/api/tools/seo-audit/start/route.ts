import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/seo-audit/events-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Normalize user input to an http(s) URL + its domain, or null if unusable. */
function parseUrl(raw: string): { url: string; domain: string } | null {
  const t = raw.trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    try {
      u = new URL(`https://${t}`);
    } catch {
      return null;
    }
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  u.hash = "";
  return { url: u.toString(), domain: u.hostname };
}

export async function POST(req: Request) {
  if (!(await allow(`seo-audit-start:${clientIp(req.headers)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Too many audits. Please wait a minute." }, { status: 429 });
  }

  let raw: string;
  try {
    const body = (await req.json()) as { url?: unknown };
    raw = typeof body.url === "string" ? body.url : "";
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a url." }, { status: 400 });
  }

  const parsed = parseUrl(raw);
  if (!parsed) return NextResponse.json({ error: "Enter a valid URL, e.g. https://example.com." }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("seo_audits")
    .insert({ url: parsed.url, domain: parsed.domain, status: "queued", progress: 0 })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[seo-audit] create failed:", error?.message);
    return NextResponse.json({ error: "Couldn't start the audit. Try again." }, { status: 500 });
  }

  await logAuditEvent("audit_started", data.id as string, { domain: parsed.domain });
  return NextResponse.json({ id: data.id });
}
