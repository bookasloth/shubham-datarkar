import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { claim } from "./dedupe";
import { introduction, weMissYou, inactiveAccount, festival } from "@/lib/email/templates/engagement";
import { renewalReminder, memberDigest } from "@/lib/email/templates/membership";
import { newBlogs, monthlyRoundup } from "@/lib/email/templates/newsletter";
import { communityDigest, firstPostNudge } from "@/lib/email/templates/community";
import { weeklyLeaderboard, streakReminder } from "@/lib/email/templates/games";
import { getPeriodBoard, type GameKey } from "@/lib/games/leaderboard-queries";

const SITE = "https://shubhamdatarkar.com";

const GAMES: { key: GameKey; label: string; slug: string }[] = [
  { key: "alfazy", label: "Alfazy", slug: "alfazy" },
  { key: "hit_and_blow", label: "Hit & Blow", slug: "hit-and-blow" },
  { key: "integra", label: "Integra", slug: "integra" },
];

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
      // 48–72h after signup: spaced out from the account-welcome so onboarding
      // doesn't bunch up in the first day.
      if (age < 48 * 3600e3 || age > 72 * 3600e3) continue;
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

/** Wednesdays: top 5 root community posts (by upvotes) from the last 7 days → active subscribers.
 *  Moved off Monday so blogs/community/leaderboard don't all land the same day. */
export async function runCommunityDigest(t: { dow: number; iso: string }): Promise<number> {
  if (t.dow !== 3) return 0; // 3 = Wednesday
  let sent = 0;
  try {
    const since = new Date(Date.now() - 7 * 86400e3).toISOString();
    const { data } = await supabaseAdmin()
      .from("community_posts")
      .select("body, public_id, up_count, created_at")
      .eq("hidden", false)
      .is("parent_id", null)
      .is("reblog_of", null)
      .gte("created_at", since)
      .order("up_count", { ascending: false })
      .limit(5);
    const items = (data ?? [])
      .filter((p) => p.public_id != null)
      .map((p) => ({ title: (p.body || "A post").slice(0, 80), href: `${SITE}/community/p/${p.public_id}` }));
    if (!items.length) return 0;
    const email = communityDigest({ items });
    for (const to of await activeSubscribers()) {
      if (!(await claim(to, "communityDigest", t.iso))) continue;
      if ((await sendTemplate(to, email)).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] community-digest:", (e as Error).message); }
  return sent;
}

/** Nudge: joined 7-14 days ago, confirmed email, zero root posts, once ever. */
export async function runFirstPostNudge(): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const now = Date.now();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (!u.email || !u.email_confirmed_at || !u.created_at) continue;
      const age = now - new Date(u.created_at).getTime();
      // 7–14 days: give the account-welcome / introduction room before nudging.
      if (age < 7 * 86400e3 || age > 14 * 86400e3) continue;
      const { count } = await admin
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", u.id)
        .is("parent_id", null)
        .is("reblog_of", null);
      if ((count ?? 0) > 0) continue;
      if (!(await claim(u.email, "firstPostNudge", "once"))) continue;
      const name = (u.user_metadata?.full_name as string) || null;
      if ((await sendTemplate(u.email, firstPostNudge({ name }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] first-post-nudge:", (e as Error).message); }
  return sent;
}

/** 1st of month: resources published in the last 31 days → active members. */
export async function runMemberDigest(t: { dom: number; ym: string }): Promise<number> {
  if (t.dom !== 1) return 0;
  let sent = 0;
  try {
    const since = new Date(Date.now() - 31 * 86400e3).toISOString();
    const { data } = await supabaseAdmin()
      .from("resources")
      .select("title, published_at")
      .eq("status", "published")
      .gte("published_at", since)
      .order("published_at", { ascending: false });
    const items = (data ?? []).map((r) => ({ title: r.title, href: `${SITE}/members` }));
    if (!items.length) return 0;
    const prev = new Date(); prev.setUTCDate(1); prev.setUTCMonth(prev.getUTCMonth() - 1);
    const monthLabel = ["January","February","March","April","May","June","July","August","September","October","November","December"][prev.getUTCMonth()];
    const email = memberDigest({ monthLabel, items });

    const admin = supabaseAdmin();
    const { data: memberships } = await admin.from("memberships").select("user_id").eq("status", "active");
    const emails = new Set<string>();
    for (const m of memberships ?? []) {
      const addr = await getUserEmail(m.user_id);
      if (addr) emails.add(addr);
    }
    for (const to of emails) {
      if (!(await claim(to, "memberDigest", t.ym))) continue;
      if ((await sendTemplate(to, email)).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] member-digest:", (e as Error).message); }
  return sent;
}

/** Fridays: per-game top-5 weekly leaderboard → everyone who played that game in the last 7 days.
 *  Moved off Monday so blogs/community/leaderboard don't all land the same day. */
export async function runWeeklyLeaderboard(t: { dow: number; date: string; iso: string }): Promise<number> {
  if (t.dow !== 5) return 0; // 5 = Friday
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const start = new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10);
    const end = t.date;
    for (const { key, label, slug } of GAMES) {
      try {
        const board = await getPeriodBoard(key, start, end);
        if (!board.length) continue;
        const rows = board.slice(0, 5).map((r, i) => ({ rank: i + 1, name: r.display_name || r.username, score: `${r.solved} solved` }));
        const email = weeklyLeaderboard({ gameName: label, rows, href: `${SITE}/games/${slug}/leaderboard` });
        const { data: results } = await admin
          .from("game_results")
          .select("user_id")
          .eq("game", key)
          .gte("puzzle_date", start)
          .lte("puzzle_date", end);
        const userIds = new Set((results ?? []).map((r) => r.user_id));
        for (const userId of userIds) {
          const to = await getUserEmail(userId);
          if (!to) continue;
          if (!(await claim(to, "weeklyLeaderboard", `${key}-${t.iso}`))) continue;
          if ((await sendTemplate(to, email)).ok) sent++;
        }
      } catch (e) { console.warn(`[dispatch] weekly-leaderboard (${key}):`, (e as Error).message); }
    }
  } catch (e) { console.warn("[dispatch] weekly-leaderboard:", (e as Error).message); }
  return sent;
}

/** Daily: streak >= 2 who haven't played today yet, per game. */
export async function runStreakReminders(t: { date: string }): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    for (const { key, label, slug } of GAMES) {
      try {
        const { data: streakRows } = await admin
          .from("streaks")
          .select("user_id, current_streak")
          .eq("game", key)
          .gte("current_streak", 2);
        for (const s of streakRows ?? []) {
          try {
            const { count } = await admin
              .from("game_results")
              .select("id", { count: "exact", head: true })
              .eq("user_id", s.user_id)
              .eq("game", key)
              .eq("puzzle_date", t.date);
            if ((count ?? 0) > 0) continue;
            const to = await getUserEmail(s.user_id);
            if (!to) continue;
            if (!(await claim(to, "streakReminder", `${key}-${t.date}`))) continue;
            if ((await sendTemplate(to, streakReminder({ streak: s.current_streak, gameName: label, href: `${SITE}/games/${slug}` }))).ok) sent++;
          } catch (e) { console.warn(`[dispatch] streak-reminder (${key}, ${s.user_id}):`, (e as Error).message); }
        }
      } catch (e) { console.warn(`[dispatch] streak-reminder (${key}):`, (e as Error).message); }
    }
  } catch (e) { console.warn("[dispatch] streak-reminders:", (e as Error).message); }
  return sent;
}
