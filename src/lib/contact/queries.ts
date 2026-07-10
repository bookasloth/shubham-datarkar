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
  firstLandingPage: string | null;
  aiSource: string | null;
  utmSource: string | null;
  pagesSeen: number | null;
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
  first_landing_page: string | null;
  ai_source: string | null;
  utm_source: string | null;
  pages_seen: number | null;
};

/** All contact submissions, newest first (admin only — RLS authenticated read). */
export async function getContacts(limit = 100): Promise<Contact[]> {
  try {
    const sb = await supabaseAuthServer();
    const { data, error } = await sb
      .from("contacts")
      .select("id,created_at,name,email,project_type,budget,message,status,notified,first_landing_page,ai_source,utm_source,pages_seen")
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
      firstLandingPage: r.first_landing_page,
      aiSource: r.ai_source,
      utmSource: r.utm_source,
      pagesSeen: r.pages_seen,
    }));
  } catch (e) {
    console.warn("[contact] getContacts failed; returning empty:", (e as Error)?.message ?? e);
    return [];
  }
}
