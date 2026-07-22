import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type AdminMember = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  plan: string | null;
  status: string | null;
  source: string | null;
  periodEnd: string | null;
  avatarUrl: string | null;
};

/**
 * The account record behind one email — auth user + profile + membership —
 * or null if that email has no account. Powers the actions panel on the
 * People profile page (gift, reset password, remove avatar, revoke gift).
 *
 * ponytail: listUsers is capped at 500 and scanned client-side; the admin has
 * far fewer accounts than that. If the account count ever approaches the cap,
 * swap to a direct auth.users lookup by email.
 */
export async function getMemberByEmail(email: string): Promise<AdminMember | null> {
  const target = email.trim().toLowerCase();
  const db = supabaseAdmin();

  const { data: userList } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
  const user = (userList?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === target);
  if (!user) return null;

  const [{ data: profile }, { data: membership }] = await Promise.all([
    db.from("profiles").select("username,avatar_url").eq("id", user.id).maybeSingle(),
    db.from("memberships").select("plan_key,status,source,current_period_end").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    username: profile?.username ?? "",
    createdAt: user.created_at,
    plan: membership?.plan_key ?? null,
    status: membership?.status ?? null,
    source: membership?.source ?? null,
    periodEnd: membership?.current_period_end ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}
