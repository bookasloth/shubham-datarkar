import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type PaymentStats = {
  raised: number; // sum total_amount of paid
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  supporters: number; // distinct emails among paid
  thisMonth: number; // sum total_amount of paid this calendar month
};

export type SupportTxn = {
  id: string;
  createdAt: string;
  name: string | null;
  email: string;
  coffees: number;
  toffees: number;
  total: number;
  currency: string;
  status: "pending" | "paid" | "failed";
};

const EMPTY_STATS: PaymentStats = {
  raised: 0,
  paidCount: 0,
  pendingCount: 0,
  failedCount: 0,
  supporters: 0,
  thisMonth: 0,
};

function warn(where: string, e: unknown) {
  console.warn(`[payments] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

type Row = {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  coffee_units: number;
  toffee_units: number;
  total_amount: number;
  currency: string;
  status: SupportTxn["status"];
};

/** Headline payment metrics, computed from the full supports table (admin only). */
export async function getPaymentStats(): Promise<PaymentStats> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("supports")
      .select("email,total_amount,status,created_at");
    if (error) throw error;

    const rows = (data as Pick<Row, "email" | "total_amount" | "status" | "created_at">[]) ?? [];
    const now = new Date();
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const paidEmails = new Set<string>();
    const stats = { ...EMPTY_STATS };

    for (const r of rows) {
      if (r.status === "paid") {
        stats.paidCount += 1;
        stats.raised += Number(r.total_amount ?? 0);
        paidEmails.add(r.email.toLowerCase());
        if (new Date(r.created_at).getTime() >= monthStart) {
          stats.thisMonth += Number(r.total_amount ?? 0);
        }
      } else if (r.status === "pending") {
        stats.pendingCount += 1;
      } else if (r.status === "failed") {
        stats.failedCount += 1;
      }
    }
    stats.supporters = paidEmails.size;
    return stats;
  } catch (e) {
    warn("getPaymentStats", e);
    return EMPTY_STATS;
  }
}

/** Most recent support attempts (all statuses), newest first. */
export async function getRecentSupports(limit = 50): Promise<SupportTxn[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("supports")
      .select("id,created_at,name,email,coffee_units,toffee_units,total_amount,currency,status")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data as Row[]) ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      email: r.email,
      coffees: r.coffee_units,
      toffees: r.toffee_units,
      total: Number(r.total_amount ?? 0),
      currency: r.currency,
      status: r.status,
    }));
  } catch (e) {
    warn("getRecentSupports", e);
    return [];
  }
}
