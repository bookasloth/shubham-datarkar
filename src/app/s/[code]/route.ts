import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnon } from "@/lib/supabase/server";

// Reads the DB and mutates a click counter — never prerender/cache this.
export const dynamic = "force-dynamic";

/**
 * shubhamdatarkar.com/s/{code} -> 307 to the original URL.
 * 307 (not 301): browsers don't cache it, so click counts keep landing and the
 * target stays repointable. Unknown codes fall back to the home page.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data } = await supabaseAnon().rpc("resolve_short_link", { p_slug: code });
  const target = typeof data === "string" ? data : null;
  return NextResponse.redirect(target ?? new URL("/", req.nextUrl.origin), 307);
}
