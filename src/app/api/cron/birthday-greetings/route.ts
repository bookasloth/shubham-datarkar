import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";
import { birthdayEmail } from "@/lib/members/birthday-email";

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

  const creds = await getEmailCredentials();
  if (!creds) {
    console.warn("[cron] no email credentials; skipping birthday greetings");
    return NextResponse.json({ error: "Email not configured." }, { status: 503 });
  }

  let sent = 0;
  for (const r of rows) {
    const { subject, html, text } = birthdayEmail(r.full_name);
    const res = await sendEmail(creds, { to: r.email, subject, html, text });
    if (res.ok) {
      await db.rpc("mark_birthday_greeted", { p_id: r.id });
      sent++;
    } else {
      console.error(`[cron] birthday email to ${r.id} failed: ${res.error}`);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
