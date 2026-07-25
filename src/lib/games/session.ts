import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

/** Memoized per render: the current games user, or null. Any authed user passes. */
export const getGameUser = cache(async (): Promise<User | null> => {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/** Route guard: redirect to the games login (preserving return path) when not signed in. */
export async function requireGameUser(next?: string): Promise<User> {
  const user = await getGameUser();
  if (!user) {
    redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return user;
}
