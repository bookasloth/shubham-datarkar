import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type Contact = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  projectType: string | null;
  budget: string | null;
  message: string;
  status: "new" | "read" | "archived";
  notified: boolean;
};

type Row = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  project_type: string | null;
  budget: string | null;
  message: string;
  status: Contact["status"];
  notified: boolean;
};

/** All contact submissions, newest first (admin only — RLS authenticated read). */
export async function getContacts(limit = 100): Promise<Contact[]> {
  try {
    const sb = await supabaseAuthServer();
    const { data, error } = await sb
      .from("contacts")
      .select("id,created_at,name,email,project_type,budget,message,status,notified")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data as Row[]) ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      email: r.email,
      projectType: r.project_type,
      budget: r.budget,
      message: r.message,
      status: r.status,
      notified: r.notified,
    }));
  } catch (e) {
    console.warn("[contact] getContacts failed; returning empty:", (e as Error)?.message ?? e);
    return [];
  }
}
