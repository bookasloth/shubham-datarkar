"use server";

import { getMemberContext } from "@/lib/members/session";
import { subscribe, unsubscribe } from "@/lib/subscribers/actions";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Toggle the CURRENT user's own newsletter subscription. Email is taken from
 *  the session, never the client — the account toggle can't touch other emails. */
export async function setMyNewsletter(on: boolean): Promise<{ ok: boolean }> {
  const { user } = await getMemberContext();
  if (!user?.email) return { ok: false };
  if (on) {
    const r = await subscribe(user.email, "members-account"); // Kit push + first-time insert (23505 = already exists)
    // subscribe() is anon insert-only and can't flip status — reactivate a
    // previously-unsubscribed row via service-role. Idempotent for active/new rows.
    await supabaseAdmin()
      .from("subscribers")
      .update({ status: "active" })
      .eq("email", user.email.trim().toLowerCase());
    return { ok: r.ok };
  }
  return unsubscribe(user.email);
}
