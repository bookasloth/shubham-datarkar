import { NextResponse } from "next/server";
import { istParts } from "@/lib/email/dispatch/dedupe";
import { runIntroductions, runDiwali, runRenewalReminders, runWeMissYou, runInactive, runNewBlogs, runMonthlyRoundup } from "@/lib/email/dispatch/tasks";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const now = new Date();
  const t = istParts(now);
  const ran: Record<string, unknown> = {};
  // Sub-tasks (Tasks 2–3) are invoked here, each wrapped so one failure can't abort the run.
  ran.introductions = await runIntroductions();
  ran.diwali = await runDiwali(t);
  ran.renewals = await runRenewalReminders();
  ran.weMissYou = await runWeMissYou(t);
  ran.inactive = await runInactive();
  ran.newBlogs = await runNewBlogs(t);
  ran.monthlyRoundup = await runMonthlyRoundup(t);
  return NextResponse.json({ ok: true, ist: t.date, ran });
}
