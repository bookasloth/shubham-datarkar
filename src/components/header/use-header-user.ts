"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side identity for the header CTA. `name` is the display label
 * (username first, per the "Welcome, @you" ask), null when signed out.
 * `ready` gates the first paint so the CTA doesn't flash-swap. profiles is
 * publicly readable (read policy USING(true)), so the anon client can select it.
 */
export function useHeaderUser(): { name: string | null; ready: boolean } {
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function resolve(userId: string, email?: string) {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      setName(
        data?.username?.trim() ||
          data?.display_name?.trim() ||
          email?.split("@")[0] ||
          "Account",
      );
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) resolve(data.user.id, data.user.email ?? undefined);
      else setName(null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) resolve(session.user.id, session.user.email ?? undefined);
      else setName(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { name, ready };
}
