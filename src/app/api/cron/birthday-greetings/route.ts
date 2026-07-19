import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendTemplate } from "@/lib/email/send-template";
import { birthday } from "@/lib/email/templates/engagement";

type BirthdayRow = { id: string; email: string; full_name: string | null };

/**
 * Daily birthday greeting. Vercel Cron hits this (see vercel.json) with
 * `Authorization: Bearer ${CRON_SECRET}`. Service-role RPC `birthdays_today`
 * returns whoever has a birthday today (IST) and hasn't been greeted this year;
 * we mark each only after a successful send, so a re-run is idempotent.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron] CRON_SECRET not set; birthday greetings disabled");
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.rpc("birthdays_today");
  if (error) {
    console.error("[cron] birthdays_today failed:", error.message);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  const rows = (data ?? []) as BirthdayRow[];
  if (rows.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // One birthday email, from the shared catalog template. `mark_birthday_greeted`
  // keeps it to once per person per year (re-runs are idempotent).
  let sent = 0;
  for (const r of rows) {
    const res = await sendTemplate(r.email, birthday({ name: r.full_name }));
    if (res.ok) {
      await db.rpc("mark_birthday_greeted", { p_id: r.id });
      sent++;
    } else {
      console.error(`[cron] birthday email to ${r.id} failed: ${res.error}`);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
