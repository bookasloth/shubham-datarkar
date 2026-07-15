import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Auth email for a user id, or null (deleted user / lookup error). */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(userId);
  if (error) {
    console.warn("[email] getUserEmail failed:", error.message);
    return null;
  }
  return data.user?.email ?? null;
}
