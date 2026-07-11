import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

/** The single admin identity. Required — the gate fails CLOSED when it is unset. */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/** Memoized per render: the validated current user, or null. */
export const getAdminUser = cache(async (): Promise<User | null> => {
  // Fail closed: with no ADMIN_EMAIL configured, nobody is admin. (Signup is
  // open, so treating an unset var as "allow any authed user" would hand /admin
  // to anyone who registers.)
  if (!ADMIN_EMAIL) return null;

  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (user.email !== ADMIN_EMAIL) return null;
  return user;
});

/** Route guard: redirects to /login when not an authenticated admin. */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  return user;
}
