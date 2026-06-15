import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type Subscriber = {
  id: string;
  email: string;
  source: string | null;
  status: string;
  createdAt: string;
};

/** Admin: all subscribers, newest first. */
export async function getSubscribers(): Promise<Subscriber[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("subscribers")
      .select("id,email,source,status,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (
      (data as { id: string; email: string; source: string | null; status: string; created_at: string }[]) ??
      []
    ).map((r) => ({
      id: r.id,
      email: r.email,
      source: r.source,
      status: r.status,
      createdAt: r.created_at,
    }));
  } catch (e) {
    console.warn("[subscribers] getSubscribers failed; returning empty:", (e as Error)?.message ?? e);
    return [];
  }
}
