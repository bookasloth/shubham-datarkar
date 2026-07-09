"use server";

import { getMemberContext } from "@/lib/members/session";
import { subscribe, unsubscribe } from "@/lib/subscribers/actions";

/** Toggle the CURRENT user's own newsletter subscription. Email is taken from
 *  the session, never the client — the account toggle can't touch other emails. */
export async function setMyNewsletter(on: boolean): Promise<{ ok: boolean }> {
  const { user } = await getMemberContext();
  if (!user?.email) return { ok: false };
  if (on) {
    const r = await subscribe(user.email, "members-account");
    return { ok: r.ok };
  }
  return unsubscribe(user.email);
}
