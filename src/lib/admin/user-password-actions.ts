"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/admin/temp-password";

export type ResetPasswordState =
  | { ok: true; message: string; password?: string }
  | { ok: false; message: string }
  | undefined;

/**
 * Admin: set a user's password directly. No email round-trip — works even when
 * auth email is rate-limited or undelivered (the failure mode that blocks fresh
 * signups). `email_confirm: true` also confirms an unconfirmed account in the
 * same call, so a user stuck before first login can sign in immediately.
 *
 * Blank password field → a strong temp password, returned once for the admin to
 * copy and relay; a typed value is used verbatim.
 */
export async function setUserPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) return { ok: false, message: "Missing user." };

  const typed = String(formData.get("password") ?? "").trim();
  if (typed && typed.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const generated = typed === "";
  const password = typed || generateTempPassword();

  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/members");
  return generated
    ? { ok: true, message: "Password set — copy it now, it won't be shown again.", password }
    : { ok: true, message: "Password updated." };
}
