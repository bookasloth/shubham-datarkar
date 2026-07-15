import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** IST civil-date pieces from a UTC instant (IST = UTC+5:30, no DST). */
export function istParts(now: Date): { date: string; dow: number; dom: number; monthLabel: string; ym: string; iso: string } {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();       // 0-11
  const d = ist.getUTCDate();
  const dow = ist.getUTCDay();       // 0=Sun
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${y}-${pad(m + 1)}-${pad(d)}`;
  // ISO week key (approx, good enough for a dedupe period).
  const jan1 = Date.UTC(y, 0, 1);
  const week = Math.ceil(((ist.getTime() - jan1) / 86400000 + 1) / 7);
  return { date, dow, dom: d, monthLabel: MONTHS[m], ym: `${y}-${pad(m + 1)}`, iso: `${y}-W${pad(week)}` };
}

/** Claim a send. Inserts (recipient, templateKey, period); true if newly claimed. */
export async function claim(recipient: string, templateKey: string, period: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("email_log")
      .insert({ recipient: recipient.toLowerCase(), template_key: templateKey, period })
      .select("period");
    if (error) {
      // 23505 = already sent (unique conflict) → not claimed, no log noise.
      if (error.code !== "23505") console.warn("[dispatch] claim failed:", error.message);
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.warn("[dispatch] claim threw:", (e as Error).message);
    return false;
  }
}
