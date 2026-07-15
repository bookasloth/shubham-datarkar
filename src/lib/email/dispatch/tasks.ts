import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { claim } from "./dedupe";
import { introduction, weMissYou, inactiveAccount, festival } from "@/lib/email/templates/engagement";
import { renewalReminder } from "@/lib/email/templates/membership";
import { newBlogs, monthlyRoundup } from "@/lib/email/templates/newsletter";

const SITE = "https://shubhamdatarkar.com";

/** Introduction — users created 24-48h ago, once ever. */
export async function runIntroductions(): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const now = Date.now();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (!u.email || !u.created_at) continue;
      const age = now - new Date(u.created_at).getTime();
      if (age < 24 * 3600e3 || age > 48 * 3600e3) continue;
      if (!(await claim(u.email, "introduction", "once"))) continue;
      const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || null;
      if ((await sendTemplate(u.email, introduction({ name }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] introductions:", (e as Error).message); }
  return sent;
}

/** Diwali — only on the fixed IST date, to active subscribers. */
export async function runDiwali(t: { date: string }): Promise<number> {
  if (t.date !== "2026-11-08") return 0;
  let sent = 0;
  try {
    const { data } = await supabaseAdmin().from("subscribers").select("email").eq("status", "active");
    for (const s of data ?? []) {
      if (!s.email) continue;
      if (!(await claim(s.email, "festival", "2026-11-08"))) continue;
      if ((await sendTemplate(s.email, festival({ festival: "Diwali" }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] diwali:", (e as Error).message); }
  return sent;
}

/** Renewal reminders — active paid memberships with current_period_end within 3 days. */
export async function runRenewalReminders(): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const now = Date.now();
    const { data } = await admin.from("memberships")
      .select("user_id, plan_key, current_period_end, status, source")
      .eq("status", "active").neq("source", "gift");
    for (const m of data ?? []) {
      if (!m.current_period_end) continue;
      const end = new Date(m.current_period_end).getTime();
      const days = (end - now) / 86400e3;
      if (days < 0 || days > 3) continue;
      const email = await getUserEmail(m.user_id);
      if (!email) continue;
      const renewsOn = m.current_period_end.slice(0, 10);
      if (!(await claim(email, "renewalReminder", renewsOn))) continue;
      const { data: plan } = await admin.from("membership_plans").select("name, amount, interval").eq("key", m.plan_key).maybeSingle();
      const amount = plan?.amount ? `₹${Math.round(plan.amount / 100)}` : undefined;
      if ((await sendTemplate(email, renewalReminder({ planName: plan?.name ?? "your plan", renewsOn, amount }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] renewals:", (e as Error).message); }
  return sent;
}

/** We-miss-you — last sign-in > 30 days, deduped monthly. */
export async function runWeMissYou(t: { ym: string }): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const cutoff = Date.now() - 30 * 86400e3;
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (!u.email || !u.last_sign_in_at) continue;
      if (new Date(u.last_sign_in_at).getTime() > cutoff) continue;
      if (!(await claim(u.email, "weMissYou", t.ym))) continue;
      const name = (u.user_metadata?.full_name as string) || null;
      if ((await sendTemplate(u.email, weMissYou({ name }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] we-miss-you:", (e as Error).message); }
  return sent;
}

/** Inactive — created > 7 days ago, never signed in OR email unconfirmed, once. */
export async function runInactive(): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const cutoff = Date.now() - 7 * 86400e3;
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (!u.email || !u.created_at) continue;
      if (new Date(u.created_at).getTime() > cutoff) continue;
      const inactive = !u.last_sign_in_at || !u.email_confirmed_at;
      if (!inactive) continue;
      if (!(await claim(u.email, "inactiveAccount", "once"))) continue;
      const name = (u.user_metadata?.full_name as string) || null;
      if ((await sendTemplate(u.email, inactiveAccount({ name }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] inactive:", (e as Error).message); }
  return sent;
}

async function activeSubscribers(): Promise<string[]> {
  const { data } = await supabaseAdmin().from("subscribers").select("email").eq("status", "active");
  return (data ?? []).map((s) => s.email).filter(Boolean);
}

async function publishedPostsSince(sinceIso: string): Promise<{ title: string; href: string; meta?: string }[]> {
  const nowIso = new Date().toISOString();
  const { data } = await supabaseAdmin().from("posts")
    .select("title, slug, published_at")
    .eq("status", "published")
    .gte("published_at", sinceIso).lte("published_at", nowIso)
    .order("published_at", { ascending: false });
  return (data ?? []).map((p) => ({ title: p.title, href: `${SITE}/blog/${p.slug}` }));
}

/** Mondays: everything published in the last 7 days → active subscribers. */
export async function runNewBlogs(t: { dow: number; iso: string }): Promise<number> {
  if (t.dow !== 1) return 0; // 1 = Monday
  let sent = 0;
  try {
    const since = new Date(Date.now() - 7 * 86400e3).toISOString();
    const posts = await publishedPostsSince(since);
    if (!posts.length) return 0;
    const email = newBlogs({ posts });
    for (const to of await activeSubscribers()) {
      if (!(await claim(to, "newBlogs", t.iso))) continue;
      if ((await sendTemplate(to, email)).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] new-blogs:", (e as Error).message); }
  return sent;
}

/** 1st of month: previous calendar month's posts → active subscribers. */
export async function runMonthlyRoundup(t: { dom: number; ym: string }): Promise<number> {
  if (t.dom !== 1) return 0;
  let sent = 0;
  try {
    const since = new Date(Date.now() - 31 * 86400e3).toISOString();
    const posts = await publishedPostsSince(since);
    if (!posts.length) return 0;
    // Label = previous month name.
    const prev = new Date(); prev.setUTCDate(1); prev.setUTCMonth(prev.getUTCMonth() - 1);
    const monthLabel = ["January","February","March","April","May","June","July","August","September","October","November","December"][prev.getUTCMonth()];
    const email = monthlyRoundup({ monthLabel, posts });
    for (const to of await activeSubscribers()) {
      if (!(await claim(to, "monthlyRoundup", t.ym))) continue;
      if ((await sendTemplate(to, email)).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] monthly-roundup:", (e as Error).message); }
  return sent;
}
