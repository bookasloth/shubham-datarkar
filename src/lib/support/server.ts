import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Server-only writes to the `supports` table (service-role, RLS bypass).
 * A support is created `pending` by the session route and flipped to
 * `paid`/`failed` by the Zoho webhook.
 */

export type PendingInput = {
  name: string | null;
  email: string;
  message: string | null;
  coffeeUnits: number;
  toffeeUnits: number;
  currency: string;
  baseAmount: number;
  feeAmount: number;
  totalAmount: number;
  coversFee: boolean;
  anonymous: boolean;
};

export async function insertPendingSupport(
  input: PendingInput,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabaseAdmin()
    .from("supports")
    .insert({
      name: input.name,
      email: input.email,
      message: input.message,
      coffee_units: input.coffeeUnits,
      toffee_units: input.toffeeUnits,
      currency: input.currency,
      base_amount: input.baseAmount,
      fee_amount: input.feeAmount,
      total_amount: input.totalAmount,
      covers_fee: input.coversFee,
      anonymous: input.anonymous,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: String(data.id) };
}

export async function attachSession(id: string, sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("supports")
    .update({ zoho_session_id: sessionId })
    .eq("id", id);
  if (error) console.warn("[support] attachSession failed:", error.message);
}

export type SupportRow = { id: string; name: string | null; anonymous: boolean };

/**
 * Flip a support row to paid/failed, matched by session id (preferred) or row id.
 * Only matches rows NOT already at the target status, so repeated webhook
 * deliveries are idempotent — `updated` is true exactly once per real transition,
 * which is what gates the one-time auto thank-you post. Returns the row's public
 * fields so the caller can build that post without a second query.
 */
export async function markSupportStatus(opts: {
  sessionId?: string | null;
  supportId?: string | null;
  status: "paid" | "failed";
  paymentId?: string | null;
}): Promise<{ updated: boolean; support?: SupportRow }> {
  const patch: Record<string, unknown> = { status: opts.status };
  if (opts.paymentId) patch.zoho_payment_id = opts.paymentId;

  let q = supabaseAdmin().from("supports").update(patch);
  if (opts.sessionId) q = q.eq("zoho_session_id", opts.sessionId);
  else if (opts.supportId) q = q.eq("id", opts.supportId);
  else return { updated: false };

  // Idempotency guard: skip rows already at the target status (webhook re-delivery).
  q = q.neq("status", opts.status);

  const { data, error } = await q.select("id, name, anonymous");
  if (error) {
    console.warn("[support] markSupportStatus failed:", error.message);
    return { updated: false };
  }
  const row = data?.[0] as { id: string; name: string | null; anonymous: boolean } | undefined;
  if (!row) return { updated: false };
  return {
    updated: true,
    support: { id: String(row.id), name: row.name, anonymous: !!row.anonymous },
  };
}
