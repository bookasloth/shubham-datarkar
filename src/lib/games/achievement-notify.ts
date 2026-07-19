import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendTemplate } from "@/lib/email/send-template";
import { achievementUnlocked } from "@/lib/email/templates/games";
import { claim } from "@/lib/email/dispatch/dedupe";
import type { SubmitInput } from "@/lib/games/validate-result";

const SITE = "https://shubhamdatarkar.com";

const LABEL: Record<SubmitInput["game"], string> = {
  alfazy: "Alfazy",
  hit_and_blow: "Hit & Blow",
  integra: "Integra",
};
const SLUG: Record<SubmitInput["game"], string> = {
  alfazy: "alfazy",
  hit_and_blow: "hit-and-blow",
  integra: "integra",
};
const STREAK_MILESTONES = new Set([3, 7, 14, 30, 50, 100]);

/**
 * Fire achievement emails after a daily WIN. Reads the denormalized `streaks`
 * row (updated by the submit RPC just before this): `total_won === 1` is the
 * first-ever win; `current_streak` hitting a milestone is a streak achievement.
 * Best-effort + deduped, so a re-submit or a re-hit milestone can't re-email.
 * (#1-rank is intentionally skipped — it churns daily and would be noisy.)
 */
export async function notifyAchievements(
  userId: string,
  email: string,
  name: string | null,
  game: SubmitInput["game"],
): Promise<void> {
  try {
    const admin = supabaseAdmin();
    const label = LABEL[game];
    const href = `${SITE}/games/${SLUG[game]}`;
    const { data: s } = await admin
      .from("streaks")
      .select("total_won, current_streak")
      .eq("user_id", userId)
      .eq("game", game)
      .maybeSingle();
    if (!s) return;

    if (s.total_won === 1 && (await claim(email, "achievement", `${game}-firstwin`))) {
      await sendTemplate(email, achievementUnlocked({
        name,
        achievement: `First ${label} win`,
        detail: `Your first solved ${label} puzzle. The productivity ruination starts here.`,
        href,
      }));
    }

    const n = s.current_streak ?? 0;
    if (STREAK_MILESTONES.has(n) && (await claim(email, "achievement", `${game}-streak-${n}`))) {
      await sendTemplate(email, achievementUnlocked({
        name,
        achievement: `${n}-day ${label} streak`,
        detail: `${n} days of ${label} without missing one. Rare air.`,
        href,
      }));
    }
  } catch (e) {
    console.warn("[games] notifyAchievements failed:", (e as Error).message);
  }
}
