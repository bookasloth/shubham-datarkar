"use server";

import { getMemberContext } from "@/lib/members/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

/** Editable, optional personal fields on the member's own profile. */
export type AccountFields = {
  fullName: string;
  dob: string; // "YYYY-MM-DD" or "" — <input type="date"> guarantees the shape
  location: string;
  whatsapp: string;
};

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;
const WHATSAPP_RE = /^[0-9+\-() ]{6,20}$/;

/**
 * Save the current user's optional profile fields. Writes go through the
 * security-definer RPC `update_my_account`, which scopes to auth.uid() — the
 * session client can't touch anyone else's row. Empty strings become NULL.
 */
export async function updateMyAccount(
  input: AccountFields,
): Promise<{ ok: boolean; error?: string }> {
  const { user } = await getMemberContext();
  if (!user) return { ok: false, error: "Not signed in." };

  const fullName = input.fullName.trim().slice(0, 80);
  const location = input.location.trim().slice(0, 80);
  const whatsapp = input.whatsapp.trim();
  const dobRaw = input.dob.trim();

  let dob: string | null = null;
  if (dobRaw) {
    if (!DOB_RE.test(dobRaw)) return { ok: false, error: "Date of birth must be a real date." };
    const d = new Date(`${dobRaw}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Date of birth is not valid." };
    if (d.getTime() > Date.now()) return { ok: false, error: "Date of birth can't be in the future." };
    if (d.getUTCFullYear() < 1900) return { ok: false, error: "Date of birth looks wrong." };
    dob = dobRaw;
  }

  if (whatsapp && !WHATSAPP_RE.test(whatsapp)) {
    return { ok: false, error: "WhatsApp number looks invalid." };
  }

  const sb = await supabaseAuthServer();
  const { error } = await sb.rpc("update_my_account", {
    p_full_name: fullName,
    p_dob: dob,
    p_location: location,
    p_whatsapp: whatsapp,
  });
  if (error) return { ok: false, error: "Could not save. Try again." };
  return { ok: true };
}
