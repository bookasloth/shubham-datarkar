"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GameUser = { id: string; email?: string } | null;

/** Client-side games session. null while logged out; updates on auth changes. */
export function useGameAuth(): { user: GameUser; loading: boolean } {
  const [user, setUser] = useState<GameUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
