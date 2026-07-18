import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Daily: ban accounts that never verified their email within 48h. Vercel Cron
 * hits this (see vercel.json) with `Authorization: Bearer ${CRON_SECRET}`.
 * Idempotent — the RPC skips already-banned rows.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron] CRON_SECRET not set; block-unverified disabled");
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin().rpc("block_unverified_accounts");
  if (error) {
    console.error("[cron] block_unverified_accounts failed:", error.message);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, banned: data ?? 0 });
}
